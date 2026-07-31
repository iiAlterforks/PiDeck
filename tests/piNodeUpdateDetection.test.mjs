import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const require = createRequire(import.meta.url);

function loadExtensionManager() {
	const source = readFileSync("src/main/extensions/ExtensionManager.ts", "utf8");
	const output = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	const sandbox = {
		exports: {},
		process,
		require: (id) => {
			if (id === "../wsl/WslPaths") return { toWindowsHostPath: (path) => path };
			return require(id);
		},
	};
	vm.runInNewContext(output, sandbox, { filename: "ExtensionManager.ts" });
	return sandbox.exports;
}

test("recognizes only pi-node's top-level Pi shim as npm-managed", () => {
	const { getPiNodeRuntimeDir } = loadExtensionManager();

	assert.equal(
		getPiNodeRuntimeDir("C:\\Users\\yuholy\\AppData\\Local\\pi-node\\current\\pi.cmd"),
		"C:\\Users\\yuholy\\AppData\\Local\\pi-node\\current",
	);
	assert.equal(getPiNodeRuntimeDir("C:\\nvm4w\\nodejs\\pi.cmd"), null);
	assert.equal(
		getPiNodeRuntimeDir("C:\\Users\\yuholy\\AppData\\Local\\pi-node\\current\\node_modules\\pi\\cli.js"),
		null,
	);
});

test("updates pi-node installs through its bundled npm with network access", async () => {
	const { ExtensionManager } = loadExtensionManager();
	const piCommand = "C:\\Users\\yuholy\\AppData\\Local\\pi-node\\current\\pi.cmd";
	const manager = new ExtensionManager(
		{ resolveCommand: () => piCommand },
		() => ({}),
		() => ({}),
		async () => ({}),
	);
	manager.checkPiUpdate = async () => ({ hasUpdate: true });
	let invocation;
	manager.runCommand = async (...args) => {
		invocation = args;
		return "updated";
	};

	const result = await manager.updatePi();

	assert.equal(invocation[0], "C:\\Users\\yuholy\\AppData\\Local\\pi-node\\current\\npm.cmd");
	assert.deepEqual([...invocation[1]], ["install", "@earendil-works/pi-coding-agent@latest", "--save"]);
	assert.equal(invocation[2], 120_000);
	assert.equal(invocation[3].offline, false);
	assert.equal(result.updated, true);
});
