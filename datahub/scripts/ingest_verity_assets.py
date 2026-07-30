#!/usr/bin/env python3
"""Ingest the governed Verity asset graph into DataHub.

Dry-run is the default. Runtime writes require an explicit --apply flag.
The script emits only governed data assets and lineage; personal Nexus context
remains in the Nexus Context Fabric.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, Sequence

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SERVER = "http://localhost:8080"
DEFAULT_PLATFORM = "nexus"
DEFAULT_ENV = "PROD"

ASSETS = (
    {
        "id": "external-asset-rubric",
        "name": "verity_evaluation_rubric",
        "title": "Verity Evaluation Rubric",
        "description": "Governed scoring dimensions, evidence requirements, and interpretation boundaries used by Verity Benchmark v1.",
        "logicalType": "governance-rubric",
        "version": "1.0-draft",
        "qualityStatus": "draft-validated",
        "freshness": "current",
        "critical": False,
    },
    {
        "id": "external-asset-test-materials",
        "name": "verity_test_materials",
        "title": "Verity Test Materials",
        "description": "Representative competition materials used to test evidence extraction, risk findings, and report consistency.",
        "logicalType": "evaluation-inputs",
        "version": "1.0-draft",
        "qualityStatus": "curated",
        "freshness": "current",
        "critical": False,
    },
    {
        "id": "external-asset-benchmark",
        "name": "verity_benchmark_v1",
        "title": "Verity Benchmark v1",
        "description": "Benchmark dataset linking representative materials, expected findings, scoring bands, and acceptance criteria.",
        "logicalType": "benchmark",
        "version": "1.0-draft",
        "qualityStatus": "unverified",
        "freshness": "current",
        "critical": True,
    },
    {
        "id": "external-asset-calibration-job",
        "name": "verity_scoring_calibration",
        "title": "Verity Scoring Calibration",
        "description": "Runtime context asset representing the calibration process that compares expected findings with generated results.",
        "logicalType": "calibration-process",
        "version": "0.4.7",
        "qualityStatus": "operational",
        "freshness": "current",
        "critical": False,
    },
    {
        "id": "external-asset-results-v047",
        "name": "verity_evaluation_results_v047",
        "title": "Evaluation Results v0.4.7",
        "description": "Current evaluation outputs produced after grade-consistency safeguards were introduced.",
        "logicalType": "evaluation-results",
        "version": "0.4.7",
        "qualityStatus": "partially-validated",
        "freshness": "current",
        "critical": False,
    },
    {
        "id": "external-asset-release-evidence",
        "name": "verity_release_readiness_evidence",
        "title": "Verity Release Readiness Evidence",
        "description": "Evidence package used to decide whether Verity can advance from v0.4.7 toward v1.0.",
        "logicalType": "release-evidence",
        "version": "1.0-draft",
        "qualityStatus": "blocked-by-benchmark",
        "freshness": "incomplete",
        "critical": False,
    },
)

LINEAGE = (
    ("external-asset-rubric", "external-asset-benchmark"),
    ("external-asset-test-materials", "external-asset-benchmark"),
    ("external-asset-benchmark", "external-asset-calibration-job"),
    ("external-asset-calibration-job", "external-asset-results-v047"),
    ("external-asset-results-v047", "external-asset-release-evidence"),
)


def dataset_urn(name: str, env: str = DEFAULT_ENV) -> str:
    return f"urn:li:dataset:(urn:li:dataPlatform:{DEFAULT_PLATFORM},{name},{env})"


def asset_index(env: str) -> Dict[str, Dict[str, Any]]:
    return {
        asset["id"]: {**asset, "urn": dataset_urn(str(asset["name"]), env)}
        for asset in ASSETS
    }


def dry_run_summary(env: str) -> str:
    assets = asset_index(env)
    lines = [
        "Nexus Verity DataHub Asset Ingestion",
        "",
        f"Environment: {env}",
        f"Assets planned: {len(assets)}",
        f"Lineage relationships planned: {len(LINEAGE)}",
        "Ownership writes planned: 0",
        "Apply mode: false",
        "",
    ]
    for asset in assets.values():
        lines.append(f"- {asset['title']}: {asset['urn']}")
    lines.extend(
        [
            "",
            "The Benchmark owner is intentionally left unassigned so Nexus can detect and repair the governed context gap.",
            "No metadata was written.",
        ]
    )
    return "\n".join(lines)


def load_sdk() -> Dict[str, Any]:
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
    except Exception as exc:  # pragma: no cover - optional runtime dependency
        raise RuntimeError(
            "DataHub Python SDK is unavailable. Install datahub/requirements.txt before --apply."
        ) from exc
    return {
        "MetadataChangeProposalWrapper": MetadataChangeProposalWrapper,
        "DatahubRestEmitter": DatahubRestEmitter,
        "DataPlatformInfoClass": DataPlatformInfoClass,
        "DatasetLineageTypeClass": DatasetLineageTypeClass,
        "DatasetPropertiesClass": DatasetPropertiesClass,
        "UpstreamClass": UpstreamClass,
        "UpstreamLineageClass": UpstreamLineageClass,
    }


def emit_assets(server: str, token: str | None, env: str) -> Dict[str, int]:
    sdk = load_sdk()
    emitter_kwargs: Dict[str, Any] = {"gms_server": server}
    if token:
        emitter_kwargs["token"] = token
    emitter = sdk["DatahubRestEmitter"](**emitter_kwargs)
    mcp = sdk["MetadataChangeProposalWrapper"]
    assets = asset_index(env)

    emitter.emit_mcp(
        mcp(
            entityUrn=f"urn:li:dataPlatform:{DEFAULT_PLATFORM}",
            aspect=sdk["DataPlatformInfoClass"](
                name="Nexus Governed Context Assets",
                displayName="Nexus Governed Context Assets",
                type="OTHERS",
                datasetNameDelimiter="_",
                logoUrl=None,
            ),
        )
    )

    for asset in assets.values():
        emitter.emit_mcp(
            mcp(
                entityUrn=asset["urn"],
                aspect=sdk["DatasetPropertiesClass"](
                    name=str(asset["title"]),
                    description=str(asset["description"]),
                    customProperties={
                        "nexusProjectId": "project-verity",
                        "nexusAssetId": str(asset["id"]),
                        "nexusLogicalType": str(asset["logicalType"]),
                        "nexusVersion": str(asset["version"]),
                        "nexusQualityStatus": str(asset["qualityStatus"]),
                        "nexusFreshness": str(asset["freshness"]),
                        "nexusCriticalAsset": "true" if asset["critical"] else "false",
                        "nexusCanonicalStore": "datahub",
                    },
                ),
            )
        )

    upstream_by_downstream: Dict[str, list[str]] = {}
    for source_id, target_id in LINEAGE:
        upstream_by_downstream.setdefault(target_id, []).append(source_id)

    relationships = 0
    for target_id, source_ids in upstream_by_downstream.items():
        upstreams = [
            sdk["UpstreamClass"](
                dataset=assets[source_id]["urn"],
                type=sdk["DatasetLineageTypeClass"].TRANSFORMED,
                auditStamp=None,
            )
            for source_id in source_ids
        ]
        emitter.emit_mcp(
            mcp(
                entityUrn=assets[target_id]["urn"],
                aspect=sdk["UpstreamLineageClass"](upstreams=upstreams),
            )
        )
        relationships += len(upstreams)

    return {"assets": len(assets), "relationships": relationships}


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest the governed Verity asset graph into DataHub."
    )
    parser.add_argument("--server", default=os.getenv("DATAHUB_GMS_URL", DEFAULT_SERVER))
    parser.add_argument("--token", default=os.getenv("DATAHUB_TOKEN"), help="Optional token; never printed.")
    parser.add_argument("--env", default=DEFAULT_ENV)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--apply", action="store_true", help="Write metadata to DataHub.")
    mode.add_argument("--dry-run", action="store_true", help="Print the deterministic asset plan.")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        if not args.apply:
            print(dry_run_summary(args.env))
            return 0
        result = emit_assets(args.server, args.token, args.env)
        print("PASS: Verity governed assets ingested")
        print(f"Assets written: {result['assets']}")
        print(f"Lineage relationships written: {result['relationships']}")
        print(f"Environment: {args.env}")
        print("Benchmark owner: intentionally unassigned")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
