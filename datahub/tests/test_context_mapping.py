import copy
import importlib.util
import json
import pathlib
import unittest
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "datahub" / "scripts" / "ingest_nexus_context.py"
SAMPLE = ROOT / "datahub" / "sample" / "nexus-project-context.json"

spec = importlib.util.spec_from_file_location("ingest_nexus_context", SCRIPT)
ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingest)


class NexusContextMappingTest(unittest.TestCase):
    def load_graph(self):
        return ingest.load_context_graph(SAMPLE)

    def test_sample_json_loads(self):
        graph = self.load_graph()
        self.assertEqual(graph["projectId"], "campus-low-carbon")
        self.assertEqual(graph["projectName"], "校园低碳循环计划")

    def test_node_count_is_correct(self):
        graph = self.load_graph()
        self.assertEqual(len(graph["nodes"]), 7)

    def test_relationship_count_is_correct(self):
        graph = self.load_graph()
        self.assertEqual(len(graph["relationships"]), 5)

    def test_node_ids_are_unique(self):
        graph = self.load_graph()
        ids = [node["id"] for node in graph["nodes"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_relationship_sources_and_targets_exist(self):
        graph = self.load_graph()
        ids = {node["id"] for node in graph["nodes"]}
        for relationship in graph["relationships"]:
            self.assertIn(relationship["source"], ids)
            self.assertIn(relationship["target"], ids)

    def test_self_lineage_is_rejected(self):
        graph = self.load_graph()
        graph["relationships"] = [
            {"source": "project:campus-loop", "target": "project:campus-loop", "type": "updates"}
        ]
        with self.assertRaises(ingest.ContextGraphError):
            ingest.build_lineage_edges(graph)

    def test_urn_generation_is_stable(self):
        graph = self.load_graph()
        project = graph["nodes"][0]
        self.assertEqual(
            ingest.dataset_urn(project, graph["projectId"]),
            "urn:li:dataset:(urn:li:dataPlatform:nexus,nexus.campus-low-carbon.project,DEV)",
        )

    def test_urn_has_no_spaces_or_unstable_characters(self):
        graph = self.load_graph()
        for node in graph["nodes"]:
            urn_name = node["urnName"]
            self.assertTrue(ingest.is_stable_urn_name(urn_name), urn_name)
            self.assertNotIn(" ", ingest.dataset_urn(node, graph["projectId"]))

    def test_custom_properties_mapping_is_correct(self):
        graph = self.load_graph()
        node = next(item for item in graph["nodes"] if item["type"] == "decision")
        properties = ingest.build_dataset_properties(graph, node)
        custom = properties["customProperties"]
        self.assertEqual(custom["nexus_project_id"], "campus-low-carbon")
        self.assertEqual(custom["nexus_node_id"], node["id"])
        self.assertEqual(custom["nexus_node_type"], "decision")
        self.assertEqual(custom["nexus_status"], "confirmed")
        self.assertEqual(custom["nexus_source"], "user_confirmed")
        self.assertEqual(custom["nexus_schema_version"], "1")

    def test_token_does_not_enter_logs(self):
        graph = self.load_graph()
        summary = ingest.dry_run_summary(graph)
        self.assertNotIn("DATAHUB_TOKEN", summary)
        self.assertNotIn("secret", summary.lower())

    def test_dry_run_does_not_create_emitter_write_operations(self):
        graph = self.load_graph()
        with mock.patch.object(ingest, "emit_to_datahub") as mocked_emit:
            exit_code = ingest.main(["--input", str(SAMPLE), "--dry-run"])
        self.assertEqual(exit_code, 0)
        mocked_emit.assert_not_called()

    def test_duplicate_relationships_are_removed(self):
        graph = self.load_graph()
        graph["relationships"].append(copy.deepcopy(graph["relationships"][0]))
        edges = ingest.build_lineage_edges(graph)
        self.assertEqual(len(edges), 5)

    def test_lineage_direction_is_stable(self):
        graph = self.load_graph()
        edges = ingest.build_lineage_edges(graph)
        project_problem = next(edge for edge in edges if edge["type"] == "addresses")
        self.assertEqual(project_problem["source"], "project:campus-loop")
        self.assertEqual(project_problem["target"], "problem:single-use")
        self.assertIn("nexus.campus-low-carbon.project", project_problem["upstreamUrn"])
        self.assertIn("nexus.campus-low-carbon.problem.usage-reason", project_problem["downstreamUrn"])

    def test_missing_fields_return_clear_errors(self):
        graph = self.load_graph()
        del graph["nodes"][0]["source"]
        with self.assertRaisesRegex(ingest.ContextGraphError, "source"):
            ingest.validate_context_graph(graph)


if __name__ == "__main__":
    unittest.main()
