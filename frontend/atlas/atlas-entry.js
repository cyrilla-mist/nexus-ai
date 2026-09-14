const LEGACY_ROUTES = new Set(["map", "territory", "reentry"]);
const PRODUCT_ROUTES = new Set(["desk", "source-intake"]);

function currentRoute() {
  const route = window.location.hash.replace("#", "");
  if (PRODUCT_ROUTES.has(route) || LEGACY_ROUTES.has(route)) return route;
  return "desk";
}

function replaceRoute(route) {
  const target = new URL(window.location.href);
  target.hash = route;
  window.location.replace(target);
}

const initialRoute = currentRoute();

// The legacy Atlas app owns its own route listener. Capture Product Surface navigation
// before that listener so returning from historical routes re-enters the Phase 5 surfaces.
if (LEGACY_ROUTES.has(initialRoute)) {
  document.addEventListener(
    "click",
    (event) => {
      const control = event.target.closest?.("[data-atlas-route]");
      if (!PRODUCT_ROUTES.has(control?.dataset.atlasRoute)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      replaceRoute(control.dataset.atlasRoute);
    },
    true,
  );
}

if (initialRoute === "desk") {
  await import("./atlas-desk.js");
} else if (initialRoute === "source-intake") {
  await import("./atlas-source-intake.js");
} else {
  await import("./atlas-app.js");
}
