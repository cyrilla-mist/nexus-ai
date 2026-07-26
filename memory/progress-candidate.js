import { PROJECT_STAGES } from "../execution/project-state.js";

function stableHash(value) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function canonicalStage(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  return (
    PROJECT_STAGES.find((stage) => stage.toLowerCase() === normalized) ?? ""
  );
}

function createCandidate({
  projectId,
  kind,
  identity,
  content,
  turn,
  createdAt
}) {
  return {
    candidateId:
      `${projectId}:progress:${kind}:turn-${turn}:` +
      stableHash(identity),
    recordId: projectId,
    type: "project",
    category: "progress",
    content: {
      kind,
      ...content
    },
    confidence: "high",
    source: "execution_confirmed",
    evidence: [
      {
        kind: "execution_progress",
        reference: `turn-${turn}`
      }
    ],
    turn,
    createdAt
  };
}

export function createProgressMemoryCandidates({
  projectId,
  progressReflection,
  currentProjectMemory,
  turn = 1,
  clock = () => new Date().toISOString()
} = {}) {
  const normalizedProjectId = String(projectId ?? "").trim();

  if (
    !normalizedProjectId ||
    progressReflection?.passed !== true ||
    progressReflection?.skipped === true ||
    !progressReflection.progress
  ) {
    return [];
  }

  const progress = progressReflection.progress;
  const normalizedTurn = Math.max(1, Number.parseInt(turn, 10) || 1);
  const createdAt = clock();
  const candidates = [];
  const previousStage = canonicalStage(
    currentProjectMemory?.data?.stage
  );
  const nextStage = canonicalStage(progress.stage);

  if (nextStage && nextStage !== previousStage) {
    candidates.push(
      createCandidate({
        projectId: normalizedProjectId,
        kind: "stage_change",
        identity: `${previousStage}\n${nextStage}`,
        content: {
          from: previousStage,
          to: nextStage,
          summary: `项目进入 ${nextStage} 阶段`
        },
        turn: normalizedTurn,
        createdAt
      })
    );
  }

  if (progress.milestone?.status === "completed") {
    candidates.push(
      createCandidate({
        projectId: normalizedProjectId,
        kind: "milestone_completed",
        identity:
          progress.milestone.id || progress.milestone.title,
        content: {
          milestoneId: progress.milestone.id,
          title: progress.milestone.title,
          summary: `完成里程碑：${progress.milestone.title}`
        },
        turn: normalizedTurn,
        createdAt
      })
    );
  }

  progress.tasks
    .filter((task) => task.status === "completed")
    .forEach((task) => {
      candidates.push(
        createCandidate({
          projectId: normalizedProjectId,
          kind: "task_completed",
          identity: task.id || task.title,
          content: {
            taskId: task.id,
            title: task.title,
            criteria: task.criteria,
            summary: `完成关键任务：${task.title}`
          },
          turn: normalizedTurn,
          createdAt
        })
      );
    });

  return candidates;
}
