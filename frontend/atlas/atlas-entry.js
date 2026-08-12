const LEGACY_ROUTES = new Set(["map", "territory", "reentry"]);

function currentRoute() {
  const route = window.location.hash.replace("#", "");
  return LEGACY_ROUTES.has(route) ? route : "desk";
}

function replaceRoute(route) {
  const target = new URL(window.location.href);
  target.hash = route;
  window.location.replace(target);
}

const initialRoute = currentRoute();

// The legacy Atlas app owns its own route listener. Capture Desk navigation before
// that listener so returning from a historical route re-enters the Phase 5 Desk.
if (initialRoute !== "desk") {
  document.addEventListener(
    "click",
    (event) => {
      const control = event.target.closest?.("[data-atlas-route]");
      if (control?.dataset.atlasRoute !== "desk") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      replaceRoute("desk");
    },
    true,
  );
}

if (initialRoute === "desk") {
  await import("./atlas-desk.js");
} else {
  await import("./atlas-app.js");
}
