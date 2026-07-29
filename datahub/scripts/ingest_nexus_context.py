#!/usr/bin/env python3
"""Ingest Nexus Context Graph sample metadata into DataHub.

Default mode is dry-run. Metadata writes require an explicit --apply flag.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Sequence, Tuple

DEFAULT_INPUT = Path(__file__).resolve().parents[1] / "sample" / "nexus-project-context.json"
DEFAULT_SERVER = "http://localhost:8080"
DEFAULT_PLATFORM = "nexus"
DEFAULT_ENV = "DEV"
SCHEMA_VERSION = "1"
URN_NAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]*[a-z0-9]$")
REQUIRED_NODE_FIELDS = ("id", "type", "name", "status", "context", "source")
REQUIRED_RELATIONSHIP_FIELDS = ("source", "target", "type")
SUPPORTED_NODE_TYPES = {"project", "problem", "decision", "milestone", "task", "progress"}


class ContextGraphError(ValueError):
    """Raised when a Nexus Context Graph is not valid."""


def load_context_graph(input_path: str | Path = DEFAULT_INPUT) -> Dict[str, Any]:
    path = Path(input_path)
    with path.open("r", encoding="utf-8-sig") as handle:
        graph = json.load(handle)
    validate_context_graph(graph)
    return graph


def validate_context_graph(graph: Mapping[str, Any]) -> None:
    if not isinstance(graph, Mapping):
        raise ContextGraphError("Context graph must be a JSON object.")

    for field in ("projectId", "projectName", "nodes", "relationships"):
        if field not in graph:
            raise ContextGraphError(f"Missing required graph field: {field}")

    nodes = graph.get("nodes")
    relationships = graph.get("relationships")
    if not isinstance(nodes, list) or not nodes:
        raise ContextGraphError("Graph must contain at least one node.")
    if not isinstance(relationships, list):
        raise ContextGraphError("Graph relationships must be a list.")

    seen_ids: set[str] = set()
    for node in nodes:
        if not isinstance(node, Mapping):
            raise ContextGraphError("Every node must be an object.")
        for field in REQUIRED_NODE_FIELDS:
            if not str(node.get(field, "")).strip():
                raise ContextGraphError(f"Node is missing required field: {field}")
        node_type = str(node["type"])
        if node_type not in SUPPORTED_NODE_TYPES:
            raise ContextGraphError(f"Unsupported node type: {node_type}")
        node_id = str(node["id"])
        if node_id in seen_ids:
            raise ContextGraphError(f"Duplicate node id: {node_id}")
        seen_ids.add(node_id)
        urn_name = node.get("urnName") or stable_urn_name(graph["projectId"], node)
        if not is_stable_urn_name(str(urn_name)):
            raise ContextGraphError(f"Unstable DataHub URN name for node {node_id}: {urn_name}")

    relationship_keys: set[Tuple[str, str, str]] = set()
    for relationship in relationships:
        if not isinstance(relationship, Mapping):
            raise ContextGraphError("Every relationship must be an object.")
        for field in REQUIRED_RELATIONSHIP_FIELDS:
            if not str(relationship.get(field, "")).strip():
                raise ContextGraphError(f"Relationship is missing required field: {field}")
        source = str(relationship["source"])
        target = str(relationship["target"])
        relation_type = str(relationship["type"])
        if source not in seen_ids:
            raise ContextGraphError(f"Relationship source does not exist: {source}")
        if target not in seen_ids:
            raise ContextGraphError(f"Relationship target does not exist: {target}")
        if source == target:
            raise ContextGraphError(f"Self lineage is not allowed: {source}")
        relationship_keys.add((source, target, relation_type))


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "context"


def stable_urn_name(project_id: str, node: Mapping[str, Any]) -> str:
    node_id = str(node.get("id", "context:node"))
    _, _, local_id = node_id.partition(":")
    return f"nexus.{slugify(project_id)}.{slugify(str(node.get('type', 'context')))}.{slugify(local_id)}"


def is_stable_urn_name(value: str) -> bool:
    return bool(URN_NAME_PATTERN.fullmatch(value)) and " " not in value


def dataset_urn(node: Mapping[str, Any], project_id: str, platform: str = DEFAULT_PLATFORM, env: str = DEFAULT_ENV) -> str:
    urn_name = str(node.get("urnName") or stable_urn_name(project_id, node))
    if not is_stable_urn_name(urn_name):
        raise ContextGraphError(f"Unstable DataHub URN name: {urn_name}")
    return f"urn:li:dataset:(urn:li:dataPlatform:{platform},{urn_name},{env})"


def platform_urn(platform: str = DEFAULT_PLATFORM) -> str:
    return f"urn:li:dataPlatform:{platform}"


def node_custom_properties(graph: Mapping[str, Any], node: Mapping[str, Any]) -> Dict[str, str]:
    return {
        "nexus_project_id": str(graph["projectId"]),
        "nexus_node_id": str(node["id"]),
        "nexus_node_type": str(node["type"]),
        "nexus_status": str(node["status"]),
        "nexus_context": str(node["context"]),
        "nexus_source": str(node["source"]),
        "nexus_schema_version": str(graph.get("schemaVersion", SCHEMA_VERSION)),
    }


def build_dataset_properties(graph: Mapping[str, Any], node: Mapping[str, Any]) -> Dict[str, Any]:
    return {
        "name": str(node["name"]),
        "description": str(node["context"]),
        "customProperties": node_custom_properties(graph, node),
    }


def node_by_id(graph: Mapping[str, Any]) -> Dict[str, Mapping[str, Any]]:
    return {str(node["id"]): node for node in graph["nodes"]}


def build_lineage_edges(graph: Mapping[str, Any]) -> List[Dict[str, str]]:
    validate_context_graph(graph)
    nodes = node_by_id(graph)
    unique: set[Tuple[str, str, str]] = set()
    edges: List[Dict[str, str]] = []
    for relationship in graph["relationships"]:
        source = str(relationship["source"])
        target = str(relationship["target"])
        relation_type = str(relationship["type"])
        if source == target:
            raise ContextGraphError(f"Self lineage is not allowed: {source}")
        key = (source, target, relation_type)
        if key in unique:
            continue
        unique.add(key)
        edges.append(
            {
                "source": source,
                "target": target,
                "type": relation_type,
                "upstreamUrn": dataset_urn(nodes[source], str(graph["projectId"]), str(graph.get("platform", DEFAULT_PLATFORM)), str(graph.get("environment", DEFAULT_ENV))),
                "downstreamUrn": dataset_urn(nodes[target], str(graph["projectId"]), str(graph.get("platform", DEFAULT_PLATFORM)), str(graph.get("environment", DEFAULT_ENV))),
            }
        )
    return sorted(edges, key=lambda edge: (edge["downstreamUrn"], edge["upstreamUrn"], edge["type"]))


def dry_run_summary(graph: Mapping[str, Any]) -> str:
    edges = build_lineage_edges(graph)
    lines = [
        "Nexus DataHub Context Ingestion",
        "",
        f"Project: {graph['projectId']}",
        f"Nodes: {len(graph['nodes'])}",
        f"Relationships: {len(edges)}",
        "Mode: dry-run",
        "",
        "No metadata was written.",
        "",
        "Lineage edges:",
    ]
    lines.extend(f"- {edge['source']} --{edge['type']}--> {edge['target']}" for edge in edges)
    return "\n".join(lines)


def _load_datahub_sdk():
    try:
        from datahub.emitter.mcp import MetadataChangeProposalWrapper
        from datahub.emitter.rest_emitter import DatahubRestEmitter
        from datahub.metadata.schema_classes import (
            DataPlatformInfoClass,
            DatasetLineageTypeClass,
            DatasetPropertiesClass,
            UpstreamClass,
            UpstreamLineageClass,
        )
    except Exception as exc:  # pragma: no cover - depends on optional SDK
        raise RuntimeError("DataHub Python SDK is not available. Install datahub/requirements.txt first.") from exc

    return {
        "MetadataChangeProposalWrapper": MetadataChangeProposalWrapper,
        "DatahubRestEmitter": DatahubRestEmitter,
        "DataPlatformInfoClass": DataPlatformInfoClass,
        "DatasetLineageTypeClass": DatasetLineageTypeClass,
        "DatasetPropertiesClass": DatasetPropertiesClass,
        "UpstreamClass": UpstreamClass,
        "UpstreamLineageClass": UpstreamLineageClass,
    }


def emit_to_datahub(graph: Mapping[str, Any], server: str, token: str | None = None) -> Dict[str, int]:
    sdk = _load_datahub_sdk()
    emitter_kwargs = {"gms_server": server}
    if token:
        emitter_kwargs["token"] = token
    emitter = sdk["DatahubRestEmitter"](**emitter_kwargs)
    mcp = sdk["MetadataChangeProposalWrapper"]

    platform = str(graph.get("platform", DEFAULT_PLATFORM))
    env = str(graph.get("environment", DEFAULT_ENV))
    project_id = str(graph["projectId"])

    emitter.emit_mcp(
        mcp(
            entityUrn=platform_urn(platform),
            aspect=sdk["DataPlatformInfoClass"](
                name="Nexus Project Context",
                displayName="Nexus Project Context",
                type="OTHERS",
                datasetNameDelimiter=".",
                logoUrl=None,
            ),
        )
    )

    nodes_written = 0
    for node in graph["nodes"]:
        properties = build_dataset_properties(graph, node)
        emitter.emit_mcp(
            mcp(
                entityUrn=dataset_urn(node, project_id, platform, env),
                aspect=sdk["DatasetPropertiesClass"](
                    name=properties["name"],
                    description=properties["description"],
                    customProperties=properties["customProperties"],
                ),
            )
        )
        nodes_written += 1

    by_downstream: Dict[str, List[Any]] = defaultdict(list)
    for edge in build_lineage_edges(graph):
        by_downstream[edge["downstreamUrn"]].append(
            sdk["UpstreamClass"](
                dataset=edge["upstreamUrn"],
                type=sdk["DatasetLineageTypeClass"].TRANSFORMED,
                auditStamp=None,
            )
        )

    relationships_written = 0
    for downstream_urn, upstreams in sorted(by_downstream.items()):
        emitter.emit_mcp(
            mcp(
                entityUrn=downstream_urn,
                aspect=sdk["UpstreamLineageClass"](upstreams=upstreams),
            )
        )
        relationships_written += len(upstreams)

    return {"nodes": nodes_written, "relationships": relationships_written}


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest Nexus Context Graph metadata into DataHub.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Path to Nexus context graph JSON.")
    parser.add_argument("--server", default=os.getenv("DATAHUB_GMS_URL", DEFAULT_SERVER), help="DataHub GMS URL.")
    parser.add_argument("--token", default=os.getenv("DATAHUB_TOKEN"), help="Optional DataHub token. Never printed.")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print what would be written.")
    parser.add_argument("--apply", action="store_true", help="Actually write metadata to DataHub.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        graph = load_context_graph(args.input)
        if not args.apply:
            print(dry_run_summary(graph))
            return 0

        result = emit_to_datahub(graph, args.server, args.token)
        print("Nexus DataHub Context Ingestion")
        print("")
        print(f"Project: {graph['projectId']}")
        print(f"Nodes written: {result['nodes']}")
        print(f"Relationships written: {result['relationships']}")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
