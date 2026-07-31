import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("collapsed sidebar has no duplicate floating restore control", () => {
	const css = readFileSync("src/renderer/src/styles.css", "utf8");
	const app = readFileSync("src/renderer/src/App.tsx", "utf8");
	assert.doesNotMatch(css, /\.list-toggle-native\.floating\s*\{/);
	assert.doesNotMatch(app, /className="list-toggle-native floating"/);
});
