# Nexus Atlas 产品讲解手册

> 适用对象：项目作者、评委、合作成员和第一次打开公开演示的用户。
>
> 当前版本：Nexus Atlas v0.1 Public Demo（2026-08-02）

## 1. 一句话理解 Nexus Atlas

Nexus Atlas 是一个用于恢复项目上下文、追踪证据与决策关系、继续复杂工作的个人智能基础设施。

它不是普通聊天机器人，也不是单纯的任务管理页面。它更关注四个问题：

1. 我现在正在做什么？
2. 我离开项目后发生了什么？
3. 哪些旧决定仍然有效，哪些证据已经过时？
4. 下一步应该先做什么，哪些操作必须由人确认？

当前公开演示以 **衡准 · Verity** 为完整场景。

---

## 2. Nexus Atlas 解决的实际问题

复杂项目的信息通常散落在聊天记录、Notion、GitHub、文档、数据平台和个人记忆中。项目暂停几天或几周后，用户往往需要重新翻找资料，才能回答：

- 上次做到哪里？
- 为什么当时选择这条路线？
- 哪些数据还可信？
- AI 的旧建议是否已经被人工决定替代？
- 现在最重要的行动是什么？

Nexus Atlas 的目标不是再增加一个信息入口，而是把项目的**背景、证据、记忆、决定和行动**重新连接起来。

核心流程：

```text
恢复上下文
→ 查看关系
→ 识别过时或冲突内容
→ 保留仍有效的决定
→ 生成下一步行动
→ 对重要外部修改进行人工确认
```

---

## 3. 产品的五层 Context

Nexus Atlas 将项目上下文分为五类：

| Context | 中文理解 | 主要回答的问题 |
|---|---|---|
| Identity Context | 身份与长期方向 | 我是谁，我长期想成为什么样的人？ |
| Knowledge Context | 知识与资料 | 我掌握了什么材料、研究和外部知识？ |
| Memory Context | 历史与经历 | 过去发生了什么，哪些内容仍然有效？ |
| Decision Context | 决策与取舍 | 为什么这样选择，哪些路线已被确认？ |
| Action Context | 目标与执行 | 下一步应该做什么？ |

这五层不是五个互相隔离的数据库，而是同一个 Context Graph 中不同类型的节点和关系。

---

## 4. 公开入口

- Landing：`https://cyrilla-mist.github.io/nexus-ai/`
- Atlas：`https://cyrilla-mist.github.io/nexus-ai/atlas.html`
- Continuity fixture demo：`https://cyrilla-mist.github.io/nexus-ai/reentry.html?source=fixture&scenario=verity`

公开 GitHub Pages 使用 fixture 场景。Live DataHub、MCP 与真实 mutation 需要本地 Runtime。

---

# 5. 页面结构总览

进入 Atlas 后，可以把整个页面理解为一个工作室：

```text
顶部：切换观察方式，并查看当前数据来源
左侧：选择工作领域 Territory
中间：显示当前主要内容
右侧：查看选中对象的详细档案
底部：提供与当前页面相关的下一步操作
```

---

## 6. Landing Page

Landing Page 只负责说明产品定位并引导进入 Atlas。

### 页面文案

- **Nexus Atlas**：产品名称。
- **Personal Intelligence Infrastructure**：个人智能基础设施。
- **Connect ideas, create possibilities.**：连接想法，创造可能。
- **Enter Atlas**：进入主工作台。

### 核心说明

> Restore context. Trace decisions. Continue complex work with the evidence in view.

中文理解：

- 恢复项目背景；
- 追踪过去的决策；
- 在证据仍然可见的情况下继续复杂工作。

### 产品原则

> Context over chat · Human decision first

表示：

1. 不只依赖一次性聊天，而是保存可追踪的上下文；
2. AI 可以提出建议，但重要外部修改必须经过人工确认。

---

# 7. Atlas 顶部三个入口

## 7.1 Desk · Overview

Desk 是总控台，也是打开 Atlas 后默认看到的页面。

它回答：

- 当前最需要继续的项目是什么？
- 项目上次何时活跃？
- 当前版本和里程碑是什么？
- 有多少上下文记录需要关注？

Desk 不展示全部细节，而是提供恢复工作所需的第一层摘要。

## 7.2 Map · Relations

Map 是 Context Graph 的关系视图。

它展示：

- 项目；
- 数据资产；
- 证据；
- 风险；
- 决策；
- 行动；
- 它们之间的依赖、生成和支持关系。

Map 中的线不是装饰。每一条线都对应 Verity 场景里已经记录的关系。

## 7.3 Workspace · Decisions

Workspace 是当前项目的工作区。

它集中展示：

- What changed：发生了什么变化；
- What remains valid：哪些决定仍然有效；
- What needs attention：哪些上下文需要处理；
- Restore context：进入更完整的项目恢复流程。

---

# 8. Territories

Territory 可以理解为对同一个 Context Graph 的不同观察角度。

| Territory | 中文理解 | 典型内容 |
|---|---|---|
| Innovation | 创新与产品 | 项目、产品、实验、AI 工具 |
| Learning | 学习 | 课程、技能、练习、语言学习 |
| Research | 研究 | 论文、文献、调研、证据 |
| Creation | 创作 | 写作、设计、演讲、发布 |
| Evaluation | 评估 | 标准、质检、评分、项目评审 |

当前 v0.1 中：

- Innovation 已接入完整 Verity 演示；
- Learning、Research、Creation、Evaluation 已定义结构，但尚未填充完整真实内容。

一个项目可以同时属于多个 Territory。例如 Verity 既是 Innovation 中的产品，也涉及 Evaluation 中的评审标准。

---

# 9. YOU ARE HERE 与 Context Path

页面会显示类似：

```text
Innovation / Verity / Desk
```

它表示：

- 当前 Territory：Innovation；
- 当前项目：Verity；
- 当前视图：Desk。

中间区域顶部还会显示：

```text
Nexus Atlas / Innovation / Verity / Desk
```

这条路径用于防止用户在多个相似页面之间迷失。

---

# 10. Context Sources

Context Sources 表示当前页面的数据来自哪里。

## Fixture

表示正在使用预先准备好的 Verity 演示数据。

公开 GitHub Pages 默认使用此模式。

## DataHub MCP · LIVE

表示当前页面通过本地 Bridge，从 DataHub 与 MCP 实时读取数据。

注意：

```text
LIVE READ ≠ MUTATION
```

LIVE 只代表实时读取，不代表系统已经修改 DataHub。

## Mutation

Mutation 指真正改变外部系统状态，例如给 Benchmark v1 增加 owner。

真实 mutation 只能在本地受控 Runtime 中执行，公开 Pages 不会执行。

---

# 11. Desk 页面详解

## 11.1 Needs Re-entry

Re-entry 不是重新登录，而是“重新进入项目状态”。

当用户隔了一段时间没有继续项目时，Atlas 会帮助恢复：

- 上次做到哪里；
- 后续发生了什么；
- 哪些决定仍然有效；
- 哪些证据已经过时；
- 下一步该做什么。

## 11.2 Last Active

项目最后一次有效活跃时间。

它来自 Context Scenario，不等同于 GitHub 最近提交时间。

## 11.3 Current Version

当前项目版本。

版本信息用于判断旧测试结果、旧样本和旧结论是否仍然适用。

## 11.4 Milestone

当前阶段的主要目标，例如 Benchmark validation。

Milestone 比普通待办事项更大，代表项目当前阶段的核心方向。

## 11.5 Context Attention

需要注意的上下文记录数量。

这些记录不一定都是错误，可能包括：

- 过时证据；
- 缺少负责人；
- 决策冲突；
- Agent 记忆冲突；
- 关系链缺失。

---

# 12. Desk 四类信号

## Meaningful Changes

用户上次离开后发生的关键变化。

不是所有日志，而是会影响继续工作的事件。

## Valid Decisions

过去已经确认、目前仍然有效的决定。

它帮助用户避免重复讨论已经解决的问题。

## Stale Evidence

曾经有效，但现在可能无法继续支撑当前判断的证据。

例如项目已更新到 v0.4.7，v0.4.6 的测试结果就可能需要重新验证。

## Broken Context

项目上下文链条中的缺口，例如：

- 缺少 owner；
- AI 记忆与人工决策冲突；
- 数据来源缺失；
- 某个决定找不到证据。

---

# 13. Map 页面详解

Map 分成四个区域：

## Governance

规则、标准、所有权和责任关系。

## Evidence

测试材料、校准记录和结果证据。

## Decisions

已经确认的项目路线和取舍。

## Actions

决定之后需要执行的任务。

### Verity 场景中的主要节点

| 节点 | 类型 | 含义 |
|---|---|---|
| 衡准 · Verity | Project | 整个项目 |
| Evaluation Rubric | Data Asset | 项目评审标准 |
| Test Materials | Data Asset | 用于测试的项目材料 |
| Benchmark v1 | Data Asset / Risk | 评审基准，目前缺少 owner |
| Calibration Context | Calibration Context | 分数校准过程 |
| Results v0.4.7 | Evidence | 当前版本测试结果 |
| Benchmark-first | Decision | 已确认的项目路线 |
| Build validation set | Action | 建设验证样本集 |

### 如何阅读箭头

箭头表示：

- 谁依赖谁；
- 谁生成谁；
- 谁支持谁；
- 哪个决定推动了哪个行动。

点击节点后，当前节点和相关节点会突出，无关内容会变淡。

---

# 14. Context Inspector

Context Inspector 是右侧档案查看器。

用户点击项目、数据、风险、证据、决定或行动后，它会显示：

- 对象类型；
- 名称和说明；
- 当前状态；
- 数据来源；
- 唯一 reference；
- 创建时间；
- 关系数量；
- 具体关联对象。

它的核心价值是 provenance，即说明：

> 这条信息来自哪里，又是如何形成的。

---

# 15. Action Tray

底部 Action Tray 会根据当前页面变化。

## Desk

- Resume Verity：继续项目；
- Review attention：查看需要关注的内容；
- Open map：打开关系图。

## Map

- Inspect selected：检查当前节点；
- View lineage：查看数据形成链；
- Open workspace：进入项目工作区。

## Workspace / Re-entry

- Continue：继续恢复项目；
- Verify：检查证据；
- Repair：查看上下文修复；
- Act：进入行动阶段。

这些按钮并不都代表真实外部写入。部分按钮只负责导航、展开详情或选择当前对象。

---

# 16. Continuity Workspace

Continuity Workspace 是更深入的项目恢复工具。

它包含四个连续步骤。

## 16.1 Re-entry Brief

项目恢复摘要，包括：

- 当前项目与状态；
- Continuity Score；
- 最近发生的变化；
- 当前最重要的问题；
- 下一步建议。

### Continuity Score

它不是项目质量分，也不是比赛评分。

它表示项目上下文当前的完整程度，可能受到以下因素影响：

- 过时证据；
- 缺失 owner；
- 冲突记录；
- 决策能否追溯；
- 下一步是否明确。

## 16.2 Evidence & Conflict

回答：当前判断依赖什么证据，哪里发生了冲突？

主要区域：

- Broken / Conflicting Context；
- Evidence Chain；
- Linked Decision；
- Signal Lens。

### Evidence Chain

证据链用于展示：

```text
评审标准
→ 测试材料
→ Benchmark
→ 校准过程
→ 测试结果
→ 项目决定
```

### Signal Lens

解释当前问题为什么重要、关联了多少证据、影响了哪个决定，以及推荐下一步。

## 16.3 Memory Ledger

Memory Ledger 是项目记忆账本，不是聊天记录。

记录被分为：

- Confirmed：仍然有效；
- Disputed：存在争议或冲突；
- Superseded / Stale：已被替代或过时。

它防止系统把所有历史信息都当成同样可信。

## 16.4 Decision & Action

将“已经决定的事情”和“下一步要做的事情”分开。

### Decision

记录：

- 决定是什么；
- 为什么作出决定；
- 当前是否仍有效；
- 来源是什么。

### Action

决定之后的执行事项，例如：

- Build the Benchmark v1 validation set；
- Re-run outdated v0.4.6 samples；
- Calibrate v1.0 scoring thresholds；
- Assign Benchmark v1 owner。

---

# 17. Review proposal 与 View details

## View details

用于普通建议。

点击后只展开：

- 为什么要做；
- 完成标准；
- 负责人；
- 当前状态。

不会调用 DataHub，不会执行外部写入。

## Review proposal

用于可能改变外部系统状态的治理操作。

在公开 fixture 模式中：

```text
Review proposal
→ 打开只读 Ownership proposal preview
→ 查看 operation、target、owner 和 verification contract
→ Close preview
```

公开预览中：

- fetch = 0；
- POST = 0；
- add_owners = 0；
- 不连接 DataHub；
- 没有真实确认按钮。

在本地 Live DataHub 模式中，流程才是：

```text
GET proposal
→ Confirmation Sheet
→ 人工确认
→ POST
→ read-after-write verification
```

---

# 18. Ownership Proposal Preview

公开页面中的弹窗是安全预览。

## Operation

`add_owners`：准备给数据资产增加负责人。

## Target

Verity Benchmark v1 的 DataHub URN。

URN 可以理解为 DataHub 中该资产的唯一身份证号码。

## Current owners

当前负责人列表。公开 fixture 中显示 None。

## Proposed owner

计划添加的 DataHub CorpUser 或 CorpGroup。

## Verification contract

真实写入后，系统必须重新读取 DataHub，确认 owner 已经出现。

## Fixture safety notice

> No DataHub request or mutation will be performed.

表示公共页面只展示流程，不会执行真实修改。

---

# 19. Fixture、Live Read 与 Mutation 的区别

| 模式 | 数据来源 | 是否连接本地 Runtime | 是否读取 DataHub | 是否修改 DataHub |
|---|---|---:|---:|---:|
| Fixture | 预设 Verity 场景 | 否 | 否 | 否 |
| Live Read | DataHub + MCP + Read Bridge | 是 | 是 | 否 |
| Governed Mutation | Mutation Bridge + MCP `add_owners` | 是 | 是 | 仅在人工确认后 |

公开 GitHub Pages 属于 Fixture。

---

# 20. 当前哪些是真实能力，哪些仍是原型

## 已实现并验证

- Landing、Desk、Map、Workspace；
- Verity Context Scenario；
- 项目、证据、决定、行动的关系；
- Context Inspector；
- Evidence Chain；
- Memory Ledger；
- Recommended Actions；
- 安全的 fixture Proposal Preview；
- DataHub 只读 MCP Bridge；
- 本地 proposal → confirmation → mutation → re-read 合约；
- 桌面端与移动端响应式布局；
- 自动测试与安全边界检查。

## 当前主要是演示或尚未扩展

- 公开网页使用 fixture 数据；
- 只有 Verity 是完整场景；
- 其他四个 Territory 尚未填充完整个人数据；
- 普通推荐 action 暂时以查看详情为主；
- 公开页面无法访问用户电脑上的 localhost；
- 真实 `add_owners` 尚未执行；
- Outcome Write-back 尚未形成完整公开演示闭环。

---

# 21. 推荐演示路线

```text
Landing
→ Enter Atlas
→ Desk：发现 Verity 需要 Re-entry
→ Map：查看项目、证据、决定和行动关系
→ Workspace：查看变化、有效决定和风险
→ Restore context
→ Continuity Workspace
→ Decision & Action
→ Review proposal
→ 展示 Fixture Preview
→ Close preview
```

讲解重点：

1. Atlas 不只是存储信息，而是保存信息之间的关系；
2. 系统区分有效、冲突和过时的记忆；
3. AI 不直接修改外部数据；
4. 公共演示和真实 Runtime 的边界明确。

---

# 22. 页面术语表

| 英文术语 | 中文理解 | 在 Nexus Atlas 中的具体含义 |
|---|---|---|
| Atlas | 图谱工作台 | Nexus 的主要可视化与工作入口 |
| Context | 上下文 | 继续工作前需要知道的背景、关系与状态 |
| Context Graph | 上下文图谱 | 项目、资料、决定、记忆和行动组成的关系网络 |
| Territory | 工作领域 | 对同一 Context Graph 的不同观察视角 |
| Desk | 总控台 | 展示当前项目和需要关注的信号 |
| Map | 关系图 | 展示项目对象及其关系 |
| Workspace | 项目工作区 | 查看变化、决定和风险 |
| Re-entry | 重新进入项目状态 | 恢复中断项目所需的上下文 |
| Continuity | 连续性 | 项目能否在中断后继续推进 |
| Continuity Score | 上下文完整度 | 当前项目上下文的完整程度，不是质量评分 |
| Inspector | 档案查看器 | 查看选中对象的详细信息和来源 |
| Provenance | 来源追踪 | 信息从哪里来、如何形成 |
| Lineage | 数据血缘 | 数据经过哪些上游和下游关系形成 |
| Evidence | 证据 | 支撑判断、结果或决定的材料 |
| Evidence Chain | 证据链 | 从标准、材料到结果和决定的连续关系 |
| Decision | 决策 | 已经作出的路线选择或取舍 |
| Action | 行动 | 决策之后需要执行的事项 |
| Memory Ledger | 记忆账本 | 按有效、争议、过时分类的项目记忆 |
| Signal | 信号 | 系统识别出的变化、冲突、过时或缺口 |
| Stale | 过时 | 曾经有效，但现在可能不能继续使用 |
| Broken Context | 上下文缺口 | 缺少 owner、来源、关系或一致性 |
| Governance | 治理 | 对重要数据和外部修改进行规则约束 |
| Owner | 负责人 | 对某个 DataHub 资产负责的用户或用户组 |
| Proposal | 修改提案 | 执行前展示目标、旧值、新值和验证方式 |
| Fixture | 演示数据 | 不连接真实外部系统的固定场景 |
| Live Read | 实时读取 | 从 DataHub / MCP 读取真实状态，但不修改 |
| Mutation | 状态修改 | 改变外部系统中的真实数据 |
| MCP | Model Context Protocol | 让系统通过标准工具访问外部能力的协议 |
| DataHub | 数据目录与治理平台 | 保存 Verity 资产、owner 和 lineage |
| Bridge | 本地桥接服务 | 浏览器与本地 DataHub/MCP 之间的受控接口 |
| URN | 唯一资源标识 | DataHub 中资产或用户的唯一编号 |
| `add_owners` | 添加负责人操作 | 当前允许的受控 DataHub mutation |
| Read-after-write | 写后重读 | 修改后重新读取，确认真实状态已改变 |
| Human confirmation | 人工确认 | 重要外部修改前必须由人明确批准 |
| ContextRepairEvent | 上下文修复事件 | 修复成功并验证后记录的审计事件 |
| Recommended Action | 推荐行动 | 系统根据当前上下文提出的下一步建议 |
| View details | 查看详情 | 展开普通建议，不执行外部写入 |
| Review proposal | 查看提案 | 查看治理操作的目标、变化和验证方式 |

---

# 23. 常见误解

## “这是一个聊天机器人吗？”

不是。聊天可以成为未来的交互入口，但 Atlas 的核心是结构化上下文、关系、证据、决定和行动。

## “Map 是自动生成的思维导图吗？”

不是。当前 Map 中的节点和关系来自 canonical Verity scenario 与 DataHub lineage 合约。

## “LIVE 表示 AI 会直接修改 DataHub 吗？”

不是。LIVE 只表示实时读取。Mutation 需要独立 Bridge、明确 proposal 和人工确认。

## “Continuity Score 是 Verity 项目得分吗？”

不是。它表示项目上下文的完整程度。

## “Review proposal 已经修改 owner 了吗？”

公开 fixture 中没有。它只是只读预览。

## “五个 Territory 是五个数据库吗？”

不是。它们是同一 Context Graph 的五种观察视角。

---

# 24. 一页速记

```text
Landing：说明 Nexus Atlas 是什么
Desk：现在最值得关注什么
Map：信息之间如何连接
Workspace：发生了什么，哪些决定仍有效
Inspector：这条信息来自哪里
Re-entry：重新进入中断项目
Evidence：当前判断依赖什么
Memory：哪些历史仍可信
Decision：以前为什么这样选
Action：下一步做什么
Proposal：准备怎样修改
Human confirmation：真实外部操作由人最终决定
```

Nexus Atlas 的核心价值可以概括为：

> 当用户重新打开一个复杂项目时，不必重新翻遍聊天、文档和平台，而是由 Atlas 说明项目走到哪里、为什么走到这里、什么仍然可信，以及下一步应该做什么。
