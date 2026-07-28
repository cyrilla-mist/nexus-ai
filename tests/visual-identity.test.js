import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderProjectSpace } from "../frontend/project-space.js";

const html = readFileSync(new URL("../frontend/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../frontend/style.css", import.meta.url), "utf8");

function minimalExperience() {
  return {
    projectOverview: {
      title: "校园低碳循环计划",
      description: "验证校园一次性用品使用的真实原因。",
      stage: "Explore",
      goal: "完成需求验证。",
      summary: "让校园环保成为可验证项目。"
    }
  };
}

test("Hero gives Nexus identity priority over product position and slogan", () => {
  const brandIndex = html.indexOf('class="hero-brand"');
  const positionIndex = html.indexOf('class="hero-product-position"');
  const sloganIndex = html.indexOf('class="hero-slogan"');

  assert.ok(brandIndex >= 0);
  assert.ok(positionIndex > brandIndex);
  assert.ok(sloganIndex > positionIndex);
  assert.match(html, />Nexus AI</);
  assert.match(html, /AI Project Intelligence Space/);
  assert.match(html, /Connect ideas,[\s\S]*create possibilities/);
  assert.match(html, /class="hero-enter-action" href="#entry-space"/);
});

test("Global fixed header is replaced by a lightweight theme entry", () => {
  assert.doesNotMatch(html, /hero-toolbar/);
  assert.match(html, /class="theme-toggle hero-theme-toggle"/);
  assert.match(css, /\.hero-theme-toggle\s*\{[\s\S]*?position: absolute/);
  assert.match(css, /body\.demo-body \.demo-nav\s*\{[\s\S]*?position: absolute/);
});

test("Morning Mist and Quiet Deep Space use distinct semantic tokens", () => {
  assert.match(css, /Nexus AI v0\.8\.1 · 晨雾星图/);
  assert.match(css, /--background-base: #f3f5f8/);
  assert.match(css, /--accent: #627fb5/);
  assert.match(css, /Nexus AI v0\.8\.1 · 静谧深空/);
  assert.match(css, /--background-base: #080d18/);
  assert.match(css, /--accent: #7e9fd9/);
  assert.match(css, /--brand-orbit:/);
  assert.match(css, /--brand-route:/);
});

test("Workspace identity moves from a top bar into project navigation", () => {
  const workspace = renderProjectSpace(minimalExperience());

  assert.doesNotMatch(workspace, /project-space-app-header/);
  assert.match(workspace, /project-space-project-anchor/);
  assert.match(workspace, /project-space-mobile-anchor/);
  assert.match(workspace, /Context linked · Growth visible/);
  assert.match(css, /\.project-space-navigation::before/);
});

test("Visual identity preserves mobile entry and first-stage Star Map adaptation", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.hero-brand/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.project-space-mobile-anchor/);
  assert.match(css, /\.project-space-panel \.star-map-stage\s*\{[\s\S]*?radial-gradient/);
  assert.match(css, /\.project-space-panel \.star-map-orbit\s*\{[\s\S]*?stroke-dasharray/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});