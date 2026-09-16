CREATE TABLE IF NOT EXISTS nexus_writeback_outcomes_v01 (
  project_ref TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  outcome_digest TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  PRIMARY KEY (project_ref, outcome_id)
);

CREATE TABLE IF NOT EXISTS nexus_writeback_outcome_receipts_v01 (
  project_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  outcome_digest TEXT NOT NULL,
  PRIMARY KEY (project_ref, idempotency_key)
);

CREATE TABLE IF NOT EXISTS nexus_writeback_checkpoints_v01 (
  project_ref TEXT NOT NULL,
  version INTEGER NOT NULL,
  checkpoint_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  checkpoint_digest TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (project_ref, version),
  UNIQUE (project_ref, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS nexus_writeback_checkpoint_receipts_v01 (
  project_ref TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  checkpoint_digest TEXT NOT NULL,
  PRIMARY KEY (project_ref, idempotency_key)
);
