import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const require = createRequire(import.meta.url);

function loadConfigManager() {
	const source = readFileSync("src/main/config/ConfigManager.ts", "utf8");
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	});
	const sandbox = {
		exports: {},
		require: (id) => {
			if (id === "node:fs/promises") return {};
			if (id === "node:path") return path.win32;
			if (id === "electron") return { net: {} };
			if (id === "./baseUrlPath") {
				return {
					ensureOpenAiVersionPath: (baseUrl) => `${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/v1`,
					needsSessionBaseUrlVersionHint: () => false,
					suggestNormalizedBaseUrl: () => null,
				};
			}
			return require(id);
		},
	};
	vm.runInNewContext(outputText, sandbox, { filename: "ConfigManager.ts" });
	return sandbox.exports.ConfigManager;
}

test("model fetching preserves configured provider User-Agent", () => {
	const ConfigManager = loadConfigManager();
	const manager = new ConfigManager("C:\\PiDeck\\config");
	const [request] = manager.buildModelsRequest(
		"https://openproxy.example",
		"test-key",
		"openai-completions",
		{ "User-Agent": "pi-coding-agent" },
	);

	assert.equal(request.url, "https://openproxy.example/v1/models");
	assert.equal(request.headers["User-Agent"], "pi-coding-agent");
	assert.equal(request.headers.Authorization, "Bearer test-key");
});
