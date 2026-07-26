import {
  createMemoryRecord,
  MEMORY_TYPES,
  updateMemoryRecord
} from "./schema.js";
import {
  MemoryNotFoundError,
  MemoryStore
} from "./memory-store.js";
import { evaluateMemoryCandidate } from "./memory-policy.js";

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

  updateMemoryFromCandidate(candidate) {
    const policy = evaluateMemoryCandidate(candidate);

    if (!policy.allowed) {
      return {
        updated: false,
        policy,
        memory: null
      };
    }

    const current = this.store.getMemory(candidate.recordId);

    if (!current) {
      throw new MemoryNotFoundError(candidate.recordId);
    }

    if (current.type !== MEMORY_TYPES.PROJECT) {
      throw new TypeError(
        "Memory Update Foundation only supports Project Memory."
      );
    }

    const history = Array.isArray(current.data.history)
      ? current.data.history
      : [];
    const alreadyApplied = history.some(
      (entry) => entry?.candidateId === candidate.candidateId
    );

    if (alreadyApplied) {
      return {
        updated: false,
        policy: {
          allowed: true,
          reason: "candidate_already_applied"
        },
        memory: current
      };
    }

    const historyEntry = {
      candidateId: candidate.candidateId,
      category: candidate.category,
      content: structuredClone(candidate.content),
      source: candidate.source,
      createdAt: candidate.createdAt ?? this.clock()
    };
    const dataPatch = {
      history: [...history, historyEntry]
    };

    if (candidate.category === "decision") {
      const content = candidate.content;
      const question =
        typeof content === "object" && content
          ? String(content.question ?? "").trim()
          : "";
      const answer =
        typeof content === "string"
          ? content.trim()
          : String(content.answer ?? content.statement ?? "").trim();

      dataPatch.decisions = [
        ...current.data.decisions,
        {
          candidateId: candidate.candidateId,
          question,
          answer,
          source: candidate.source,
          createdAt: historyEntry.createdAt
        }
      ];
    }

    if (candidate.category === "stage_change") {
      dataPatch.stage = String(candidate.content.to ?? "").trim();
    }

    if (candidate.category === "progress") {
      const kind = String(candidate.content.kind ?? "").trim();
      const summary = String(candidate.content.summary ?? "").trim();

      dataPatch.progress = current.data.progress.includes(summary)
        ? current.data.progress
        : [...current.data.progress, summary];

      if (kind === "stage_change") {
        dataPatch.stage = String(candidate.content.to ?? "").trim();
      }

      if (kind === "milestone_completed") {
        const milestoneTitle = String(
          candidate.content.title ?? ""
        ).trim();

        dataPatch.milestones = current.data.milestones.includes(
          milestoneTitle
        )
          ? current.data.milestones
          : [...current.data.milestones, milestoneTitle];
      }
    }

    const memory = this.update(candidate.recordId, dataPatch);

    return {
      updated: true,
      policy,
      memory
    };
  }

  list(type) {
    return this.store.listMemory(type);
  }

  remove(id) {
    return this.store.removeMemory(id);
  }
}
