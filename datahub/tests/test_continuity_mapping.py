import copy
import importlib.util
import json
import pathlib
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[2]
MAPPING_PATH = ROOT / "datahub" / "continuity" / "mapping.py"
INGEST_PATH = ROOT / "datahub" / "scripts" / "ingest_continuity_scenario.py"
SCENARIO = ROOT / "continuity" / "scenarios" / "nexus-self-reentry.json"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mapping = load_module("continuity_mapping", MAPPING_PATH)
ingest = load_module("ingest_continuity_scenario", INGEST_PATH)


class ContinuityMappingTest(unittest.TestCase):
    def load_scenario(self):
        return mapping.load_scenario(SCENARIO)

    def test_project_urn_is_deterministic(self):
        expected = (
            "urn:li:dataset:(urn:li:dataPlatform:nexus,"
            "nexus.continuity.project-nexus-ai.project,DEV)"
        )
        self.assertEqual(mapping.build_project_urn("project-nexus-ai", "DEV"), expected)
        self.assertEqual(mapping.build_project_urn("project-nexus-ai", "DEV"), expected)

    def test_entity_urn_is_deterministic(self):
        urn = mapping.build_entity_urn(
            "project-nexus-ai", "decision", "decision-no-campus-demo", "DEV"
        )
        self.assertEqual(
            urn,
            "urn:li:dataset:(urn:li:dataPlatform:nexus,"
            "nexus.continuity.project-nexus-ai.decision.decision-no-campus-demo,DEV)",
        )

    def test_slug_is_safe_and_stable(self):
        self.assertEqual(mapping.slugify_identifier(" Project Nexus AI "), "project-nexus-ai")
        self.assertEqual(mapping.slugify_identifier("A/B C"), "a-b-c")

    def test_empty_or_illegal_identifier_is_rejected(self):
        for value in ("", "   ", "!!!", None):
            with self.subTest(value=value):
                with self.assertRaises(mapping.ContinuityMappingError):
                    mapping.slugify_identifier(value)

    def test_dataset_count_is_entities_plus_project(self):
        scenario = self.load_scenario()
        self.assertEqual(
            len(mapping.all_dataset_records(scenario)), len(scenario["entities"]) + 1
        )

    def test_all_entities_are_mapped(self):
        scenario = self.load_scenario()
        self.assertEqual(
            {item["id"] for item in scenario["entities"]},
            {record["entityId"] for record in mapping.build_entity_records(scenario)},
        )

    def test_all_relationships_are_indexed_once_per_direction(self):
        scenario = self.load_scenario()
        index = mapping.index_relationships(scenario)
        self.assertEqual(
            sum(len(item["incoming"]) for item in index.values()),
            len(scenario["relationships"]),
        )
        self.assertEqual(
            sum(len(item["outgoing"]) for item in index.values()),
            len(scenario["relationships"]),
        )

    def test_incoming_relationships_are_correct(self):
        scenario = self.load_scenario()
        relationship = scenario["relationships"][0]
        index = mapping.index_relationships(scenario)
        self.assertIn(
            relationship["id"],
            [item["id"] for item in index[relationship["to"]]["incoming"]],
        )
        self.assertNotIn(
            relationship["id"],
            [item["id"] for item in index[relationship["to"]]["outgoing"]],
        )

    def test_outgoing_relationships_are_correct(self):
        scenario = self.load_scenario()
        relationship = scenario["relationships"][0]
        index = mapping.index_relationships(scenario)
        self.assertIn(
            relationship["id"],
            [item["id"] for item in index[relationship["from"]]["outgoing"]],
        )

    def test_multiple_upstreams_are_aggregated_per_downstream(self):
        scenario = self.load_scenario()
        records = mapping.build_lineage_records(scenario)
        self.assertEqual(len(records), len({item["to"] for item in scenario["relationships"]}))
        self.assertTrue(any(len(record["upstreams"]) > 1 for record in records))

    def test_complete_chain_direction_is_preserved(self):
        scenario = self.load_scenario()
        entities = {item["id"]: item for item in scenario["entities"]}
        chain_types = ["source", "evidence", "claim", "decision", "task", "outcome"]
        outgoing = {}
        for relationship in scenario["relationships"]:
            outgoing.setdefault(relationship["from"], []).append(relationship["to"])

        def walk(entity_id, index):
            if index == len(chain_types) - 1:
                return True
            return any(
                entities[target]["type"] == chain_types[index + 1]
                and walk(target, index + 1)
                for target in outgoing.get(entity_id, [])
            )

        start = next(
            item["id"]
            for item in scenario["entities"]
            if item["type"] == "source" and walk(item["id"], 0)
        )
        first_target = next(
            relationship["to"]
            for relationship in scenario["relationships"]
            if relationship["from"] == start
            and entities[relationship["to"]]["type"] == "evidence"
        )
        lineage = {
            record["downstreamUrn"]: {item["urn"] for item in record["upstreams"]}
            for record in mapping.build_lineage_records(scenario)
        }
        downstream = mapping.build_entity_urn(
            scenario["project"]["id"], entities[first_target]["type"], first_target
        )
        upstream = mapping.build_entity_urn(
            scenario["project"]["id"], entities[start]["type"], start
        )
        self.assertIn(upstream, lineage[downstream])

    def test_custom_properties_do_not_contain_null_or_empty_values(self):
        scenario = self.load_scenario()
        for record in mapping.all_dataset_records(scenario):
            self.assertNotIn(None, record["customProperties"].values())
            self.assertNotIn("", record["customProperties"].values())

    def test_structured_json_is_stable(self):
        left = {"b": True, "a": [2, {"z": 1, "a": False}]}
        right = {"a": [2, {"a": False, "z": 1}], "b": True}
        self.assertEqual(mapping.stable_json(left), mapping.stable_json(right))
        self.assertEqual(mapping.stable_json(left), '{"a":[2,{"a":false,"z":1}],"b":true}')

    def test_expected_findings_are_on_project_root(self):
        custom = mapping.build_project_record(self.load_scenario())["customProperties"]
        self.assertEqual(custom["nexusMeaningfulChanges"], "4")
        self.assertEqual(custom["nexusAgentConflicts"], "1")
        self.assertEqual(custom["nexusValidDecisions"], "4")

    def test_campus_fixture_is_not_final_demo(self):
        record = next(
            item
            for item in mapping.build_entity_records(self.load_scenario())
            if item["entityId"] == "claim-campus-showcase"
        )
        self.assertEqual(record["customProperties"]["nexusStatus"], "superseded")
        self.assertIn('"finalDemo":false', record["customProperties"]["nexusMetadata"])

    def test_star_map_remains_archived(self):
        record = next(
            item
            for item in mapping.build_entity_records(self.load_scenario())
            if item["entityId"] == "source-star-map-experiment"
        )
        self.assertEqual(record["customProperties"]["nexusStatus"], "archived")
        self.assertIn(
            '"archivedVisualExperiment":true',
            record["customProperties"]["nexusMetadata"],
        )

    def test_dry_run_does_not_load_sdk_or_connect(self):
        with mock.patch.object(ingest, "emit_to_datahub") as emit:
            exit_code = ingest.main(["--input", str(SCENARIO), "--dry-run"])
        self.assertEqual(exit_code, 0)
        emit.assert_not_called()

    def test_repeated_mapping_is_identical(self):
        scenario = self.load_scenario()
        first = {
            "datasets": mapping.all_dataset_records(scenario),
            "lineage": mapping.build_lineage_records(scenario),
            "summary": mapping.build_mapping_summary(scenario),
        }
        copied = copy.deepcopy(scenario)
        second = {
            "datasets": mapping.all_dataset_records(copied),
            "lineage": mapping.build_lineage_records(copied),
            "summary": mapping.build_mapping_summary(copied),
        }
        self.assertEqual(first, second)

    def test_slug_collision_is_rejected(self):
        scenario = self.load_scenario()
        duplicate = copy.deepcopy(scenario["entities"][0])
        duplicate["id"] = duplicate["id"].replace("-", " ")
        scenario["entities"].append(duplicate)
        with self.assertRaisesRegex(mapping.ContinuityMappingError, "URN collision"):
            mapping.validate_scenario(scenario)

    def test_relationship_json_is_sorted_by_id(self):
        for record in mapping.build_entity_records(self.load_scenario()):
            incoming = json.loads(record["customProperties"]["nexusIncomingRelationships"])
            outgoing = json.loads(record["customProperties"]["nexusOutgoingRelationships"])
            self.assertEqual(
                [item["id"] for item in incoming],
                sorted(item["id"] for item in incoming),
            )
            self.assertEqual(
                [item["id"] for item in outgoing],
                sorted(item["id"] for item in outgoing),
            )


if __name__ == "__main__":
    unittest.main()
