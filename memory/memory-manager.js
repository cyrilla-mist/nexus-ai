import {
  createMemoryRecord,
  MEMORY_TYPES,
  updateMemoryRecord
} from "./schema.js";
import {
  MemoryNotFoundError,
  MemoryStore
} from "./memory-store.js";

function defaultIdGenerator() {
  return globalThis.crypto.randomUUID();
}

function defaultClock() {
  return new Date().toISOString();
}

export class MemoryManager {
  constructor({
    store = new MemoryStore(),
    idGenerator = defaultIdGenerator,
    clock = defaultClock
  } = {}) {
    if (
      !store ||
      typeof store.createMemory !== "function" ||
      typeof store.getMemory !== "function" ||
      typeof store.updateMemory !== "function" ||
      typeof store.listMemory !== "function" ||
      typeof store.removeMemory !== "function"
    ) {
      throw new TypeError("MemoryManager requires a compatible Memory store.");
    }

    if (typeof idGenerator !== "function") {
      throw new TypeError("idGenerator must be a function.");
    }

    if (typeof clock !== "function") {
      throw new TypeError("clock must be a function.");
    }

    this.store = store;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  create({ id = this.idGenerator(), type, data = {} } = {}) {
    return this.store.createMemory(
      createMemoryRecord({
        id,
        type,
        data,
        timestamp: this.clock()
      })
    );
  }

  retrieve(id) {
    return this.store.getMemory(id);
  }

  retrieveContext({ projectId, userId, atlasId } = {}) {
    const selectById = (id, type) => {
      if (typeof id !== "string" || !id.trim()) {
        return [];
      }

      const memory = this.store.getMemory(id.trim());
      return memory?.type === type ? [memory] : [];
    };

    const atlasMemory =
      typeof atlasId === "string" && atlasId.trim()
        ? this.store
            .listMemory(MEMORY_TYPES.ATLAS)
            .filter((memory) => memory.data.atlasId === atlasId.trim())
        : [];

    return {
      userMemory: selectById(userId, MEMORY_TYPES.USER),
      projectMemory: selectById(projectId, MEMORY_TYPES.PROJECT),
      atlasMemory
    };
  }

  update(id, data) {
    const current = this.store.getMemory(id);

    if (!current) {
      throw new MemoryNotFoundError(id);
    }

    const updated = updateMemoryRecord(current, data, this.clock());
    return this.store.updateMemory(id, updated);
  }

  list(type) {
    return this.store.listMemory(type);
  }

  remove(id) {
    return this.store.removeMemory(id);
  }
}
