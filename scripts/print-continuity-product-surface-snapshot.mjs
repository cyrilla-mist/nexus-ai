import { buildAcceptedContinuityBrowserFixtureV01 } from "../tests/helpers/continuity-product-surface-browser-fixture.mjs";

const snapshot = await buildAcceptedContinuityBrowserFixtureV01();
process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
