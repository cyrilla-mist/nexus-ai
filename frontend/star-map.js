import { renderContextNodeDetail } from "./context-map.js";

const VIEWBOX = Object.freeze({ width: 960, height: 640 });
const CENTER = Object.freeze({ x: 480, y: 320 });
const ORBITS = Object.freeze({
  understanding: 132,
  execution: 224,
  growth: 286
});
const NODE_SIZES = Object.freeze({
  project: 40,
  problem: 22,
  decision: 24,
  milestone: 26,
  task: 18,
  progress: 14,
  context: 18
});
const TYPE_LABELS = Object.freeze({
  project: "项目",
  problem: "问题",
  decision: "决策",
  milestone: "里程碑",
  task: "任务",
  progress: "进展"
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeMarkup(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableSort(nodes, compare) {
  return [...nodes].sort(
    compare ?? ((left, right) => left.id.localeCompare(right.id))
  );
}

function normalizedNodes(contextMap) {
  const nodes = Array.isArray(contextMap?.nodes) ? contextMap.nodes : [];

  return nodes
    .filter(isPlainObject)
    .map((node, index) => ({
      ...node,
      id: normalizeText(node.id) || `${normalizeText(node.type) || "context"}:${index + 1}`,
      type: normalizeText(node.type) || "context",
      title: normalizeText(node.title) || "未命名节点"
    }));
}

function orderExecutionNodes(nodes, edges) {
  const milestones = stableSort(
    nodes.filter((node) => node.type === "milestone")
  );
  const tasks = stableSort(nodes.filter((node) => node.type === "task"));
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const usedTaskIds = new Set();
  const ordered = [];

  milestones.forEach((milestone) => {
    ordered.push(milestone);

    edges
      .filter(
        (edge) =>
          edge?.relation === "contains" && edge.from === milestone.id
      )
      .map((edge) => tasksById.get(edge.to))
      .filter(Boolean)
      .sort((left, right) => left.id.localeCompare(right.id))
      .forEach((task) => {
        if (!usedTaskIds.has(task.id)) {
          usedTaskIds.add(task.id);
          ordered.push(task);
        }
      });
  });

  tasks.forEach((task) => {
    if (!usedTaskIds.has(task.id)) {
      ordered.push(task);
    }
  });

  return ordered;
}

function positionRing(nodes, radius, startAngle, layer) {
  if (nodes.length === 0) {
    return [];
  }

  return nodes.map((node, index) => {
    const angle = startAngle + (360 * index) / nodes.length;
    const radians = (angle * Math.PI) / 180;

    return {
      ...node,
      layer,
      orbit: radius,
      size: NODE_SIZES[node.type] ?? NODE_SIZES.context,
      x: Number((CENTER.x + Math.cos(radians) * radius).toFixed(2)),
      y: Number((CENTER.y + Math.sin(radians) * radius).toFixed(2))
    };
  });
}

function freezeView(view) {
  return Object.freeze({
    ...view,
    nodes: Object.freeze(view.nodes.map((node) => Object.freeze(node))),
    edges: Object.freeze(view.edges.map((edge) => Object.freeze(edge)))
  });
}

export function createStarMapView(contextMap = {}) {
  const graph = isPlainObject(contextMap) ? contextMap : {};
  const sourceEdges = Array.isArray(graph.edges)
    ? graph.edges.filter(isPlainObject)
    : [];
  const nodes = normalizedNodes(graph);

  if (nodes.length === 0) {
    return freezeView({
      width: VIEWBOX.width,
      height: VIEWBOX.height,
      center: Object.freeze({ ...CENTER }),
      nodes: [],
      edges: []
    });
  }

  const project = stableSort(
    nodes.filter((node) => node.type === "project")
  )[0];
  const understanding = stableSort(
    nodes.filter((node) => ["problem", "decision"].includes(node.type)),
    (left, right) => {
      const priority = { problem: 0, decision: 1 };
      return priority[left.type] - priority[right.type] || left.id.localeCompare(right.id);
    }
  );
  const execution = orderExecutionNodes(nodes, sourceEdges);
  const progress = stableSort(
    nodes.filter((node) => node.type === "progress"),
    (left, right) =>
      normalizeText(left.time).localeCompare(normalizeText(right.time)) ||
      left.id.localeCompare(right.id)
  );
  const supportedIds = new Set([
    project?.id,
    ...understanding.map((node) => node.id),
    ...execution.map((node) => node.id),
    ...progress.map((node) => node.id)
  ]);
  const remaining = stableSort(
    nodes.filter((node) => !supportedIds.has(node.id))
  );
  const laidOut = [
    ...(project
      ? [{
          ...project,
          layer: "core",
          orbit: 0,
          size: NODE_SIZES.project,
          x: CENTER.x,
          y: CENTER.y
        }]
      : []),
    ...positionRing(
      understanding,
      ORBITS.understanding,
      -135,
      "understanding"
    ),
    ...positionRing(execution, ORBITS.execution, -45, "execution"),
    ...positionRing(progress, ORBITS.growth, -90, "growth"),
    ...positionRing(remaining, ORBITS.growth, 90, "context")
  ];
  const positions = new Map(laidOut.map((node) => [node.id, node]));
  const edges = sourceEdges
    .map((edge) => {
      const from = positions.get(normalizeText(edge.from));
      const to = positions.get(normalizeText(edge.to));

      if (!from || !to) {
        return null;
      }

      return {
        from: from.id,
        to: to.id,
        relation: normalizeText(edge.relation) || "related_to",
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y
      };
    })
    .filter(Boolean);

  return freezeView({
    width: VIEWBOX.width,
    height: VIEWBOX.height,
    center: Object.freeze({ ...CENTER }),
    nodes: laidOut,
    edges
  });
}

function shortLabel(value, maximum = 12) {
  const characters = Array.from(normalizeText(value));
  return characters.length > maximum
    ? `${characters.slice(0, maximum).join("")}…`
    : characters.join("");
}

function renderOrbit(radius, label) {
  return `
    <circle
      class="star-map-orbit"
      cx="${CENTER.x}"
      cy="${CENTER.y}"
      r="${radius}"
      aria-hidden="true"
    />
    <text
      class="star-map-orbit-label"
      x="${CENTER.x + radius - 8}"
      y="${CENTER.y - 8}"
      text-anchor="end"
    >${escapeMarkup(label)}</text>
  `;
}

function renderEdge(edge) {
  const labelX = Number(((edge.x1 + edge.x2) / 2).toFixed(2));
  const labelY = Number(((edge.y1 + edge.y2) / 2).toFixed(2));

  return `
    <g class="star-map-edge" data-relation="${escapeMarkup(edge.relation)}">
      <line
        x1="${edge.x1}"
        y1="${edge.y1}"
        x2="${edge.x2}"
        y2="${edge.y2}"
        marker-end="url(#star-map-arrow)"
      />
      <text x="${labelX}" y="${labelY}">${escapeMarkup(edge.relation)}</text>
    </g>
  `;
}

function renderNode(node, selected) {
  const label = shortLabel(node.title);
  const typeLabel = TYPE_LABELS[node.type] ?? "上下文";

  return `
    <g
      class="star-map-node"
      data-star-node-id="${escapeMarkup(node.id)}"
      data-node-type="${escapeMarkup(node.type)}"
      data-layer="${escapeMarkup(node.layer)}"
      transform="translate(${node.x} ${node.y})"
      role="button"
      tabindex="0"
      aria-label="${escapeMarkup(`${typeLabel}：${node.title}`)}"
      aria-controls="star-map-detail"
      aria-pressed="${selected}"
    >
      <title>${escapeMarkup(`${typeLabel}：${node.title}`)}</title>
      <circle r="${node.size}" />
      <text class="star-map-node-type" y="-4" text-anchor="middle">${escapeMarkup(typeLabel)}</text>
      <text class="star-map-node-label" y="${node.size + 17}" text-anchor="middle">${escapeMarkup(label)}</text>
      ${
        node.status
          ? `<text class="star-map-node-status" y="${node.size + 31}" text-anchor="middle">${escapeMarkup(node.status)}</text>`
          : ""
      }
    </g>
  `;
}

function renderSemanticOutline(nodes) {
  return `
    <ol class="star-map-outline" aria-label="项目星图语义结构">
      ${nodes
        .map(
          (node, index) => `
            <li>
              <button
                type="button"
                data-star-node-id="${escapeMarkup(node.id)}"
                aria-controls="star-map-detail"
                aria-pressed="${index === 0}"
              >
                <span>${escapeMarkup(TYPE_LABELS[node.type] ?? "上下文")}</span>
                <strong>${escapeMarkup(node.title)}</strong>
              </button>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

export function renderStarMap(contextMap = {}) {
  const view = createStarMapView(contextMap);

  if (view.nodes.length === 0) {
    return `
      <section class="star-map" aria-labelledby="star-map-title">
        <p class="section-kicker">Star Map</p>
        <h3 id="star-map-title">项目宇宙</h3>
        <p class="project-space-empty">暂无可显示的项目星图。</p>
      </section>
    `;
  }

  return `
    <section class="star-map" aria-labelledby="star-map-title">
      <div class="star-map-heading">
        <div>
          <p class="section-kicker">Star Map</p>
          <h3 id="star-map-title">项目宇宙</h3>
        </div>
        <p>${view.nodes.length} 个节点 · ${view.edges.length} 条关系</p>
      </div>
      <div class="star-map-layout">
        <div class="star-map-stage">
          <svg
            class="star-map-canvas"
            viewBox="0 0 ${view.width} ${view.height}"
            role="img"
            aria-labelledby="star-map-svg-title star-map-svg-description"
          >
            <title id="star-map-svg-title">项目上下文星图</title>
            <desc id="star-map-svg-description">项目位于中心，理解、执行与成长节点沿不同轨道排列。</desc>
            <defs>
              <marker
                id="star-map-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" />
              </marker>
            </defs>
            ${renderOrbit(ORBITS.understanding, "理解")}
            ${renderOrbit(ORBITS.execution, "执行")}
            ${renderOrbit(ORBITS.growth, "成长")}
            ${view.edges.map(renderEdge).join("")}
            ${view.nodes.map((node, index) => renderNode(node, index === 0)).join("")}
          </svg>
          ${renderSemanticOutline(view.nodes)}
        </div>
        <aside
          class="star-map-detail context-node-detail"
          id="star-map-detail"
          data-star-map-detail
          aria-live="polite"
        >
          ${renderContextNodeDetail(view.nodes[0])}
        </aside>
      </div>
    </section>
  `;
}

export function bindStarMapInteractions(container, contextMap = {}) {
  const nodes = normalizedNodes(contextMap);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const detail = container?.querySelector?.("[data-star-map-detail]");
  const controls = [
    ...(container?.querySelectorAll?.("[data-star-node-id]") ?? [])
  ];

  if (!detail || controls.length === 0) {
    return;
  }

  const selectNode = (control) => {
    const node = nodesById.get(String(control.dataset.starNodeId ?? ""));

    if (!node) {
      return;
    }

    controls.forEach((item) => item.setAttribute("aria-pressed", "false"));
    controls
      .filter((item) => item.dataset.starNodeId === node.id)
      .forEach((item) => item.setAttribute("aria-pressed", "true"));
    detail.innerHTML = renderContextNodeDetail(node);
  };

  controls.forEach((control) => {
    control.addEventListener("click", () => selectNode(control));
    control.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) {
        return;
      }

      event.preventDefault();
      selectNode(control);
    });
  });
}
