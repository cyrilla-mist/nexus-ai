import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
FIXTURE_STATEMENT = (
    "The campus low-carbon project is a development fixture used only to verify "
    "DataHub ingestion, metadata properties, search, and lineage. It is not the "
    "final Nexus AI hackathon scenario."
)


class McpSmokeConfigTests(unittest.TestCase):
    def setUp(self):
        config_path = ROOT / "datahub" / "mcp" / "mcp-config.example.json"
        self.config = json.loads(config_path.read_text(encoding="utf-8-sig"))
        self.server = self.config["mcpServers"]["datahub"]
        self.smoke = (ROOT / "datahub" / "mcp" / "smoke-test.mjs").read_text(encoding="utf-8")

    def test_official_stdio_config_is_local_and_secret_free(self):
        self.assertEqual(self.server["command"], "uvx")
        self.assertEqual(self.server["args"], ["mcp-server-datahub@latest"])
        self.assertEqual(self.server["env"]["DATAHUB_GMS_URL"], "http://localhost:8080")
        self.assertNotIn("DATAHUB_GMS_TOKEN", self.server["env"])
        self.assertNotIn("DATAHUB_TOKEN", self.server["env"])

    def test_mutation_and_document_writes_are_disabled(self):
        env = self.server["env"]
        self.assertEqual(env["TOOLS_IS_MUTATION_ENABLED"], "false")
        self.assertEqual(env["TOOLS_IS_USER_ENABLED"], "false")
        self.assertEqual(env["DATAHUB_MCP_DOCUMENT_TOOLS_DISABLED"], "true")
        self.assertEqual(env["SAVE_DOCUMENT_TOOL_ENABLED"], "false")
        self.assertIn('TOOLS_IS_MUTATION_ENABLED: "false"', self.smoke)

    def test_smoke_harness_calls_only_required_read_tools(self):
        for name in ("search", "get_entities", "get_lineage"):
            self.assertIn(f'callTool("{name}"', self.smoke)
        for name in ("add_tags", "remove_tags", "set_owners", "update_description", "create_document", "save_document"):
            self.assertNotIn(f'callTool("{name}"', self.smoke)

    def test_fixture_boundary_is_consistent(self):
        paths = (
            ROOT / "datahub" / "README.md",
            ROOT / "docs" / "Nexus-DataHub-Integration.md",
            ROOT / "datahub" / "runtime" / "README.md",
        )
        for path in paths:
            with self.subTest(path=path):
                self.assertIn(FIXTURE_STATEMENT, path.read_text(encoding="utf-8-sig"))

    def test_runtime_records_successful_read_only_mcp_evidence(self):
        runtime = (ROOT / "datahub" / "runtime" / "README.md").read_text(encoding="utf-8")
        self.assertIn("MCP read-only smoke test: PASS", runtime)
        self.assertIn("PASS: DataHub MCP read-only smoke test completed", runtime)
        self.assertIn("`search`", runtime)
        self.assertIn("`get_entities`", runtime)
        self.assertIn("`get_lineage`", runtime)
        self.assertIn("Mutation Tools | `DISABLED`", runtime)
        self.assertIn("User Tools | `DISABLED`", runtime)
        self.assertIn("Data Quality Tools | `DISABLED`", runtime)
        self.assertNotIn("MCP read-only smoke test not completed", runtime)


if __name__ == "__main__":
    unittest.main()
