import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../demo.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../demo.css", import.meta.url), "utf8");

test("GitHub Pages root renders the complete Nexus demo entry", () => {
  assert.match(page, /Nexus AI/);
  assert.match(page, /Connect ideas,[\s\S]*create possibilities/);
  assert.match(page, /id="project-space"/);
  assert.match(page, /校园环保创新项目/);
  assert.match(page, /src="\.\/demo\.js"/);
  assert.match(page, /href="\.\/frontend\/style\.css"/);
});

test("Demo uses static data and never calls the Worker or an API", () => {
  assert.doesNotMatch(script, /\bfetch\s*\(/);
  assert.doesNotMatch(script, /\/api\/nexus|DEEPSEEK|API_ENDPOINT/);
  assert.match(script, /const demoExperience = Object\.freeze/);
  assert.match(script, /const demoContextMap = Object\.freeze/);
});

test("Demo covers Project Overview, Journey, Context Map, Star Map, and Action", () => {
  assert.match(script, /renderProjectSpace\(demoExperience\)/);
  assert.match(script, /renderContextMap\(demoContextMap\)/);
  assert.match(script, /bindContextMapInteractions/);
  assert.match(script, /bindStarMapInteractions/);

  for (const stage of ["Idea", "Explore", "Design", "Validate", "Execute"]) {
    assert.match(script, new RegExp(`name: "${stage}"`));
  }
});

test("Static Context Graph includes every first-version node type", () => {
  for (const type of [
    "project",
    "problem",
    "decision",
    "milestone",
    "task",
    "progress"
  ]) {
    assert.match(script, new RegExp(`type: "${type}"`));
  }

  for (const relation of ["addresses", "supports", "contains", "updates"]) {
    assert.match(script, new RegExp(`relation: "${relation}"`));
  }
});

test("Demo inherits dual themes and provides desktop/mobile layouts", () => {
  assert.match(page, /id="demo-theme-toggle"/);
  assert.match(script, /applyTheme\(document\.documentElement, theme\)/);
  assert.match(styles, /var\(--background-mist\)/);
  assert.match(styles, /var\(--surface-primary\)/);
  assert.match(styles, /@media \(max-width: 860px\)/);
  assert.match(styles, /@media \(max-width: 560px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});