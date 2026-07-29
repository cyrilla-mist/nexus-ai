#!/usr/bin/env python3
"""Verify Nexus Context Graph metadata in a running DataHub instance."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence

from ingest_nexus_context import (
    DEFAULT_INPUT,
    DEFAULT_SERVER,
    build_lineage_edges,
    dataset_urn,
    load_context_graph,
    node_by_id,
)


def _load_datahub_graph():
    try:
        from datahub.ingestion.graph.client import DataHubGraph, DatahubClientConfig
        from datahub.metadata.schema_classes import DatasetPropertiesClass, UpstreamLineageClass
    except Exception as exc:  # pragma: no cover - depends on optional SDK
        raise RuntimeError("DataHub runtime verification skipped/failed: DataHub Python SDK is not available.") from exc

    return DataHubGraph, DatahubClientConfig, DatasetPropertiesClass, UpstreamLineageClass


def verify_runtime(graph_data: Mapping[str, Any], server: str, token: str | None = None) -> list[str]:
    DataHubGraph, DatahubClientConfig, DatasetPropertiesClass, UpstreamLineageClass = _load_datahub_graph()
    config_kwargs = {"server": server}
    if token:
        config_kwargs["token"] = token
    graph = DataHubGraph(DatahubClientConfig(**config_kwargs))

    project_id = str(graph_data["projectId"])
    platform = str(graph_data.get("platform", "nexus"))
    env = str(graph_data.get("environment", "DEV"))
    errors: list[str] = []
    seen_urns: set[str] = set()

    for node in graph_data["nodes"]:
        urn = dataset_urn(node, project_id, platform, env)
        if urn in seen_urns:
            errors.append(f"Duplicate URN: {urn}")
        seen_urns.add(urn)
        try:
            properties = graph.get_aspect(urn, DatasetPropertiesClass)
        except Exception as exc:
            errors.append(f"Cannot read DatasetProperties for {node['id']}: {exc}")
            continue
        if properties is None:
            errors.append(f"Missing DatasetProperties for {node['id']}")
            continue
        custom = getattr(properties, "customProperties", None) or {}
        if custom.get("nexus_node_type") != node["type"]:
            errors.append(f"Missing or incorrect nexus_node_type for {node['id']}")

    expected_edges = build_lineage_edges(graph_data)
    downstream_expected: dict[str, set[str]] = {}
    for edge in expected_edges:
        downstream_expected.setdefault(edge["downstreamUrn"], set()).add(edge["upstreamUrn"])

    for downstream, expected_upstreams in downstream_expected.items():
        try:
            lineage = graph.get_aspect(downstream, UpstreamLineageClass)
        except Exception as exc:
            errors.append(f"Cannot read lineage for {downstream}: {exc}")
            continue
        actual_upstreams = {upstream.dataset for upstream in (getattr(lineage, "upstreams", None) or [])}
        missing = expected_upstreams - actual_upstreams
        if missing:
            errors.append(f"Missing lineage for {downstream}: {sorted(missing)}")

    return errors


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify Nexus Context Graph metadata in DataHub.")
    parser.add_argument("--server", default=os.getenv("DATAHUB_GMS_URL", DEFAULT_SERVER), help="DataHub GMS URL.")
    parser.add_argument("--token", default=os.getenv("DATAHUB_TOKEN"), help="Optional DataHub token. Never printed.")
    parser.add_argument("--project-id", default="campus-low-carbon", help="Expected Nexus project id.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Path to Nexus context graph JSON.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        graph_data = load_context_graph(args.input)
        if graph_data["projectId"] != args.project_id:
            print(f"FAIL: expected project id {args.project_id}, found {graph_data['projectId']}")
            return 1
        errors = verify_runtime(graph_data, args.server, args.token)
        if errors:
            print("FAIL")
            for error in errors:
                print(f"- {error}")
            return 1
        print("PASS")
        return 0
    except Exception as exc:
        print(f"DataHub runtime verification skipped/failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
