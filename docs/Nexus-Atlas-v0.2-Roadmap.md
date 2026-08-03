# Nexus Atlas v0.2 — Personal Context Foundation

**Status:** Active
**Implementation:** Phase 1 in progress

## 1. Executive Summary

Nexus Atlas v0.1 已证明系统可以恢复中断项目的上下文：它能够围绕项目、变化、决定、证据、记忆、风险和行动生成可追踪的连续性视图，并把 DataHub 读桥与受治理的提案/确认/验证边界分开。

v0.2 的目标是建立用户拥有、可以验证、可以治理的个人上下文基础，使 Atlas 开始理解：

- 用户在当前上下文中的角色；
- 用户正在推进什么；
- 为什么作出某项决定；
- 哪些记忆仍然可信和有效；
- 哪些信息存在争议、过期或已经被替代；
- 下一步应该做什么。

v0.2 不是先导入更多数据，而是先建立可信的 Context Model、Provenance、Authority 和 Governance 规则。

## 2. v0.1 Baseline

以当前仓库资料和实现为准，v0.1 已形成以下基础：

- Atlas Landing、Desk、Map、Territory Workspace 和 Context Inspector；
- Re-entry / Continuity Workspace；
- Evidence Chain、Memory Ledger、Decision and Action；
- canonical project scenario 与 deterministic Continuity Provider；
- provider-neutral Context Package projection；
- DataHub read bridge，以及 governed proposal、confirmation、verification contract；
- fixture 与 live runtime 的明确边界；
- automated tests、Atlas source verification 和 Verity/DataHub 专项验证。

当前公开完整场景仍以 Verity 为主，Nexus 自身已有 continuity 场景但尚未成为 v0.2 的 canonical self-context package。Identity Context 尚未正式实现，个人项目数据仍主要依赖 deterministic scenario，一部分 Context 结构仍与现有场景绑定，Source Adapter 尚未通用化，Outcome Write-back 也尚未形成完整产品闭环。

## 3. v0.2 Product Goal

**Nexus Atlas v0.2 is a user-owned context foundation for maintaining identity, project, memory, decision, evidence, and action continuity.**

核心产品问题：

- Who am I in this context?
- What am I working on?
- What changed?
- Why was this decision made?
- What information is still trustworthy?
- What should happen next?

## 4. First Real Scenario

第一个长期真实场景是：**Nexus Atlas manages the development context of Nexus Atlas itself.**

该场景应能够回答当前长期仓库、产品阶段、v0.2 方向、优先建立 Personal Context Foundation 的原因、已确认的产品决定、已被替代的旧路线、当前风险、下一步、约束和明确不做事项。

## 5. v0.2 Scope

### Identity Context

current roles、long-term directions、capabilities、preferences、constraints。

### Project Context

purpose、current phase、current version、milestones、last active point、territories、risks、repositories and source references。

### Decision Context

question、selected option、rationale、supporting evidence、alternatives、constraints、status、supersession。

### Memory Context

confirmed、inferred、disputed、superseded、stale records。

### Evidence Context

claim、source、observation time、applicable version、verification method、result、freshness。

### Action Context

next action、owner、priority、completion criteria、related decision、external effect、confirmation requirement。

## 6. Delivery Phases

### Phase 0 — Model and Governance — Complete

建立 canonical Context model，分离 lifecycle、verification、freshness；定义 provenance contract、authority rules、privacy and inheritance rules，并提供 Nexus self-context example。

### Phase 1 — Self-Context Provider — In progress

实现 deterministic Nexus Atlas self-context provider 和 Context Package projection，补充可复用测试，不重设计 UI。

#### Phase 1 Implementation Note

本阶段实现 canonical graph validation、deterministic package projection 和 self-context fixture provider；不接入 UI，不接入 live source，不执行 external mutation。现有 v0.1 Continuity Builder 与 Fixture Provider 保持不变。

### Phase 2 — Generalized Decision and Memory — Planned

推广 Decision Record、Memory Record、冲突和 supersession 行为，以及可复用的 ledger projection。

### Phase 3 — Context Package — Planned

生成包含 identity snapshot、project state、valid decisions、current evidence、disputed context、stale context、risks、next actions 和 omitted context 的 deterministic Context Package。

### Phase 4 — First Source Adapter — Planned

优先评估 GitHub Adapter，仅读取 repository metadata、commits、issues and pull request references、release and version context。GitHub 只对其可验证的仓库状态具有权威，不是用户身份、偏好和全部决策的权威来源。

### Phase 5 — Product Surface — Planned

待底层模型稳定后再决定 Identity view、generalized project selector、personal Context Inspector、source controls 和 capture/confirmation flow。

## 7. Explicit Non-Goals

v0.2 暂不做：多用户协作平台、全量 Notion 同步、全量 Google Drive 导入、自动读取全部聊天记录、自动把推断写成用户事实、autonomous external mutation、多 Agent 自主执行、向量数据库优先重构、同时完成全部 Territory、大规模 UI 重设计，或用单一外部系统存储完整私人 Context Graph。

## 8. Acceptance Criteria

- Nexus Atlas 自身成为 canonical project scenario；
- 系统可以生成 deterministic Context Package；
- Identity、Project、Decision、Memory、Evidence、Risk 和 Action 明确区分；
- 每条关键记录有 provenance；
- lifecycle、verification、freshness 不共用一个 status 字段；
- confirmed 不等于 current，stale 不等于 false，inferred 不等于 confirmed；
- disputed 记录不能静默覆盖 confirmed 决定；
- superseded 决定不再作为当前路线继承；
- inferred Identity 不会被当作用户确认事实；
- stale evidence 不会默认进入 current evidence；
- external-effect action 明确标记 requiresConfirmation；
- fixture 与 live source 边界不被削弱；
- 原有测试全部继续通过；
- 不破坏 v0.1 页面和运行时。

## 9. v0.3 Direction

后续方向仅包括 multiple real projects、additional source adapters、user-controlled context capture、outcome write-back、cross-territory views 和 richer agent assistance；这些不是 v0.2 已承诺功能。
