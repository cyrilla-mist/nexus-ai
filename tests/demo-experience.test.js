import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../demo.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../demo.css", import.meta.url), "utf8");

test("GitHub Pages root promotes the Nexus Atlas landing entry", () => {
  assert.match(page, /NEXUS[\s\S]*ATLAS/);
  assert.match(page, /Personal Intelligence Infrastructure/);
  assert.match(page, /Connect ideas,[\s\S]*create possibilities/);
  assert.match(page, /href="\.\/atlas\.html"/);
  assert.match(page, />\s*Enter Atlas/);
  assert.match(page, /Newsreader/);
  assert.match(page, /IBM Plex Mono/);
  assert.doesNotMatch(page, /demo\.js|id="project-space"|校园环保创新项目/);
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

test("Atlas landing provides editorial mobile layout while legacy demo assets remain available", () => {
  assert.match(page, /@media \(max-width: 700px\)/);
  assert.match(page, /@media \(max-width: 390px\)/);
  assert.match(page, /min-height: 100vh/);
  assert.match(page, /font: 500[\s\S]*Newsreader/);
  assert.match(page, /font: 500[\s\S]*IBM Plex Mono/);
  assert.match(script, /applyTheme\(document\.documentElement, theme\)/);
  assert.match(styles, /var\(--background-mist\)/);
  assert.match(styles, /@media \(max-width: 860px\)/);
});
