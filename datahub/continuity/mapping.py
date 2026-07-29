"""Deterministic Nexus Continuity Domain to DataHub mapping.

This module is side-effect free: import does not read fixtures, connect to
DataHub, mutate environment variables, or emit logs.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Mapping

DEFAULT_PLATFORM = "nexus"
DEFAULT_ENV = "DEV"
SCENARIO_NAME = "nexus-self-reentry"
SAFE_IDENTIFIER = re.compile(r"^[a-z0-9][a-z0-9._-]*$")


class ContinuityMappingError(ValueError):
    """Raised when Continuity data cannot be mapped safely."""


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def slugify_identifier(value: Any) -> str:
    if value is None or not str(value).strip():
        raise ContinuityMappingError("Identifier cannot be empty.")
    normalized = re.sub(r"[^a-z0-9._-]+", "-", str(value).strip().lower())
    normalized = re.sub(r"-+", "-", normalized).strip("._-")
    if not normalized or not SAFE_IDENTIFIER.fullmatch(normalized):
        raise ContinuityMappingError(f"Identifier cannot be safely normalized: {value!r}")
    return normalized


def validate_environment(env: Any) -> str:
    value = str(env).strip()
    if not value or not re.fullmatch(r"[A-Za-z0-9._-]+", value):
        raise ContinuityMappingError(f"Invalid DataHub environment: {env!r}")
    return value


def _make_dataset_urn(platform: str, name: str, env: str) -> str:
    """Use the DataHub SDK builder when installed; keep dry-run dependency-light."""

    try:
        from datahub.emitter.mce_builder import make_dataset_urn
    except ImportError:
        return f"urn:li:dataset:(urn:li:dataPlatform:{platform},{name},{env})"
    return make_dataset_urn(platform=platform, name=name, env=env)


def build_project_urn(project_id: Any, env: Any = DEFAULT_ENV) -> str:
    name = f"nexus.continuity.{slugify_identifier(project_id)}.project"
    return _make_dataset_urn(DEFAULT_PLATFORM, name, validate_environment(env))


def build_entity_urn(
    project_id: Any, entity_type: Any, entity_id: Any, env: Any = DEFAULT_ENV
) -> str:
    name = ".".join(
        (
            "nexus",
            "continuity",
            slugify_identifier(project_id),
            slugify_identifier(entity_type),
            slugify_identifier(entity_id),
        )
    )
    return _make_dataset_urn(DEFAULT_PLATFORM, name, validate_environment(env))


def _require_mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ContinuityMappingError(f"{label} must be an object.")
    return value


def _require_text(value: Any, label: str) -> str:
    if value is None or not str(value).strip():
        raise ContinuityMappingError(f"{label} cannot be empty.")
    return str(value)


def validate_scenario(scenario: Mapping[str, Any]) -> None:
    _require_mapping(scenario, "Scenario")
    project = _require_mapping(scenario.get("project"), "project")
    _require_text(scenario.get("schemaVersion"), "schemaVersion")
    project_id = _require_text(project.get("id"), "project.id")
    _require_text(project.get("name"), "project.name")
    _require_text(project.get("description"), "project.description")
    entities = scenario.get("entities")
    relationships = scenario.get("relationships")
    if not isinstance(entities, list):
        raise ContinuityMappingError("entities must be an array.")
    if not isinstance(relationships, list):
        raise ContinuityMappingError("relationships must be an array.")

    seen_ids: set[str] = set()
    seen_urns: dict[str, str] = {}
    for entity in entities:
        item = _require_mapping(entity, "entity")
        entity_id = _require_text(item.get("id"), "entity.id")
        entity_type = _require_text(item.get("type"), f"entity {entity_id}.type")
        _require_text(item.get("title"), f"entity {entity_id}.title")
        _require_text(item.get("summary"), f"entity {entity_id}.summary")
        if entity_id in seen_ids:
            raise ContinuityMappingError(f"Duplicate entity id: {entity_id}")
        seen_ids.add(entity_id)
        urn = build_entity_urn(project_id, entity_type, entity_id)
        if urn in seen_urns:
            raise ContinuityMappingError(
                f"URN collision between {seen_urns[urn]} and {entity_id}: {urn}"
            )
        seen_urns[urn] = entity_id

    relationship_ids: set[str] = set()
    for relationship in relationships:
        item = _require_mapping(relationship, "relationship")
        relationship_id = _require_text(item.get("id"), "relationship.id")
        source = _require_text(item.get("from"), f"relationship {relationship_id}.from")
        target = _require_text(item.get("to"), f"relationship {relationship_id}.to")
        _require_text(item.get("type"), f"relationship {relationship_id}.type")
        if relationship_id in relationship_ids:
            raise ContinuityMappingError(f"Duplicate relationship id: {relationship_id}")
        relationship_ids.add(relationship_id)
        if source not in seen_ids:
            raise ContinuityMappingError(f"Relationship {relationship_id} has unknown source: {source}")
        if target not in seen_ids:
            raise ContinuityMappingError(f"Relationship {relationship_id} has unknown target: {target}")
        if source == target:
            raise ContinuityMappingError(f"Relationship {relationship_id} cannot reference itself.")


def load_scenario(path: str | Path) -> Dict[str, Any]:
    with Path(path).open("r", encoding="utf-8-sig") as handle:
        scenario = json.load(handle)
    validate_scenario(scenario)
    return scenario


def _relationship_payload(relationship: Mapping[str, Any]) -> Dict[str, str]:
    return {
        "id": str(relationship["id"]),
        "type": str(relationship["type"]),
        "from": str(relationship["from"]),
        "to": str(relationship["to"]),
    }


def index_relationships(
    scenario: Mapping[str, Any],
) -> Dict[str, Dict[str, List[Dict[str, str]]]]:
    validate_scenario(scenario)
    index = {
        str(entity["id"]): {"incoming": [], "outgoing": []}
        for entity in scenario["entities"]
    }
    for relationship in sorted(scenario["relationships"], key=lambda item: str(item["id"])):
        payload = _relationship_payload(relationship)
        index[payload["from"]]["outgoing"].append(payload)
        index[payload["to"]]["incoming"].append(payload)
    return index


def _property_value(value: Any) -> str | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        return stable_json(value)
    if isinstance(value, float):
        return format(value, ".15g")
    return str(value)


def _clean_properties(values: Mapping[str, Any]) -> Dict[str, str]:
    cleaned = {}
    for key, value in values.items():
        serialized = _property_value(value)
        if serialized is not None:
            cleaned[key] = serialized
    return cleaned


def build_project_record(
    scenario: Mapping[str, Any], env: Any = DEFAULT_ENV
) -> Dict[str, Any]:
    validate_scenario(scenario)
    project = scenario["project"]
    findings = scenario["expectedFindings"]
    properties = _clean_properties(
        {
            "nexusSchemaVersion": scenario["schemaVersion"],
            "nexusProjectId": project["id"],
            "nexusRecordKind": "project",
            "nexusScenario": SCENARIO_NAME,
            "nexusProjectStatus": project["status"],
            "nexusCreatedAt": project["createdAt"],
            "nexusUpdatedAt": project["updatedAt"],
            "nexusIsFixture": True,
            "nexusEntityCount": len(scenario["entities"]),
            "nexusRelationshipCount": len(scenario["relationships"]),
            "nexusMeaningfulChanges": findings["meaningfulChanges"],
            "nexusStaleRecords": findings["staleRecords"],
            "nexusAgentConflicts": findings["agentConflicts"],
            "nexusMissingOwners": findings["missingOwners"],
            "nexusValidDecisions": findings["validDecisions"],
            "nexusRecommendedActions": findings.get("recommendedActions"),
            "nexusReentryQuery": scenario["reentryQuery"],
        }
    )
    return {
        "urn": build_project_urn(project["id"], env),
        "recordKind": "project",
        "name": str(project["name"]),
        "description": str(project["description"]),
        "customProperties": properties,
    }


OPTIONAL_ENTITY_PROPERTIES = {
    "confidence": "nexusConfidence",
    "ownerId": "nexusOwnerId",
    "confirmedBy": "nexusConfirmedBy",
    "confirmedAt": "nexusConfirmedAt",
    "expiresAt": "nexusExpiresAt",
    "agent": "nexusAgent",
    "priority": "nexusPriority",
    "completionCriteria": "nexusCompletionCriteria",
    "supersedes": "nexusSupersedes",
    "supersededBy": "nexusSupersededBy",
    "source": "nexusSource",
    "metadata": "nexusMetadata",
}


def build_entity_records(
    scenario: Mapping[str, Any], env: Any = DEFAULT_ENV
) -> List[Dict[str, Any]]:
    validate_scenario(scenario)
    project_id = scenario["project"]["id"]
    relationships = index_relationships(scenario)
    records = []
    seen_urns: set[str] = set()
    for entity in sorted(scenario["entities"], key=lambda item: str(item["id"])):
        entity_id = str(entity["id"])
        urn = build_entity_urn(project_id, entity["type"], entity_id, env)
        if urn in seen_urns:
            raise ContinuityMappingError(f"Duplicate DataHub entity URN: {urn}")
        seen_urns.add(urn)
        values = {
            "nexusSchemaVersion": scenario["schemaVersion"],
            "nexusProjectId": project_id,
            "nexusEntityId": entity_id,
            "nexusEntityType": entity["type"],
            "nexusStatus": entity["status"],
            "nexusCreatedAt": entity["createdAt"],
            "nexusUpdatedAt": entity["updatedAt"],
            "nexusScenario": SCENARIO_NAME,
            "nexusIsFixture": True,
            "nexusIncomingRelationships": relationships[entity_id]["incoming"],
            "nexusOutgoingRelationships": relationships[entity_id]["outgoing"],
        }
        for source_key, target_key in OPTIONAL_ENTITY_PROPERTIES.items():
            if source_key in entity:
                values[target_key] = entity[source_key]
        records.append(
            {
                "urn": urn,
                "recordKind": "entity",
                "entityId": entity_id,
                "entityType": str(entity["type"]),
                "name": str(entity["title"]),
                "description": str(entity["summary"]),
                "customProperties": _clean_properties(values),
            }
        )
    return records


def build_lineage_records(
    scenario: Mapping[str, Any], env: Any = DEFAULT_ENV
) -> List[Dict[str, Any]]:
    validate_scenario(scenario)
    project_id = scenario["project"]["id"]
    entities = {str(item["id"]): item for item in scenario["entities"]}
    grouped: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    for relationship in sorted(scenario["relationships"], key=lambda item: str(item["id"])):
        source_id = str(relationship["from"])
        target_id = str(relationship["to"])
        upstream = build_entity_urn(project_id, entities[source_id]["type"], source_id, env)
        downstream = build_entity_urn(project_id, entities[target_id]["type"], target_id, env)
        entry = grouped[downstream].setdefault(
            upstream,
            {
                "urn": upstream,
                "entityId": source_id,
                "relationshipIds": [],
                "relationshipTypes": [],
            },
        )
        entry["relationshipIds"].append(str(relationship["id"]))
        entry["relationshipTypes"].append(str(relationship["type"]))
    records = []
    for downstream, upstream_map in sorted(grouped.items()):
        upstreams = []
        for upstream in sorted(upstream_map.values(), key=lambda item: item["urn"]):
            upstream["relationshipIds"] = sorted(set(upstream["relationshipIds"]))
            upstream["relationshipTypes"] = sorted(set(upstream["relationshipTypes"]))
            upstreams.append(upstream)
        records.append({"downstreamUrn": downstream, "upstreams": upstreams})
    return records


def build_tag_records(scenario: Mapping[str, Any]) -> Dict[str, Any]:
    validate_scenario(scenario)
    return {
        "enabled": False,
        "records": [],
        "reason": (
            "Skipped: the broad DataHub SDK range has no verified stable "
            "Global Tags write contract for this foundation."
        ),
    }


def build_mapping_summary(
    scenario: Mapping[str, Any], env: Any = DEFAULT_ENV
) -> Dict[str, Any]:
    project = build_project_record(scenario, env)
    entities = build_entity_records(scenario, env)
    lineage = build_lineage_records(scenario, env)
    tags = build_tag_records(scenario)
    return {
        "scenario": SCENARIO_NAME,
        "project": scenario["project"]["name"],
        "environment": validate_environment(env),
        "projectRootUrn": project["urn"],
        "continuityEntities": len(entities),
        "syntheticProjectNodes": 1,
        "totalDataHubDatasets": len(entities) + 1,
        "relationships": len(scenario["relationships"]),
        "lineageDownstreamNodes": len(lineage),
        "tagsPlanned": len(tags["records"]),
        "tagsSkipped": not tags["enabled"],
        "tagReason": tags["reason"],
        "applyMode": False,
    }


def all_dataset_records(
    scenario: Mapping[str, Any], env: Any = DEFAULT_ENV
) -> List[Dict[str, Any]]:
    return [build_project_record(scenario, env), *build_entity_records(scenario, env)]
