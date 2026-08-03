# Nexus Atlas v0.2 — Canonical Context Model

**Status:** Proposed  
**Implementation:** Not started

## 1. ContextNode

```js
{
  id, kind, title, summary,
  scope: { userId, territoryId, projectId },
  lifecycle: { state, createdAt, updatedAt, validFrom, validUntil },
  epistemic: { verification, confidence, freshness },
  provenance: { provider, reference, capturedAt, retrievalMode, authority },
  governance: { sensitivity, inheritance, requiresConfirmation },
  payload
}
```

`id` 是稳定标识；`kind` 是 canonical 语义类型，不是页面组件。`title` 和 `summary` 是可读索引，`payload` 承载该 kind 的结构化内容。`scope` 限定记录适用的用户、Territory 和项目。

`lifecycle` 描述记录是否仍在其生命周期中；`epistemic.verification` 描述知识状态，`confidence` 描述不确定程度，`freshness` 描述对当前时间和版本的适用性。三者职责不同，不得合并为一个 status。`provenance` 说明来源、引用、采集时间、读取方式和该来源的 authority。`governance` 控制敏感性、继承范围和是否需要确认。

## 2. Context Kind

最小枚举：`identity`、`project`、`goal`、`milestone`、`event`、`decision`、`evidence`、`memory`、`risk`、`action`、`source`。不要按照页面组件创建 node type。

## 3. Lifecycle State

`active`、`completed`、`archived`、`superseded`、`revoked`。

## 4. Verification State

`confirmed`、`inferred`、`unverified`、`disputed`。

## 5. Freshness State

`current`、`stale`、`expired`、`unknown`。

`confirmed` 不代表 `current`；`stale` 不代表 false；`inferred` 不代表错误；`disputed` 不得静默覆盖 confirmed；`superseded` 不再作为当前状态继承。

## 6. ContextEdge

```js
{
  id,
  from,
  to,
  type,
  lifecycle: {
    state,
    createdAt,
    updatedAt
  },
  provenance,
  metadata
}
```

Edge lifecycle state 的最小枚举为 `active`、`superseded`、`revoked`。它只描述关系本身是否仍有效，不替代节点的 verification 或 freshness。一条 `supports` 关系可以被撤销，但相关节点仍然存在。

最小关系：`belongs_to`、`supports`、`contradicts`、`supersedes`、`depends_on`、`produces`、`motivates`、`implements`、`blocks`、`assigned_to`、`derived_from`。Edge 也必须保留来源。

## 7. Identity Record

Identity 不是一个不可追踪的大型 Profile JSON。每项信息都是独立、可确认、可撤销、可过期的记录，类别为 `role`、`direction`、`capability`、`preference`、`constraint`。

用户明确表达的 Identity 可以是 confirmed；系统推断只能是 inferred，不能自动升级。高敏感信息默认不继承；记录必须支持 archived 或 revoked；不得根据单次行为永久推断身份或偏好。

## 8. Project Record

```js
{
  purpose,
  currentPhase,
  currentVersion,
  currentMilestoneId,
  territoryIds,
  lastActiveAt,
  repositoryRefs
}
```

Project 当前状态由顶层 `lifecycle.state`、`epistemic.verification` 和 `epistemic.freshness` 共同表达，Project payload 不再使用笼统的 `status`。

## 9. Decision Record

```js
{ question, choice, rationale, evidenceRefs, alternatives, constraints,
  decidedAt, decidedBy, decisionStatus, supersededBy }
```

`decisionStatus` 为 `proposed`、`confirmed`、`superseded`、`revoked`。更新时间较晚不能单独覆盖 confirmed 决定；替代必须有明确 supersedes 关系或确认依据。

## 10. Memory Record

```js
{ statement, basis, relatedEntityRefs, verification, confidence,
  freshness, conflictsWith, supersededBy }
```

Memory 不是聊天全文，而是经过来源、状态、适用范围和治理处理的上下文记录。

## 11. Evidence Record

```js
{ claim, sourceRef, observedAt, appliesToVersion,
  verificationMethod, result }
```

`appliesToVersion` 与当前版本不匹配时必须重新判断 freshness。stale evidence 可以保留历史价值，但不得默认支持当前决定。

## 12. Action Record

```js
{ description, owner, priority, actionStatus, completionCriteria,
  relatedDecisionRefs, externalEffect, requiresConfirmation }
```

`actionStatus` 为 `proposed`、`ready`、`blocked`、`in_progress`、`completed`、`cancelled`。有 external effect 的 action 必须明确 `requiresConfirmation`。

通用状态与领域状态必须分离：`lifecycle.state` 描述记录是否 active、completed、archived、superseded 或 revoked；`epistemic.verification` 描述知识是否 confirmed、inferred、unverified 或 disputed；`epistemic.freshness` 描述信息是否 current、stale、expired 或 unknown。`decisionStatus` 和 `actionStatus` 是 payload 内的领域状态，不得替代 ContextNode 的 lifecycle、verification 或 freshness。

## 13. ContextPackage

```js
{ packageId, generatedAt, project, identitySnapshot, activeGoals,
  confirmedDecisions, currentEvidence, disputedContext, staleContext,
  openRisks, nextActions, omittedContext, sourceSummary }
```

ContextPackage 是继续工作时的安全投影，不是完整数据库导出。它只继承当前相关且允许继承的上下文；inferred、disputed、stale 必须显式标记，`omittedContext` 说明未继承内容及原因。restricted 默认不进入 package。package 应由 deterministic rules 生成；AI 可以解释它，但不能自由决定事实是否被继承。

## 14. Authority Rules

不设计单一绝对排序。显式 human confirmation 对个人偏好和个人决定具有最高权威；external system 仅对其自身可验证状态具有权威；timestamp 与 version applicability 影响 freshness；AI inference 只能作为 inferred context。更新时间更晚不能单独覆盖 confirmed 决定，冲突必须显式保存，supersession 必须有明确关系或确认依据。

## 15. Privacy and Sensitivity

敏感级别：`public`、`personal`、`sensitive`、`restricted`。继承策略：`always`、`project_only`、`explicit_only`、`never`。

restricted 默认不得进入 ContextPackage；explicit_only 必须由用户明确选择；公共页面不得展示 personal、sensitive 或 restricted；source adapter 只能读取用户授权的最小范围；provenance 不得包含 Token、API Key 或私人本地路径。

## 16. Migration from v0.1

## 17. Phase 2 Decision Extension

Decision nodes retain the v0.2 lifecycle, epistemic, provenance, and governance fields and add stable `payload.subjectKey`, `payload.scopeKey`, and `payload.evidenceRefs`. An active `supersedes` edge has a fixed old-record-to-new-record direction: the predecessor is `from` and the successor is `to`. Decision history is represented by deterministic `decisionChains`; historical Decisions are never placed in `historicalMemories` or treated as current decisions.

## 18. Phase 2 Memory Extension

Memory nodes use the same separated lifecycle, verification, and freshness model and add `payload.subjectKey`, `payload.scopeKey`, `payload.memoryStatus`, `payload.conflictsWith`, `payload.supersededBy`, and `payload.relatedEntityRefs` as applicable. Memory supersession is same-kind only. A Decision cannot supersede a Memory, and a Memory cannot supersede a Decision. Historical, inferred, and disputed Memory records remain explicitly classified.

## 19. Self-Context Integration Boundary

The Self-Context Provider validates the canonical graph, generates a deterministic Decision / Memory Ledger, and supplies that Ledger to the Context Package projector. The Ledger is derived governance output and is not written back to the canonical graph. The projector uses Ledger effective Decisions and Memory classifications while preserving the existing ContextPackage shape; it does not add a Ledger section. Phase 3 may generalize package sections, but that work is not implemented here.

渐进兼容映射为：`project` → project ContextNode；`decisions` → decision；`risks` → risk；`evidence` → evidence；`tasks / actions` → action；relationships → ContextEdge。expected findings 是 derived projection，不是 canonical truth。本轮不重写现有运行时，只定义后续迁移策略。
