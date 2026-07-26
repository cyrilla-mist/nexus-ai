import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(
  new URL("../frontend/index.html", import.meta.url),
  "utf8"
);
const app = readFileSync(
  new URL("../frontend/app.js", import.meta.url),
  "utf8"
);
const css = readFileSync(
  new URL("../frontend/style.css", import.meta.url),
  "utf8"
);

test("Product Entry renders Welcome, Create, Continue, and Explore paths", () => {
  assert.match(html, /id="nexus-entry"/);
  assert.match(html, /id="entry-space"/);
  assert.match(html, /id="create-project-entry-button"/);
  assert.match(html, /id="continue-project-entry-button"/);
  assert.match(html, /id="explore-space-button"/);
  assert.match(html, /id="project-space-result"[\s\S]*?hidden/);
  assert.match(html, /项目内容只保存在当前浏览器标签页的临时 Session/);
});

test("Create Project reuses the existing analysis flow and replaces local state explicitly", () => {
  assert.match(app, /createProjectEntryButton\.addEventListener\("click", beginProjectCreation\)/);
  assert.match(app, /async function submitIdea\(\)/);
  assert.match(app, /提交当前想法会创建新项目并替换本标签页中的已恢复进度/);
  assert.match(app, /resultSection\.hidden = true;[\s\S]*?updateEntryExperience\(\);[\s\S]*?await submitPayload/);
});

test("Continue Project restores only a recoverable tab session", () => {
  assert.match(app, /function hasRecoverableSession\(state = sessionState\)/);
  assert.match(app, /state\.initialMessage[\s\S]*?state\.currentAnalysis[\s\S]*?state\.lastResult\?\.response/);
  assert.match(app, /continueProjectEmpty\.hidden = recoverable/);
  assert.match(app, /continueProjectSummary\.hidden = !recoverable/);
  assert.match(app, /renderResult\(sessionState\.lastResult, \{ revealProjectSpace: false \}\)/);
  assert.match(html, /当前标签页还没有可恢复的项目/);
});

test("Explore Space opens the existing read-only Project Space", () => {
  assert.match(app, /function openProjectSpace\(\{ moveFocus = true \} = \{\}\)/);
  assert.match(app, /resultSection\.hidden = false/);
  assert.match(app, /exploreSpaceButton\.addEventListener\("click", \(\) => openProjectSpace\(\)\)/);
  assert.match(html, /Project Overview、Journey、Action Navigator、Context Map 与 Star Map/);
});

test("Product Entry inherits both themes and has responsive fallbacks", () => {
  assert.match(html, /id="theme-toggle"/);
  assert.match(css, /:root\s*\{/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /\.entry-space\s*\{/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.entry-choice-grid\s*\{[\s\S]*?grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?\.entry-route\s*\{[\s\S]*?grid-template-columns: 1fr/);
});