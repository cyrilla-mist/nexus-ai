import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const css = await readFile(new URL("frontend/atlas/atlas.css", root), "utf8");

test("8F desktop Context Inspector remains visible while the main continuity page scrolls", () => {
  assert.match(
    css,
    /\.context-inspector\s*\{[^}]*position:\s*sticky;[^}]*top:\s*74px;[^}]*align-self:\s*start;[^}]*max-height:\s*calc\(100vh - 130px\);[^}]*overflow-y:\s*auto;/s,
  );
});

test("8F desktop closed state still removes the Inspector from layout", () => {
  assert.match(css, /\.context-inspector\.is-closed\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css, /\.atlas-shell:has\(\.context-inspector\.is-closed\)\s*\{\s*grid-template-columns:\s*238px minmax\(0,1fr\);\s*\}/);
});

test("8F existing responsive Inspector presentations still override desktop sticky positioning", () => {
  assert.match(
    css,
    /@media \(max-width: 1120px\)[\s\S]*?\.context-inspector\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*74px 0 56px auto;/,
  );
  assert.match(
    css,
    /@media \(max-width: 820px\)[\s\S]*?\.context-inspector\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*auto 0 0;/,
  );
});
