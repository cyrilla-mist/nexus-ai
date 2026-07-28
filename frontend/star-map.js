const VIEWBOX = Object.freeze({ width: 1500, height: 940 });
const CAMERA = Object.freeze({
  minWidth: 1180,
  minHeight: 760,
  maxWidth: 1260,
  maxHeight: 840,
  horizontalPadding: 116,
  verticalPadding: 92,
  labelPaddingX: 96,
  labelPaddingTop: 48,
  labelPaddingBottom: 86,
  inspectorSafeRight: 84,
  inspectorSafeBottom: 52
});
const CENTER = Object.freeze({ x: 750, y: 520 });
const ORBITS = Object.freeze({
  understanding: 330,
  execution: 470,
  growth: 600
});
const NODE_SIZES = Object.freeze({
  project: 86,
  problem: 42,
  decision: 44,
  milestone: 50,
  task: 34,
  progress: 26,
  context: 22
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
const SPATIAL_ZONES = Object.freeze({
  project: Object.freeze({ x: CENTER.x, y: CENTER.y, stepX: 0, stepY: 0, orbit: 0 }),
  problem: Object.freeze({ x: 300, y: CENTER.y, stepX: 0, stepY: 118, orbit: ORBITS.understanding }),
  decision: Object.freeze({ x: 1200, y: CENTER.y, stepX: 0, stepY: 118, orbit: ORBITS.understanding }),
  milestone: Object.freeze({ x: 540, y: 250, stepX: 120, stepY: 0, orbit: ORBITS.execution }),
  task: Object.freeze({ x: 560, y: 735, stepX: 122, stepY: 0, orbit: ORBITS.execution }),
  progress: Object.freeze({ x: CENTER.x, y: 115, stepX: 140, stepY: 0, orbit: ORBITS.growth }),
  context: Object.freeze({ x: 1010, y: 765, stepX: 118, stepY: 0, orbit: ORBITS.growth })
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

function positionSemanticNodes(nodes, layer) {
  if (nodes.length === 0) {
    return [];
  }

  const groups = new Map();

  nodes.forEach((node) => {
    groups.set(node.type, [...(groups.get(node.type) ?? []), node]);
  });

  return [...groups.entries()].flatMap(([type, groupNodes]) => {
    const zone = SPATIAL_ZONES[type] ?? SPATIAL_ZONES.context;
    const middle = (groupNodes.length - 1) / 2;

    return groupNodes.map((node, index) => {
      const offset = index - middle;

      return {
        ...node,
        layer,
        orbit: zone.orbit,
        angle: null,
        size: NODE_SIZES[node.type] ?? NODE_SIZES.context,
        x: Number((zone.x + offset * zone.stepX).toFixed(2)),
        y: Number((zone.y + offset * zone.stepY).toFixed(2))
      };
    });
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
function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeBounds(bounds) {
  return Object.freeze({
    minX: Number(bounds.minX.toFixed(2)),
    minY: Number(bounds.minY.toFixed(2)),
    maxX: Number(bounds.maxX.toFixed(2)),
    maxY: Number(bounds.maxY.toFixed(2)),
    width: Number((bounds.maxX - bounds.minX).toFixed(2)),
    height: Number((bounds.maxY - bounds.minY).toFixed(2))
  });
}

export function getUniverseContentBounds(nodes = []) {
  const positionedNodes = Array.isArray(nodes) ? nodes.filter(isPlainObject) : [];

  if (positionedNodes.length === 0) {
    return normalizeBounds({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
  }

  const bounds = positionedNodes.reduce(
    (current, node) => {
      const size = Number.isFinite(node.size) ? node.size : NODE_SIZES.context;
      const labelWidth = Math.min(
        CAMERA.labelPaddingX + Array.from(normalizeText(node.title)).length * 2.8,
        node.type === "project" ? 156 : 132
      );
      const topPadding = size + CAMERA.labelPaddingTop;
      const bottomPadding = size + CAMERA.labelPaddingBottom;

      return {
        minX: Math.min(current.minX, node.x - size - labelWidth),
        minY: Math.min(current.minY, node.y - topPadding),
        maxX: Math.max(current.maxX, node.x + size + labelWidth),
        maxY: Math.max(current.maxY, node.y + bottomPadding)
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  return normalizeBounds(bounds);
}

export function getDefaultUniverseViewBox(nodes = []) {
  const bounds = getUniverseContentBounds(nodes);

  if (bounds.width === 0 && bounds.height === 0) {
    return Object.freeze({ x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height });
  }

  const desiredWidth = clampNumber(
    bounds.width + CAMERA.horizontalPadding * 2 + CAMERA.inspectorSafeRight,
    CAMERA.minWidth,
    CAMERA.maxWidth
  );
  const desiredHeight = clampNumber(
    bounds.height + CAMERA.verticalPadding * 2 + CAMERA.inspectorSafeBottom,
    CAMERA.minHeight,
    CAMERA.maxHeight
  );
  const projectNode = nodes.find?.((node) => node?.type === "project");
  const focusX = Number.isFinite(projectNode?.x)
    ? projectNode.x
    : (bounds.minX + bounds.maxX) / 2;
  const focusY = Number.isFinite(projectNode?.y)
    ? projectNode.y
    : (bounds.minY + bounds.maxY) / 2;
  const boundsCenterX = (bounds.minX + bounds.maxX) / 2;
  const boundsCenterY = (bounds.minY + bounds.maxY) / 2;
  const centerX = focusX * 0.72 + boundsCenterX * 0.28;
  const centerY = focusY * 0.78 + boundsCenterY * 0.22;
  const minX = Math.max(0, bounds.maxX - desiredWidth);
  const maxX = Math.min(bounds.minX, VIEWBOX.width - desiredWidth);
  const minY = Math.max(0, bounds.maxY - desiredHeight);
  const maxY = Math.min(bounds.minY, VIEWBOX.height - desiredHeight);
  const rawX = centerX - desiredWidth / 2;
  const rawY = centerY - desiredHeight / 2;

  return Object.freeze({
    x: Number(clampNumber(rawX, minX, maxX).toFixed(2)),
    y: Number(clampNumber(rawY, minY, maxY).toFixed(2)),
    width: Number(desiredWidth.toFixed(2)),
    height: Number(desiredHeight.toFixed(2))
  });
}

function formatViewBox(viewBox) {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}


function freezeView(view) {
  return Object.freeze({
    ...view,
    nodes: Object.freeze(view.nodes.map((node) => Object.freeze(node))),
    edges: Object.freeze(view.edges.map((edge) => Object.freeze(edge)))
  });
}

function createDefaultFocusState(view) {
  return Object.freeze({
    selectedId: "",
    nodes: Object.freeze(
      Object.fromEntries(view.nodes.map((node) => [node.id, "default"]))
    ),
    edges: Object.freeze(view.edges.map(() => "default")),
    pathIds: Object.freeze([])
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
      viewBox: Object.freeze({ x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height }),
      contentBounds: getUniverseContentBounds([]),
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
    ...positionSemanticNodes(understanding, "understanding"),
    ...positionSemanticNodes(execution, "execution"),
    ...positionSemanticNodes(progress, "growth"),
    ...positionSemanticNodes(remaining, "context")
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

  const contentBounds = getUniverseContentBounds(laidOut);
  const viewBox = getDefaultUniverseViewBox(laidOut);

  return freezeView({
    width: VIEWBOX.width,
    height: VIEWBOX.height,
    viewBox: Object.freeze(viewBox),
    contentBounds,
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
      edges: Object.freeze([]),
      pathIds: Object.freeze([])
    });
  }

  const supportedIds = new Set(view.nodes.map((node) => node.id));
  const activeId = supportedIds.has(selectedId) ? selectedId : "";

  if (!activeId) {
    return createDefaultFocusState(view);
  }

  const activeNode = view.nodes.find((node) => node.id === activeId);
  const relatedIds = new Set([activeId]);
  const pathTypes = ["problem", "decision", "milestone", "task"];

  view.edges.forEach((edge) => {
    if (edge.from === activeId) {
      relatedIds.add(edge.to);
    }

    if (edge.to === activeId) {
      relatedIds.add(edge.from);
    }
  });

  if (activeNode?.type === "project" || pathTypes.includes(activeNode?.type)) {
    view.nodes
      .filter((node) => node.type === "project" || pathTypes.includes(node.type))
      .forEach((node) => relatedIds.add(node.id));
  }

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
        edge.from === activeId ||
        edge.to === activeId ||
        (relatedIds.has(edge.from) && relatedIds.has(edge.to))
          ? "related"
          : "quiet"
      )
    ),
    pathIds: Object.freeze([...relatedIds])
  });
}

function shortLabel(value, maximum = 12) {
  const characters = Array.from(normalizeText(value));
  return characters.length > maximum
    ? `${characters.slice(0, maximum).join("")}…`
    : characters.join("");
}

function labelLines(value, maximum = 12) {
  const label = shortLabel(value, maximum);
  const characters = Array.from(label);

  if (characters.length <= Math.ceil(maximum * 0.72)) {
    return [label];
  }

  const firstLineLength = Math.ceil(characters.length / 2);
  return [
    characters.slice(0, firstLineLength).join(""),
    characters.slice(firstLineLength).join("")
  ].filter(Boolean);
}

function renderNodeLabel(node) {
  const maximum = node.type === "project" ? 18 : 14;
  const lines = labelLines(node.title, maximum);
  const startY = node.size + (lines.length > 1 ? 22 : 24);

  return `
      <text class="star-map-node-label" y="${startY}" text-anchor="middle">
        ${lines
          .map(
            (line, index) =>
              `<tspan x="0" dy="${index === 0 ? 0 : 18}">${escapeMarkup(line)}</tspan>`
          )
          .join("")}
      </text>`;
}

export function getNodeLabelPlacement(node) {
  if (node.type === "project") {
    return "below";
  }

  if (node.type === "task") {
    return "above";
  }

  if (node.type === "progress" || node.y < CENTER.y - 180) {
    return "below";
  }

  if (node.x < CENTER.x - 250) {
    return "left";
  }

  if (node.x > CENTER.x + 250) {
    return "right";
  }

  return node.y > CENTER.y ? "above" : "below";
}

export function getNodeLabelPosition(node, viewBox) {
  const safeViewBox = isPlainObject(viewBox)
    ? viewBox
    : { x: 0, y: 0, width: VIEWBOX.width, height: VIEWBOX.height };
  const placement = getNodeLabelPlacement(node);
  const offsets = {
    below: { x: 0, y: node.type === "project" ? 112 : node.size + 34 },
    above: { x: 0, y: -(node.size + 58) },
    left: { x: -(node.size + 62), y: node.size + 18 },
    right: { x: node.size + 62, y: node.size + 18 }
  };
  const offset = offsets[placement] ?? offsets.below;
  const left = ((node.x + offset.x - safeViewBox.x) / safeViewBox.width) * 100;
  const top = ((node.y + offset.y - safeViewBox.y) / safeViewBox.height) * 100;

  return Object.freeze({
    left: Number(clampNumber(left, 4, 96).toFixed(3)),
    top: Number(clampNumber(top, 6, 92).toFixed(3)),
    placement
  });
}

function renderScreenLabel(node, viewBox, focusState = "default") {
  const typeLabel = TYPE_LABELS[node.type] ?? "上下文";
  const maximum = node.type === "project" ? 18 : 14;
  const lines = labelLines(node.title, maximum);
  const position = getNodeLabelPosition(node, viewBox);

  return `
    <div
      class="star-map-screen-label"
      data-star-label-id="${escapeMarkup(node.id)}"
      data-node-type="${escapeMarkup(node.type)}"
      data-layer="${escapeMarkup(node.layer)}"
      data-focus-state="${escapeMarkup(focusState)}"
      data-label-placement="${escapeMarkup(position.placement)}"
      style="--label-x: ${position.left}%; --label-y: ${position.top}%;"
      aria-hidden="true"
    >
      <span class="star-map-screen-label-type">${escapeMarkup(typeLabel)}</span>
      <strong>${lines.map((line) => `<span>${escapeMarkup(line)}</span>`).join("")}</strong>
    </div>
  `;
}

function renderGuidePopover() {
  return `
    <details class="star-map-guide-popover">
      <summary aria-label="如何阅读 Project Universe">?</summary>
      <div>
        <ol>
          <li>左：问题</li>
          <li>中：项目核心</li>
          <li>右：决策</li>
          <li>上：里程碑</li>
          <li>下：任务</li>
          <li>外围：进展</li>
        </ol>
        <p>阅读路径：问题 → 项目核心 → 决策。</p>
      </div>
    </details>
  `;
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

    </g>
  `;
}

function renderNode(node, focusState = "default") {
  const typeLabel = TYPE_LABELS[node.type] ?? "上下文";
  const selected = focusState === "selected";
  const inContextPath = ["selected", "related", "hovered"].includes(focusState);

  return `
    <g
      class="star-map-node"
      data-star-node-id="${escapeMarkup(node.id)}"
      data-node-type="${escapeMarkup(node.type)}"
      data-layer="${escapeMarkup(node.layer)}"
      data-status="${escapeMarkup(normalizeText(node.status) || "unknown")}"
      data-focus-state="${escapeMarkup(focusState)}"
      data-context-path="${inContextPath ? "true" : "false"}"
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
      <text class="star-map-node-glyph" y="4" text-anchor="middle" aria-hidden="true">${escapeMarkup(typeLabel.slice(0, 1))}</text>
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
    <div class="star-map-outline" aria-label="移动端 Universe Explorer">
      <div class="star-map-outline-intro">
        <p class="section-kicker">Universe Explorer</p>
        <h4>移动端节点探索</h4>
        <p>手机端不压缩桌面星图；Project Core 与核心节点按语义分组展示，选择节点后在下方查看 Context 与 Relationship。</p>
      </div>
      ${groups
        .map(
          (group) => `
            <section class="star-map-outline-group" data-layer="${escapeMarkup(group.layer)}">
              <h4>${escapeMarkup(LAYER_LABELS[group.layer])}</h4>
              <ol>
                ${group.nodes
                  .map((node) => {
                    itemIndex += 1;

                    return `
                      <li>
                        <button
                          type="button"
                          data-star-node-id="${escapeMarkup(node.id)}"
                          aria-controls="star-map-detail"
                          aria-pressed="false"
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

function detailValue(value) {
  return normalizeText(value) || "无法判断";
}

function describeNodeContext(node) {
  if (!node) {
    return "无法判断";
  }

  return detailValue(
    node.summary ??
      node.description ??
      node.reason ??
      node.criteria ??
      node.time ??
      node.title
  );
}

function renderStarMapEmptyDetail() {
  return "";
}

function renderStarMapDetail(node, nodes, edges) {
  if (!node) {
    return renderStarMapEmptyDetail();
  }

  const nodesById = new Map(nodes.map((item) => [item.id, item]));
  const relationships = relatedEdges(node?.id, edges);
  const typeLabel = TYPE_LABELS[node.type] ?? "上下文";

  return `
    <div class="star-map-explanation-space">
      <button class="star-map-detail-close" type="button" data-star-map-close aria-label="关闭 Context Inspector">×</button>
      <p class="section-kicker">Context Inspector</p>
      <h4>${escapeMarkup(node.title)}</h4>
      <dl class="star-map-detail-grid" aria-label="节点上下文说明">
        <div>
          <dt>Identity</dt>
          <dd>${escapeMarkup(typeLabel)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>${escapeMarkup(detailValue(node.status))}</dd>
        </div>
        <div>
          <dt>Context</dt>
          <dd>${escapeMarkup(describeNodeContext(node))}</dd>
        </div>
        <div>
          <dt>Impact</dt>
          <dd>${escapeMarkup(relationships.length > 0 ? "影响当前项目理解路径" : "等待更多上下文确认")}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>${escapeMarkup(detailValue(node.source))}</dd>
        </div>
      </dl>
    </div>
    <section class="star-map-detail-relations" aria-label="节点关系">
      <h5>Relationship</h5>
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

  const initialFocus = createStarMapFocusState(contextMap);

  return `
    <section class="star-map" aria-labelledby="star-map-title">
      <div class="star-map-heading">
        <div>
          <p class="section-kicker">Star Map</p>
          <h3 id="star-map-title">项目宇宙</h3>
          <p class="star-map-entry-copy">从项目核心探索关键关系</p>
        </div>
        <div class="star-map-heading-actions">
          <p>${view.nodes.length} 个节点 · ${view.edges.length} 条关系</p>
          ${renderGuidePopover()}
        </div>
      </div>
      <div class="star-map-layout">
        <div class="star-map-stage" data-universe-state="default">
          <svg
            class="star-map-canvas"
            data-selected-node=""
            viewBox="${formatViewBox(view.viewBox)}"
            preserveAspectRatio="xMidYMid meet"
            data-camera="default"
            data-camera-viewbox="${formatViewBox(view.viewBox)}"
            role="img"
            aria-labelledby="star-map-svg-title star-map-svg-description"
          >
            <title id="star-map-svg-title">项目上下文星图</title>
            <desc id="star-map-svg-description">默认 Camera 会聚焦有效节点区域，而不是展示完整虚拟画布；项目位于中心，理解、执行与成长节点沿不同轨道排列。</desc>
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
          <div class="universe-label-layer" aria-hidden="true">
            ${view.nodes
              .map((node) => renderScreenLabel(node, view.viewBox, initialFocus.nodes[node.id]))
              .join("")}
          </div>
          ${renderSemanticOutline(view.nodes)}
        </div>
        <aside
          class="star-map-detail context-node-detail"
          id="star-map-detail"
          data-star-map-detail
          data-detail-state="closed"
          aria-live="polite"
          hidden
        >
          ${renderStarMapEmptyDetail()}
        </aside>
      </div>
    </section>
  `;
}

export function bindStarMapInteractions(container, contextMap = {}) {
  const view = createStarMapView(contextMap);
  const nodesById = new Map(view.nodes.map((node) => [node.id, node]));
  const detail = container?.querySelector?.("[data-star-map-detail]");
  const stage = container?.querySelector?.(".star-map-stage");
  const canvas = container?.querySelector?.(".star-map-canvas");
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
  const visualLabels = [
    ...(container?.querySelectorAll?.(
      ".star-map-screen-label[data-star-label-id]"
    ) ?? [])
  ];

  if (!detail || controls.length === 0 || view.nodes.length === 0) {
    return;
  }

  let selectedId = "";

  const applyFocus = (nodeId, { commit = false, preview = false } = {}) => {
    const node = nodesById.get(String(nodeId ?? ""));

    if (!node) {
      if (commit || !preview) {
        selectedId = "";
        const focus = createStarMapFocusState(contextMap);

        controls.forEach((item) => item.setAttribute("aria-pressed", "false"));
        visualNodes.forEach((item) => {
          const itemId = String(item.dataset.starNodeId ?? "");
          item.setAttribute("data-focus-state", focus.nodes[itemId] ?? "default");
          item.setAttribute("data-context-path", "false");
        });
        visualEdges.forEach((item) => {
          const index = Number(item.dataset.edgeIndex);
          item.setAttribute("data-focus-state", focus.edges[index] ?? "default");
        });
        visualLabels.forEach((item) => {
          item.setAttribute("data-focus-state", "default");
        });
        detail.innerHTML = renderStarMapEmptyDetail();
        detail.setAttribute?.("data-detail-state", "closed");
        detail.setAttribute?.("hidden", "");
        stage?.setAttribute?.("data-universe-state", "default");
        canvas?.setAttribute?.("data-selected-node", "");
      }

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
      item.setAttribute(
        "data-context-path",
        ["selected", "related"].includes(state) || (preview && itemId === node.id)
          ? "true"
          : "false"
      );
    });
    visualEdges.forEach((item) => {
      const index = Number(item.dataset.edgeIndex);
      item.setAttribute("data-focus-state", focus.edges[index] ?? "quiet");
    });
    visualLabels.forEach((item) => {
      const itemId = String(item.dataset.starLabelId ?? "");
      const state = focus.nodes[itemId] ?? "dimmed";
      item.setAttribute(
        "data-focus-state",
        preview
          ? itemId === node.id
            ? "hovered"
            : "default"
          : state
      );
    });

    if (commit) {
      detail.innerHTML = renderStarMapDetail(node, view.nodes, view.edges);
      detail.removeAttribute?.("hidden");
      detail.setAttribute?.("data-detail-state", "selected");
      stage?.setAttribute?.("data-universe-state", "selected");
      canvas?.setAttribute?.("data-selected-node", node.id);
    }
  };

  const restoreSelection = () => {
    applyFocus(selectedId);
  };

  container?.addEventListener?.("click", (event) => {
    if (!event.target?.closest?.("[data-star-map-close]")) {
      return;
    }

    applyFocus("", { commit: true });
  });

  container?.addEventListener?.("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    applyFocus("", { commit: true });
  });

  controls.forEach((control) => {
    control.addEventListener("click", () =>
      applyFocus(control.dataset.starNodeId, { commit: true })
    );
    control.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        applyFocus("", { commit: true });
        return;
      }

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
    control.addEventListener("focus", () =>
      applyFocus(control.dataset.starNodeId, { preview: true })
    );
    control.addEventListener("blur", restoreSelection);
  });
}
