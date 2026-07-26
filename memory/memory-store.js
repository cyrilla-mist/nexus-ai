import {
  assertMemoryType,
  validateMemoryRecord
} from "./schema.js";

export class MemoryConflictError extends Error {
  constructor(id) {
    super(`Memory already exists: ${id}`);
    this.name = "MemoryConflictError";
  }
}

export class MemoryNotFoundError extends Error {
  constructor(id) {
    super(`Memory not found: ${id}`);
    this.name = "MemoryNotFoundError";
  }
}

function assertMemoryId(id) {
  if (typeof id !== "string" || !id.trim()) {
    throw new TypeError("Memory id must be a non-empty string.");
  }

  return id.trim();
}

function cloneRecord(record) {
  return structuredClone(record);
}

export class MemoryStore {
  #records = new Map();

  createMemory(memory) {
    const record = validateMemoryRecord(memory);

    if (this.#records.has(record.id)) {
      throw new MemoryConflictError(record.id);
    }

    this.#records.set(record.id, cloneRecord(record));
    return cloneRecord(record);
  }

  getMemory(id) {
    const normalizedId = assertMemoryId(id);
    const record = this.#records.get(normalizedId);

    return record ? cloneRecord(record) : null;
  }

  updateMemory(id, memory) {
    const normalizedId = assertMemoryId(id);

    if (!this.#records.has(normalizedId)) {
      throw new MemoryNotFoundError(normalizedId);
    }

    const record = validateMemoryRecord({
      ...memory,
      id: normalizedId
    });

    this.#records.set(normalizedId, cloneRecord(record));
    return cloneRecord(record);
  }

  listMemory(type) {
    if (type !== undefined) {
      assertMemoryType(type);
    }

    return [...this.#records.values()]
      .filter((record) => type === undefined || record.type === type)
      .map(cloneRecord);
  }

  removeMemory(id) {
    return this.#records.delete(assertMemoryId(id));
  }
}
