#!/usr/bin/env python3
"""Read-only verification for Nexus Continuity metadata in DataHub."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict, Mapping, Sequence

ROOT = Path(__file__).resolve().parents[2]
DATAHUB_DIR = ROOT / "datahub"
if str(DATAHUB_DIR) not in sys.path:
    sys.path.insert(0, str(DATAHUB_DIR))

from continuity.mapping import (  # noqa: E402
    DEFAULT_ENV,
    all_dataset_records,
    build_entity_records,
    build_lineage_records,
    build_project_record,
    load_scenario,
    slugify_identifier,
)

DEFAULT_INPUT = ROOT / "continuity" / "scenarios" / "nexus-self-reentry.json"
DEFAULT_SERVER = "http://localhost:8080"


def _load_datahub_graph():
    try:
        from datahub.ingestion.graph.client import DataHubGraph, DatahubClientConfig
        from datahub.metadata.schema_classes import DatasetPropertiesClass, UpstreamLineageClass
    except Exception as exc:  # pragma: no cover - optional runtime dependency
        raise RuntimeError("DataHub Python SDK is unavailable.") from exc
    return DataHubGraph, DatahubClientConfig, DatasetPropertiesClass, UpstreamLineageClass


def _actual_properties(properties: Any) -> Dict[str, str]:
    return dict(getattr(properties, "customProperties", None) or {})


def verify_runtime(
    scenario: Mapping[str, Any],
    server: str,
    token: str | None = None,
    env: str = DEFAULT_ENV,
) -> list[str]:
    (
        DataHubGraph,
        DatahubClientConfig,
        DatasetPropertiesClass,
        UpstreamLineageClass,
    ) = _load_datahub_graph()
    config = {"server": server}
    if token:
        config["token"] = token
    graph = DataHubGraph(DatahubClientConfig(**config))
    errors: list[str] = []

    for record in all_dataset_records(scenario, env):
        try:
            properties = graph.get_aspect(record["urn"], DatasetPropertiesClass)
        except Exception as exc:
            errors.append(f"Cannot read DatasetProperties for {record['urn']}: {exc}")
            continue
        if properties is None:
            errors.append(f"Missing DatasetProperties: {record['urn']}")
            continue
        if getattr(properties, "name", None) != record["name"]:
            errors.append(f"Incorrect name for {record['urn']}")
        if getattr(properties, "description", None) != record["description"]:
            errors.append(f"Incorrect description for {record['urn']}")
        actual = _actual_properties(properties)
        for key, expected in record["customProperties"].items():
            if actual.get(key) != expected:
                errors.append(f"Incorrect {key} for {record['urn']}")

    expected_lineage = {
        record["downstreamUrn"]: {item["urn"] for item in record["upstreams"]}
        for record in build_lineage_records(scenario, env)
    }
    continuity_prefix = (
        "urn:li:dataset:(urn:li:dataPlatform:nexus,"
        f"nexus.continuity.{slugify_identifier(scenario['project']['id'])}."
    )
    for downstream, expected_upstreams in expected_lineage.items():
        try:
            lineage = graph.get_aspect(downstream, UpstreamLineageClass)
        except Exception as exc:
            errors.append(f"Cannot read lineage for {downstream}: {exc}")
            continue
        actual = {
            item.dataset
            for item in (getattr(lineage, "upstreams", None) or [])
            if item.dataset.startswith(continuity_prefix)
        }
        if actual != expected_upstreams:
            errors.append(
                f"Incorrect continuity upstream set for {downstream}: "
                f"expected {sorted(expected_upstreams)}, found {sorted(actual)}"
            )

    project_record = build_project_record(scenario, env)
    findings = scenario["expectedFindings"]
    for key, value in {
        "nexusMeaningfulChanges": findings["meaningfulChanges"],
        "nexusStaleRecords": findings["staleRecords"],
        "nexusAgentConflicts": findings["agentConflicts"],
        "nexusMissingOwners": findings["missingOwners"],
        "nexusValidDecisions": findings["validDecisions"],
    }.items():
        if project_record["customProperties"][key] != str(value):
            errors.append(f"Project finding mapping mismatch: {key}")

    by_id = {record["entityId"]: record for record in build_entity_records(scenario, env)}
    campus = by_id.get("claim-campus-showcase", {}).get("customProperties", {})
    if (
        campus.get("nexusStatus") != "superseded"
        or '"finalDemo":false' not in campus.get("nexusMetadata", "")
    ):
        errors.append("Campus fixture boundary is not preserved.")
    star_map = by_id.get("source-star-map-experiment", {}).get("customProperties", {})
    if (
        star_map.get("nexusStatus") != "archived"
        or '"archivedVisualExperiment":true' not in star_map.get("nexusMetadata", "")
    ):
        errors.append("Star Map is not preserved as an archived visual experiment.")
    return errors


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify Nexus Continuity metadata in DataHub.")
    parser.add_argument("--input", default=str(DEFAULT_INPUT))
    parser.add_argument("--server", default=os.getenv("DATAHUB_GMS_URL", DEFAULT_SERVER))
    parser.add_argument("--token", default=os.getenv("DATAHUB_TOKEN"), help="Optional token; never printed.")
    parser.add_argument("--env", default=DEFAULT_ENV)
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        scenario = load_scenario(args.input)
        errors = verify_runtime(scenario, args.server, args.token, args.env)
        if errors:
            print("FAIL")
            for error in errors:
                print(f"- {error}")
            return 1
        print("PASS: DataHub continuity scenario verified")
        return 0
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
