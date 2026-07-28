import { renderContextNodeDetail } from "./context-map.js";

const VIEWBOX = Object.freeze({ width: 1120, height: 760 });
const CENTER = Object.freeze({ x: 560, y: 400 });
const ORBITS = Object.freeze({
  understanding: 190,
  execution: 300,
  growth: 360
});
const NODE_SIZES = Object.freeze({
  project: 68,
  problem: 28,
  decision: 31,
  milestone: 34,
  task: 23,
  progress: 19,
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
const LAYER_LABELS = Object.freeze({
  core: "Project Core",
  understanding: "Understanding · 为什么开始",
  execution: "Execution · 如何推进",
  growth: "Growth · 如何成长",
  context: "Other Context"
});
const RELATION_LABELS = Object.freeze({
  addresses: "解决",
  supports: "支持",
  contains: "包含",
  updates: "更新"
});
const RELATION_STRENGTH = Object.freeze({
  addresses: "primary",
  supports: "primary",
  contains: "structural",
  updates: "history"
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
      id:
        normalizeText(node.id) ||
        `${normalizeText(node.type) || "context"}:${index + 1}`,
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

const ORBIT_LAYOUTS = Object.freeze({
  understanding: Object.freeze({
    problem: Object.freeze([{ angle: 180, spread: 34 }]),
    decision: Object.freeze([{ angle: 0, spread: 34 }]),
    context: Object.freeze([{ angle: 210 }, { angle: 150 }, { angle: 330 }, { angle: 30 }])
  }),
  execution: Object.freeze({
    milestone: Object.freeze([{ angle: 235, spread: 24 }]),
    task: Object.freeze([{ angle: 305, spread: 24 }]),
    context: Object.freeze([{ angle: 250 }, { angle: 290 }, { angle: 220 }, { angle: 320 }])
  }),
  growth: Object.freeze({
    progress: Object.freeze([{ angle: 270, spread: 42 }]),
    context: Object.freeze([{ angle: 270 }, { angle: 242 }, { angle: 298 }, { angle: 218 }, { angle: 322 }])
  })
});

function expandAngles(count, fallback) {
  if (count <= 0) {
    return [];
  }

  const first = fallback[0] ?? { angle: -90, spread: 40 };

  if (count === 1) {
    return [first.angle];
  }

  if (typeof first.spread === "number") {
    const start = first.angle - first.spread / 2;
    const step = first.spread / (count - 1);
    return Array.from({ length: count }, (_item, index) => start + step * index);
  }

  return Array.from({ length: count }, (_item, index) => fallback[index % fallback.length].angle);
}

function pointFromAngle(radius, angle) {
  const radians = (angle * Math.PI) / 180;

  return {
    x: Number((CENTER.x + Math.cos(radians) * radius).toFixed(2)),
    y: Number((CENTER.y + Math.sin(radians) * radius).toFixed(2))
  };
}

function positionOrbit(nodes, radius, layer) {
  if (nodes.length === 0) {
    return [];
  }

  const groups = new Map();

  nodes.forEach((node) => {
    const group = ORBIT_LAYOUTS[layer]?.[node.type] ? node.type : "context";
    groups.set(group, [...(groups.get(group) ?? []), node]);
  });

  return [...groups.entries()].flatMap(([group, groupNodes]) => {
    const fallback = ORBIT_LAYOUTS[layer]?.[group] ?? [{ angle: -90, spread: 48 }];
    const angles = expandAngles(groupNodes.length, fallback);

    return groupNodes.map((node, index) => ({
      ...node,
      layer,
      orbit: radius,
      angle: Number(angles[index].toFixed(2)),
      size: NODE_SIZES[node.type] ?? NODE_SIZES.context,
      ...pointFromAngle(radius, angles[index])
    }));
  });
}

function trimEdgeEndpoint(from, to, padding = 5) {
  const vectorX = to.x - from.x;
  const vectorY = to.y - from.y;
  const length = Math.hypot(vectorX, vectorY);

  if (length === 0) {
    return { x: from.x, y: from.y };
  }

  const offset = (from.size ?? NODE_SIZES.context) + padding;

  return {
    x: Number((from.x + (vectorX / length) * offset).toFixed(2)),
    y: Number((from.y + (vectorY / length) * offset).toFixed(2))
  };
}

function edgeCrossesCore(edge, from, to) {
  if (from.type === "project" || to.type === "project") {
    return false;
  }

  const vectorX = to.x - from.x;
  const vectorY = to.y - from.y;
  const lengthSquared = vectorX * vectorX + vectorY * vectorY;

  if (lengthSquared === 0) {
    return false;
  }

  const projection =
    ((CENTER.x - from.x) * vectorX + (CENTER.y - from.y) * vectorY) /
    lengthSquared;

  if (projection <= 0 || projection >= 1) {
    return false;
  }

  const closestX = from.x + projection * vectorX;
  const closestY = from.y + projection * vectorY;
  const distance = Math.hypot(closestX - CENTER.x, closestY - CENTER.y);

  return distance < NODE_SIZES.project + 34;
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
      return (
        priority[left.type] - priority[right.type] ||
        left.id.localeCompare(right.id)
      );
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
      ? [
          {
            ...project,
            layer: "core",
            orbit: 0,
            size: NODE_SIZES.project,
            x: CENTER.x,
            y: CENTER.y
          }
        ]
      : []),
    ...positionOrbit(understanding, ORBITS.understanding, "understanding"),
    ...positionOrbit(execution, ORBITS.execution, "execution"),
    ...positionOrbit(progress, ORBITS.growth, "growth"),
    ...positionOrbit(remaining, ORBITS.growth, "context")
  ];
  const positions = new Map(laidOut.map((node) => [node.id, node]));
  const edges = sourceEdges
    .map((edge) => {
      const from = positions.get(normalizeText(edge.from));
      const to = positions.get(normalizeText(edge.to));

      if (!from || !to) {
        return null;
      }

      const start = trimEdgeEndpoint(from, to);
      const end = trimEdgeEndpoint(to, from);

      return {
        from: from.id,
        to: to.id,
        relation: normalizeText(edge.relation) || "related_to",
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        crossesCore: edgeCrossesCore(edge, from, to)
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

export function createStarMapFocusState(contextMap = {}, selectedId = "") {
  const view = createStarMapView(contextMap);

  if (view.nodes.length === 0) {
    return Object.freeze({
      selectedId: "",
      nodes: Object.freeze({}),
      edges: Object.freeze([])
    });
  }

  const supportedIds = new Set(view.nodes.map((node) => node.id));
  const fallbackId =
    view.nodes.find((node) => node.type === "project")?.id ?? view.nodes[0].id;
  const activeId = supportedIds.has(selectedId) ? selectedId : fallbackId;
  const relatedIds = new Set([activeId]);

  view.edges.forEach((edge) => {
    if (edge.from === activeId) {
      relatedIds.add(edge.to);
    }

    if (edge.to === activeId) {
      relatedIds.add(edge.from);
    }
  });

  return Object.freeze({
    selectedId: activeId,
    nodes: Object.freeze(
      Object.fromEntries(
        view.nodes.map((node) => [
          node.id,
          node.id === activeId
            ? "selected"
            : relatedIds.has(node.id)
              ? "related"
              : "dimmed"
        ])
      )
    ),
    edges: Object.freeze(
      view.edges.map((edge) =>
        edge.from === activeId || edge.to === activeId ? "related" : "quiet"
      )
    )
  });
}

function shortLabel(value, maximum = 12) {
  const characters = Array.from(normalizeText(value));
  return characters.length > maximum
    ? `${characters.slice(0, maximum).join("")}…`
    : characters.join("");
}

function renderOrbit(radius, { key, title }) {
  return `
    <g class="star-map-orbit-group" data-orbit="${escapeMarkup(key)}">
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
      >${escapeMarkup(title)}</text>
    </g>
  `;
}

function renderEdge(edge, index, focusState = "default") {
  const labelX = Number(((edge.x1 + edge.x2) / 2).toFixed(2));
  const labelY = Number(((edge.y1 + edge.y2) / 2).toFixed(2));
  const strength = RELATION_STRENGTH[edge.relation] ?? "secondary";

  return `
    <g
      class="star-map-edge"
      data-edge-index="${index}"
      data-relation="${escapeMarkup(edge.relation)}"
      data-crosses-core="${edge.crossesCore ? "true" : "false"}"
      data-strength="${escapeMarkup(strength)}"
      data-focus-state="${escapeMarkup(focusState)}"
    >
      <line
        x1="${edge.x1}"
        y1="${edge.y1}"
        x2="${edge.x2}"
        y2="${edge.y2}"
        marker-end="url(#star-map-arrow)"
      />
      <text x="${labelX}" y="${labelY}">${escapeMarkup(
        RELATION_LABELS[edge.relation] ?? edge.relation
      )}</text>
    </g>
  `;
}

function renderNode(node, focusState = "default") {
  const label = shortLabel(node.title, node.type === "project" ? 16 : 10);
  const typeLabel = TYPE_LABELS[node.type] ?? "上下文";
  const selected = focusState === "selected";

  return `
    <g
      class="star-map-node"
      data-star-node-id="${escapeMarkup(node.id)}"
      data-node-type="${escapeMarkup(node.type)}"
      data-layer="${escapeMarkup(node.layer)}"
      data-status="${escapeMarkup(normalizeText(node.status) || "unknown")}"
      data-focus-state="${escapeMarkup(focusState)}"
      transform="translate(${node.x} ${node.y})"
      role="button"
      tabindex="0"
      aria-label="${escapeMarkup(`${typeLabel}：${node.title}`)}"
      aria-controls="star-map-detail"
      aria-pressed="${selected}"
    >
      <title>${escapeMarkup(`${typeLabel}：${node.title}`)}</title>
      ${
        node.type === "project"
          ? '<circle class="star-map-project-halo" r="96" aria-hidden="true" />'
          : ""
      }
      <circle class="star-map-node-body" r="${node.size}" />
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
  const groups = ["core", "understanding", "execution", "growth", "context"]
    .map((layer) => ({
      layer,
      nodes: nodes.filter((node) => node.layer === layer)
    }))
    .filter((group) => group.nodes.length > 0);
  let itemIndex = 0;

  return `
    <div class="star-map-outline" aria-label="项目星图语义结构">
      ${groups
        .map(
          (group) => `
            <section class="star-map-outline-group" data-layer="${escapeMarkup(group.layer)}">
              <h4>${escapeMarkup(LAYER_LABELS[group.layer])}</h4>
              <ol>
                ${group.nodes
                  .map((node) => {
                    const selected = itemIndex === 0;
                    itemIndex += 1;

                    return `
                      <li>
                        <button
                          type="button"
                          data-star-node-id="${escapeMarkup(node.id)}"
                          aria-controls="star-map-detail"
                          aria-pressed="${selected}"
                        >
                          <span>${escapeMarkup(TYPE_LABELS[node.type] ?? "上下文")}</span>
                          <strong>${escapeMarkup(node.title)}</strong>
                          ${
                            node.status
                              ? `<small>${escapeMarkup(node.status)}</small>`
                              : ""
                          }
                        </button>
                      </li>
                    `;
                  })
                  .join("")}
              </ol>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function relatedEdges(nodeId, edges) {
  return edges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

function renderStarMapDetail(node, nodes, edges) {
  const nodesById = new Map(nodes.map((item) => [item.id, item]));
  const relationships = relatedEdges(node?.id, edges);

  return `
    ${renderContextNodeDetail(node)}
    <section class="star-map-detail-relations" aria-label="节点关系">
      <h5>关联关系</h5>
      ${
        relationships.length === 0
          ? '<p class="project-space-empty">暂无关联关系。</p>'
          : `
            <ul>
              ${relationships
                .map((edge) => {
                  const outgoing = edge.from === node.id;
                  const related = nodesById.get(outgoing ? edge.to : edge.from);
                  const direction = outgoing ? "指向" : "来自";

                  return `
                    <li>
                      <span>${escapeMarkup(direction)}</span>
                      <strong>${escapeMarkup(
                        RELATION_LABELS[edge.relation] ?? edge.relation
                      )}</strong>
                      <span>${escapeMarkup(related?.title ?? "未知节点")}</span>
                    </li>
                  `;
                })
                .join("")}
            </ul>
          `
      }
    </section>
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

  const projectId =
    view.nodes.find((node) => node.type === "project")?.id ?? view.nodes[0].id;
  const initialFocus = createStarMapFocusState(contextMap, projectId);

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
            ${renderOrbit(ORBITS.understanding, {
              key: "understanding",
              title: "理解 · 为什么开始"
            })}
            ${renderOrbit(ORBITS.execution, {
              key: "execution",
              title: "执行 · 如何推进"
            })}
            ${renderOrbit(ORBITS.growth, {
              key: "growth",
              title: "成长 · 如何变化"
            })}
            ${view.edges
              .map((edge, index) =>
                renderEdge(edge, index, initialFocus.edges[index])
              )
              .join("")}
            ${view.nodes
              .map((node) => renderNode(node, initialFocus.nodes[node.id]))
              .join("")}
          </svg>
          ${renderSemanticOutline(view.nodes)}
        </div>
        <aside
          class="star-map-detail context-node-detail"
          id="star-map-detail"
          data-star-map-detail
          aria-live="polite"
        >
          ${renderStarMapDetail(
            view.nodes.find((node) => node.id === initialFocus.selectedId),
            view.nodes,
            view.edges
          )}
        </aside>
      </div>
    </section>
  `;
}

export function bindStarMapInteractions(container, contextMap = {}) {
  const view = createStarMapView(contextMap);
  const nodesById = new Map(view.nodes.map((node) => [node.id, node]));
  const detail = container?.querySelector?.("[data-star-map-detail]");
  const controls = [
    ...(container?.querySelectorAll?.("[data-star-node-id]") ?? [])
  ];
  const visualNodes = [
    ...(container?.querySelectorAll?.(
      ".star-map-node[data-star-node-id]"
    ) ?? [])
  ];
  const visualEdges = [
    ...(container?.querySelectorAll?.(
      ".star-map-edge[data-edge-index]"
    ) ?? [])
  ];

  if (!detail || controls.length === 0 || view.nodes.length === 0) {
    return;
  }

  let selectedId =
    view.nodes.find((node) => node.type === "project")?.id ?? view.nodes[0].id;

  const applyFocus = (nodeId, { commit = false, preview = false } = {}) => {
    const node = nodesById.get(String(nodeId ?? ""));

    if (!node) {
      return;
    }

    if (commit) {
      selectedId = node.id;
    }

    const focus = createStarMapFocusState(contextMap, node.id);
    controls.forEach((item) =>
      item.setAttribute(
        "aria-pressed",
        String(item.dataset.starNodeId === selectedId)
      )
    );
    visualNodes.forEach((item) => {
      const itemId = String(item.dataset.starNodeId ?? "");
      const state = focus.nodes[itemId] ?? "dimmed";
      item.setAttribute(
        "data-focus-state",
        preview && itemId === node.id ? "hovered" : state
      );
    });
    visualEdges.forEach((item) => {
      const index = Number(item.dataset.edgeIndex);
      item.setAttribute("data-focus-state", focus.edges[index] ?? "quiet");
    });

    if (commit) {
      detail.innerHTML = renderStarMapDetail(node, view.nodes, view.edges);
    }
  };

  const restoreSelection = () => {
    applyFocus(selectedId);
  };

  controls.forEach((control) => {
    control.addEventListener("click", () =>
      applyFocus(control.dataset.starNodeId, { commit: true })
    );
    control.addEventListener("keydown", (event) => {
      if (!["Enter", " "].includes(event.key)) {
        return;
      }

      event.preventDefault();
      applyFocus(control.dataset.starNodeId, { commit: true });
    });
    control.addEventListener("pointerenter", () =>
      applyFocus(control.dataset.starNodeId, { preview: true })
    );
    control.addEventListener("pointerleave", restoreSelection);
  });
}
