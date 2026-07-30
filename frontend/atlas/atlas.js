const sourceParts = [
  "./frontend/atlas/source/atlas.part-00.js",
  "./frontend/atlas/source/atlas.part-01.js",
  "./frontend/atlas/source/atlas.part-02.js",
];

try {
  const sources = await Promise.all(
    sourceParts.map(async (sourcePart) => {
      const response = await fetch(sourcePart, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Atlas source part is unavailable: ${sourcePart}`);
      }
      return response.text();
    }),
  );

  const moduleUrl = URL.createObjectURL(
    new Blob([sources.join("")], { type: "text/javascript" }),
  );

  try {
    await import(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
} catch (error) {
  console.error(error);
  const main = document.querySelector("#atlas-main");
  const sourceSummary = document.querySelector("#atlas-source-summary");
  if (sourceSummary) sourceSummary.textContent = "Atlas source unavailable";
  if (main) {
    main.innerHTML = `<section class="atlas-card"><span class="card-kicker">SOURCE ERROR</span><h2>The Atlas could not open</h2><p>${String(error.message || error)}</p></section>`;
  }
}
