#!/usr/bin/env python3
"""Ingest a validated Nexus Continuity scenario into DataHub.

Dry-run is the default. Runtime writes require an explicit --apply flag.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, Mapping, Sequence

ROOT = Path(__file__).resolve().parents[2]
DATAHUB_DIR = ROOT / "datahub"
if str(DATAHUB_DIR) not in sys.path:
    sys.path.insert(0, str(DATAHUB_DIR))

from continuity.mapping import (  # noqa: E402
    DEFAULT_ENV,
    DEFAULT_PLATFORM,
    all_dataset_records,
    build_lineage_records,
    build_mapping_summary,
    build_tag_records,
    load_scenario,
)

DEFAULT_INPUT = ROOT / "continuity" / "scenarios" / "nexus-self-reentry.json"
VALIDATOR = ROOT / "continuity" / "validate-continuity-scenario.mjs"
DEFAULT_SERVER = "http://localhost:8080"


def validate_with_node(input_path: str | Path) -> None:
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required to validate the Continuity scenario.")
    result = subprocess.run(
        [node, str(VALIDATOR), str(Path(input_path).resolve())],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "Continuity validator failed.").strip()
        raise RuntimeError(message)


def dry_run_summary(scenario: Mapping[str, Any], env: str) -> str:
    summary = build_mapping_summary(scenario, env)
    fields = (
        ("Scenario", summary["scenario"]),
        ("Project", summary["project"]),
        ("Environment", summary["environment"]),
        ("Project root URN", summary["projectRootUrn"]),
        ("Continuity entities", summary["continuityEntities"]),
        ("Synthetic project nodes", summary["syntheticProjectNodes"]),
        ("Total DataHub datasets", summary["totalDataHubDatasets"]),
        ("Relationships", summary["relationships"]),
        ("Lineage downstream nodes", summary["lineageDownstreamNodes"]),
        ("Tags planned", summary["tagsPlanned"]),
        ("Tags skipped", str(summary["tagsSkipped"]).lower()),
        ("Tag status", summary["tagReason"]),
        ("Apply mode", "false"),
    )
    return "\n".join(
        [
            "Nexus DataHub Continuity Ingestion",
            "",
            *[f"{key}: {value}" for key, value in fields],
            "",
            "No metadata was written.",
        ]
    )


def _load_datahub_sdk() -> Dict[str, Any]:
    try:
        from datahub.emitter.mce_builder import make_dataset_urn
        from datahub.emitter.mcp import MetadataChangeProposalWrapper
        from datahub.emitter.rest_emitter import DatahubRestEmitter
        from datahub.metadata.schema_classes import (
            DataPlatformInfoClass,
            DatasetLineageTypeClass,
            DatasetPropertiesClass,
            UpstreamClass,
            UpstreamLineageClass,
        )
    except Exception as exc:  # pragma: no cover - optional runtime dependency
        raise RuntimeError(
            "DataHub Python SDK is unavailable. Install datahub/requirements.txt before --apply."
        ) from exc
    return {
        "make_dataset_urn": make_dataset_urn,
        "MetadataChangeProposalWrapper": MetadataChangeProposalWrapper,
        "DatahubRestEmitter": DatahubRestEmitter,
        "DataPlatformInfoClass": DataPlatformInfoClass,
        "DatasetLineageTypeClass": DatasetLineageTypeClass,
        "DatasetPropertiesClass": DatasetPropertiesClass,
        "UpstreamClass": UpstreamClass,
        "UpstreamLineageClass": UpstreamLineageClass,
    }


def emit_to_datahub(
    scenario: Mapping[str, Any], server: str, token: str | None, env: str
) -> Dict[str, int | str]:
    sdk = _load_datahub_sdk()
    emitter_kwargs = {"gms_server": server}
    if token:
        emitter_kwargs["token"] = token
    emitter = sdk["DatahubRestEmitter"](**emitter_kwargs)
    mcp = sdk["MetadataChangeProposalWrapper"]

    emitter.emit_mcp(
        mcp(
            entityUrn=f"urn:li:dataPlatform:{DEFAULT_PLATFORM}",
            aspect=sdk["DataPlatformInfoClass"](
                name="Nexus Continuity Context",
                displayName="Nexus Continuity Context",
                type="OTHERS",
                datasetNameDelimiter=".",
                logoUrl=None,
            ),
        )
    )

    datasets_written = 0
    for record in all_dataset_records(scenario, env):
        emitter.emit_mcp(
            mcp(
                entityUrn=record["urn"],
                aspect=sdk["DatasetPropertiesClass"](
                    name=record["name"],
                    description=record["description"],
                    customProperties=record["customProperties"],
                ),
            )
        )
        datasets_written += 1

    relationships_written = 0
    for lineage_record in build_lineage_records(scenario, env):
        upstreams = [
            sdk["UpstreamClass"](
                dataset=item["urn"],
                type=sdk["DatasetLineageTypeClass"].TRANSFORMED,
                auditStamp=None,
            )
            for item in lineage_record["upstreams"]
        ]
        emitter.emit_mcp(
            mcp(
                entityUrn=lineage_record["downstreamUrn"],
                aspect=sdk["UpstreamLineageClass"](upstreams=upstreams),
            )
        )
        relationships_written += sum(
            len(item["relationshipIds"]) for item in lineage_record["upstreams"]
        )

    tag_status = build_tag_records(scenario)
    return {
        "datasets": datasets_written,
        "relationships": relationships_written,
        "tags": len(tag_status["records"]),
        "tagStatus": "skipped" if not tag_status["enabled"] else "written",
    }


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Map and optionally ingest a Nexus Continuity scenario."
    )
    parser.add_argument("--input", default=str(DEFAULT_INPUT), help="Continuity scenario JSON.")
    parser.add_argument("--server", default=os.getenv("DATAHUB_GMS_URL", DEFAULT_SERVER))
    parser.add_argument("--token", default=os.getenv("DATAHUB_TOKEN"), help="Optional token; never printed.")
    parser.add_argument("--env", default=DEFAULT_ENV, help="DataHub environment.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Write metadata to DataHub.")
    mode.add_argument("--dry-run", action="store_true", help="Validate and print the mapping.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        validate_with_node(args.input)
        scenario = load_scenario(args.input)
        if not args.apply:
            print(dry_run_summary(scenario, args.env))
            return 0
        result = emit_to_datahub(scenario, args.server, args.token, args.env)
        print("PASS: Nexus DataHub continuity ingestion completed")
        print(f"Project: {scenario['project']['name']}")
        print(f"Datasets written: {result['datasets']}")
        print(f"Lineage relationships written: {result['relationships']}")
        print(f"Tags: {result['tagStatus']} ({result['tags']})")
        print(f"Environment: {args.env}")
        print("Result: PASS")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
