#!/usr/bin/env node
// Runs every file in src/**/__tests__/*.ts (transpiled, then executed with node). Exit 1 on failure.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { transpileSrc, walk } = require("./lib/transpile");

const root = path.join(__dirname, "..");
const { out, srcDir } = transpileSrc(root);
const tests = walk(srcDir).filter((f) => /__tests__/.test(f));
let failed = 0;
for (const t of tests) {
  const js = path.join(out, path.relative(srcDir, t).replace(/\.ts$/, ".js"));
  console.log(`\n=== ${path.relative(root, t)} ===`);
  try {
    execFileSync(process.execPath, [js], { stdio: "inherit" });
  } catch {
    failed++;
  }
}
fs.rmSync(out, { recursive: true, force: true });
console.log(`\n${tests.length - failed}/${tests.length} test files passed`);
process.exit(failed ? 1 : 0);
