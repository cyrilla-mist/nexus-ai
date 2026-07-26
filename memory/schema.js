export const MEMORY_TYPES = Object.freeze({
  USER: "user",
  PROJECT: "project",
  ATLAS: "atlas"
});

const ALLOWED_DATA_FIELDS = Object.freeze({
  [MEMORY_TYPES.USER]: new Set(["preferences"]),
  [MEMORY_TYPES.PROJECT]: new Set([
    "title",
    "stage",
    "history",
    "decisions",
    "nextActions",
    "milestones",
    "progress"
  ]),
  [MEMORY_TYPES.ATLAS]: new Set([
    "atlasId",
    "version",
    "capabilities"
  ])
});

const SENSITIVE_FIELD_NAMES = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "email",
  "phone",
  "address",
  "governmentid"
]);

export class MemoryValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MemoryValidationError";
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneValue(value) {
  return structuredClone(value);
}

function normalizeFieldName(value) {
  return String(value).replace(/[_-]/g, "").toLowerCase();
}

function assertNoSensitiveFields(value, path = "data") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoSensitiveFields(item, `${path}[${index}]`);
    });
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (SENSITIVE_FIELD_NAMES.has(normalizeFieldName(key))) {
      throw new MemoryValidationError(
        `Sensitive field is not allowed in Memory: ${path}.${key}`
      );
    }

    assertNoSensitiveFields(nestedValue, `${path}.${key}`);
  });
}

function assertString(value, fieldName) {
  if (typeof value !== "string") {
    throw new MemoryValidationError(`${fieldName} must be a string.`);
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new MemoryValidationError(`${fieldName} must be an array.`);
  }
}

function assertTimestamp(value, fieldName) {
  assertString(value, fieldName);

  if (!value || Number.isNaN(Date.parse(value))) {
    throw new MemoryValidationError(
      `${fieldName} must be a valid ISO timestamp.`
    );
  }
}

function assertAllowedDataFields(type, data) {
  const allowedFields = ALLOWED_DATA_FIELDS[type];

  Object.keys(data).forEach((field) => {
    if (!allowedFields.has(field)) {
      throw new MemoryValidationError(
        `Unsupported ${type} Memory field: data.${field}`
      );
    }
  });
}

export function assertMemoryType(type) {
  if (!Object.values(MEMORY_TYPES).includes(type)) {
    throw new MemoryValidationError(`Unsupported Memory type: ${type}`);
  }
}

export function normalizeMemoryData(type, data = {}) {
  assertMemoryType(type);

  if (!isPlainObject(data)) {
    throw new MemoryValidationError("Memory data must be a plain object.");
  }

  assertAllowedDataFields(type, data);
  assertNoSensitiveFields(data);

  switch (type) {
    case MEMORY_TYPES.USER: {
      const preferences = data.preferences ?? {};

      if (!isPlainObject(preferences)) {
        throw new MemoryValidationError(
          "data.preferences must be a plain object."
        );
      }

      return {
        preferences: cloneValue(preferences)
      };
    }
    case MEMORY_TYPES.PROJECT: {
      const project = {
        title: data.title ?? "",
        stage: data.stage ?? "",
        history: data.history ?? [],
        decisions: data.decisions ?? [],
        nextActions: data.nextActions ?? [],
        milestones: data.milestones ?? [],
        progress: data.progress ?? []
      };

      assertString(project.title, "data.title");
      assertString(project.stage, "data.stage");
      assertArray(project.history, "data.history");
      assertArray(project.decisions, "data.decisions");
      assertArray(project.nextActions, "data.nextActions");
      assertArray(project.milestones, "data.milestones");
      assertArray(project.progress, "data.progress");

      if (!project.milestones.every((item) => typeof item === "string")) {
        throw new MemoryValidationError(
          "data.milestones must contain only strings."
        );
      }

      if (!project.progress.every((item) => typeof item === "string")) {
        throw new MemoryValidationError(
          "data.progress must contain only strings."
        );
      }

      return cloneValue(project);
    }
    case MEMORY_TYPES.ATLAS: {
      const atlas = {
        atlasId: data.atlasId ?? "",
        version: data.version ?? "",
        capabilities: data.capabilities ?? []
      };

      assertString(atlas.atlasId, "data.atlasId");
      assertString(atlas.version, "data.version");
      assertArray(atlas.capabilities, "data.capabilities");

      if (!atlas.capabilities.every((item) => typeof item === "string")) {
        throw new MemoryValidationError(
          "data.capabilities must contain only strings."
        );
      }

      return cloneValue(atlas);
    }
    default:
      throw new MemoryValidationError(`Unsupported Memory type: ${type}`);
  }
}

export function createMemoryRecord({
  id,
  type,
  data = {},
  timestamp = new Date().toISOString()
}) {
  assertString(id, "id");

  if (!id.trim()) {
    throw new MemoryValidationError("id must not be empty.");
  }

  assertTimestamp(timestamp, "timestamp");

  return {
    id: id.trim(),
    type,
    data: normalizeMemoryData(type, data),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function validateMemoryRecord(record) {
  if (!isPlainObject(record)) {
    throw new MemoryValidationError("Memory record must be a plain object.");
  }

  assertString(record.id, "id");

  if (!record.id.trim()) {
    throw new MemoryValidationError("id must not be empty.");
  }

  assertMemoryType(record.type);
  assertTimestamp(record.createdAt, "createdAt");
  assertTimestamp(record.updatedAt, "updatedAt");

  return {
    id: record.id.trim(),
    type: record.type,
    data: normalizeMemoryData(record.type, record.data),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function updateMemoryRecord(
  record,
  dataPatch,
  timestamp = new Date().toISOString()
) {
  const current = validateMemoryRecord(record);

  if (!isPlainObject(dataPatch)) {
    throw new MemoryValidationError(
      "Memory update data must be a plain object."
    );
  }

  assertTimestamp(timestamp, "timestamp");

  return {
    ...current,
    data: normalizeMemoryData(current.type, {
      ...current.data,
      ...dataPatch
    }),
    updatedAt: timestamp
  };
}
