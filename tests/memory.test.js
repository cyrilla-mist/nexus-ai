import assert from "node:assert/strict";
import test from "node:test";

import { MemoryManager } from "../memory/memory-manager.js";
import { MemoryStore } from "../memory/memory-store.js";
import {
  MEMORY_TYPES,
  MemoryValidationError
} from "../memory/schema.js";

const CREATED_AT = "2026-07-26T10:00:00.000Z";
const UPDATED_AT = "2026-07-26T10:05:00.000Z";

function createManager({
  ids = ["memory-1"],
  timestamps = [CREATED_AT]
} = {}) {
  let idIndex = 0;
  let timestampIndex = 0;

  return new MemoryManager({
    store: new MemoryStore(),
    idGenerator: () => ids[idIndex++],
    clock: () => timestamps[timestampIndex++]
  });
}

test("creates User Memory with non-sensitive preferences", () => {
  const manager = createManager();
  const memory = manager.create({
    type: MEMORY_TYPES.USER,
    data: {
      preferences: {
        analysisStyle: "reviewer"
      }
    }
  });

  assert.deepEqual(memory, {
    id: "memory-1",
    type: "user",
    data: {
      preferences: {
        analysisStyle: "reviewer"
      }
    },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT
  });
});

test("creates Project Memory with lifecycle fields", () => {
  const manager = createManager();
  const memory = manager.create({
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "Nexus AI",
      stage: "Explore",
      history: [{ summary: "Initial idea" }],
      decisions: [],
      nextActions: ["Validate the problem"]
    }
  });

  assert.equal(memory.type, "project");
  assert.equal(memory.data.title, "Nexus AI");
  assert.equal(memory.data.stage, "Explore");
  assert.deepEqual(memory.data.nextActions, ["Validate the problem"]);
});

test("creates Atlas Memory with versioned capabilities", () => {
  const manager = createManager();
  const memory = manager.create({
    type: MEMORY_TYPES.ATLAS,
    data: {
      atlasId: "project-atlas",
      version: "0.1.1",
      capabilities: ["project analysis", "multi-turn context"]
    }
  });

  assert.equal(memory.type, "atlas");
  assert.equal(memory.data.atlasId, "project-atlas");
  assert.deepEqual(memory.data.capabilities, [
    "project analysis",
    "multi-turn context"
  ]);
});

test("retrieve returns the correct Memory without sharing references", () => {
  const manager = createManager();
  const created = manager.create({
    type: MEMORY_TYPES.USER,
    data: {
      preferences: {
        language: "zh-CN"
      }
    }
  });

  const retrieved = manager.retrieve(created.id);
  retrieved.data.preferences.language = "en";

  assert.equal(manager.retrieve(created.id).data.preferences.language, "zh-CN");
  assert.equal(manager.retrieve("missing-memory"), null);
});

test("update merges data and preserves creation metadata", () => {
  const manager = createManager({
    timestamps: [CREATED_AT, UPDATED_AT]
  });
  const created = manager.create({
    type: MEMORY_TYPES.PROJECT,
    data: {
      title: "Nexus AI",
      stage: "Idea"
    }
  });

  const updated = manager.update(created.id, {
    stage: "Explore",
    nextActions: ["Interview target users"]
  });

  assert.equal(updated.data.title, "Nexus AI");
  assert.equal(updated.data.stage, "Explore");
  assert.deepEqual(updated.data.nextActions, ["Interview target users"]);
  assert.equal(updated.createdAt, CREATED_AT);
  assert.equal(updated.updatedAt, UPDATED_AT);
});

test("list filters Memory records by type", () => {
  const manager = createManager({
    ids: ["user-1", "project-1", "project-2"],
    timestamps: [CREATED_AT, CREATED_AT, CREATED_AT]
  });

  manager.create({
    type: MEMORY_TYPES.USER,
    data: { preferences: {} }
  });
  manager.create({
    type: MEMORY_TYPES.PROJECT,
    data: { title: "Project One" }
  });
  manager.create({
    type: MEMORY_TYPES.PROJECT,
    data: { title: "Project Two" }
  });

  const projects = manager.list(MEMORY_TYPES.PROJECT);

  assert.equal(projects.length, 2);
  assert.deepEqual(
    projects.map((memory) => memory.id),
    ["project-1", "project-2"]
  );
  assert.equal(manager.list().length, 3);
});

test("retrieveContext returns scoped copies without changing Memory", () => {
  const manager = createManager({
    ids: ["user-1", "project-1", "atlas-1"],
    timestamps: [CREATED_AT, CREATED_AT, CREATED_AT]
  });

  manager.create({
    type: MEMORY_TYPES.USER,
    data: { preferences: { language: "zh-CN" } }
  });
  manager.create({
    type: MEMORY_TYPES.PROJECT,
    data: { title: "Campus sustainability project", stage: "Explore" }
  });
  manager.create({
    type: MEMORY_TYPES.ATLAS,
    data: {
      atlasId: "project-atlas",
      version: "0.1.1",
      capabilities: ["project analysis"]
    }
  });

  const beforeCount = manager.list().length;
  const context = manager.retrieveContext({
    userId: "user-1",
    projectId: "project-1",
    atlasId: "project-atlas"
  });

  context.projectMemory[0].data.title = "changed outside the Store";

  assert.equal(context.userMemory.length, 1);
  assert.equal(context.projectMemory.length, 1);
  assert.equal(context.atlasMemory.length, 1);
  assert.equal(
    manager.retrieve("project-1").data.title,
    "Campus sustainability project"
  );
  assert.equal(manager.list().length, beforeCount);
});

test("manager validates types, sensitive fields, and missing updates", () => {
  const manager = createManager();

  assert.throws(
    () =>
      manager.create({
        type: "unknown",
        data: {}
      }),
    MemoryValidationError
  );
  assert.throws(
    () =>
      manager.create({
        type: MEMORY_TYPES.USER,
        data: {
          preferences: {
            apiKey: "must-not-be-stored"
          }
        }
      }),
    MemoryValidationError
  );
  assert.throws(
    () => manager.update("missing-memory", {}),
    /Memory not found/
  );
});

test("remove deletes a Memory record", () => {
  const manager = createManager();
  const memory = manager.create({
    type: MEMORY_TYPES.USER,
    data: { preferences: {} }
  });

  assert.equal(manager.remove(memory.id), true);
  assert.equal(manager.retrieve(memory.id), null);
  assert.equal(manager.remove(memory.id), false);
});
