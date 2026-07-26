const NODE_LABELS = Object.freeze({
  project: "项目",
  problem: "问题",
  decision: "决策",
  milestone: "里程碑",
  task: "任务",
  progress: "进展"
});

const RELATION_LABELS = Object.freeze({
  addresses: "解决",
  supports: "支持",
  contains: "包含",
  updates: "更新"
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayText(value, fallback = "未提供") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function normalizeMap(contextMap) {
  const map = isPlainObject(contextMap) ? contextMap : {};

  return {
    nodes: Array.isArray(map.nodes) ? map.nodes : [],
    edges: Array.isArray(map.edges) ? map.edges : []
  };
}

function nodeLabel(type) {
  return NODE_LABELS[type] ?? "上下文";
}

function renderNode(node, selected = false) {
  const normalized = isPlainObject(node) ? node : {};
  const type = displayText(normalized.type, "context");
  const status = String(normalized.status ?? "").trim();

  return `
    <button
      class="context-map-node"
      type="button"
      data-context-node-id="${escapeHtml(normalized.id)}"
      data-node-type="${escapeHtml(type)}"
      aria-pressed="${selected}"
      aria-controls="context-map-detail"
    >
      <span class="context-node-type">${escapeHtml(nodeLabel(type))}</span>
      <strong>${escapeHtml(displayText(normalized.title, "未命名节点"))}</strong>
      ${
        status
          ? `<span class="context-node-status">${escapeHtml(status)}</span>`
          : ""
      }
    </button>
  `;
}

export function renderContextNodeDetail(node = {}) {
  const normalized = isPlainObject(node) ? node : {};
  const type = displayText(normalized.type, "context");
  const content = displayText(
    normalized.summary ??
      normalized.reason ??
      normalized.criteria ??
      normalized.time ??
      normalized.title
  );

  return `
    <p class="section-kicker">Node Detail</p>
    <h4>${escapeHtml(displayText(normalized.title, "未选择节点"))}</h4>
    <dl class="context-node-detail-list">
      <div><dt>类型</dt><dd>${escapeHtml(nodeLabel(type))}</dd></div>
      <div><dt>内容</dt><dd>${escapeHtml(content)}</dd></div>
      <div><dt>来源</dt><dd>${escapeHtml(normalized.source)}</dd></div>
      ${
        normalized.status
          ? `<div><dt>状态</dt><dd>${escapeHtml(normalized.status)}</dd></div>`
          : ""
      }
    </dl>
  `;
}

function renderRelations(edges, nodes) {
  const nodesById = new Map(
    nodes.map((node) => [String(node?.id ?? ""), node])
  );

  if (edges.length === 0) {
    return '<p class="project-space-empty">暂无可显示的上下文关系。</p>';
  }

  return `
    <ol class="context-relation-list" aria-label="项目上下文关系">
      ${edges
        .map((edge) => {
          const from = nodesById.get(String(edge?.from ?? ""));
          const to = nodesById.get(String(edge?.to ?? ""));
          const relation = displayText(edge?.relation, "related_to");

          return `
            <li>
              <span>${escapeHtml(displayText(from?.title, edge?.from))}</span>
              <strong>${escapeHtml(RELATION_LABELS[relation] ?? relation)}</strong>
              <span>${escapeHtml(displayText(to?.title, edge?.to))}</span>
            </li>
          `;
        })
        .join("")}
    </ol>
  `;
}

export function renderContextMap(contextMap = {}) {
  const { nodes, edges } = normalizeMap(contextMap);

  if (nodes.length === 0) {
    return `
      <section class="context-map" aria-labelledby="context-map-title">
        <p class="section-kicker">Context Map</p>
        <h3 id="context-map-title">项目关系地图</h3>
        <p class="project-space-empty">暂无可显示的项目上下文。</p>
      </section>
    `;
  }

  return `
    <section class="context-map" aria-labelledby="context-map-title">
      <div class="context-map-heading">
        <div>
          <p class="section-kicker">Context Map</p>
          <h3 id="context-map-title">项目关系地图</h3>
        </div>
        <p>${nodes.length} 个节点 · ${edges.length} 条关系</p>
      </div>
      <div class="context-map-layout">
        <div class="context-map-nodes" aria-label="项目上下文节点">
          ${nodes.map((node, index) => renderNode(node, index === 0)).join("")}
        </div>
        <div class="context-map-inspector">
          <div class="context-relations">
            <h4>语义关系</h4>
            ${renderRelations(edges, nodes)}
          </div>
          <aside
            class="context-node-detail"
            id="context-map-detail"
            data-context-map-detail
            aria-live="polite"
          >
            ${renderContextNodeDetail(nodes[0])}
          </aside>
        </div>
      </div>
    </section>
  `;
}

export function bindContextMapInteractions(container, contextMap = {}) {
  const { nodes } = normalizeMap(contextMap);
  const detail = container?.querySelector?.("[data-context-map-detail]");
  const buttons = [
    ...(container?.querySelectorAll?.("[data-context-node-id]") ?? [])
  ];

  if (!detail || nodes.length === 0) {
    return;
  }

  const nodesById = new Map(
    nodes.map((node) => [String(node?.id ?? ""), node])
  );

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const node = nodesById.get(String(button.dataset.contextNodeId ?? ""));

      if (!node) {
        return;
      }

      buttons.forEach((item) => item.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      detail.innerHTML = renderContextNodeDetail(node);
    });
  });
}
