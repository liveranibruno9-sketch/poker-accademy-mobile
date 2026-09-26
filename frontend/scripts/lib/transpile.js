// Transpile src/**/*.ts (engine + content, no UI modules) to a temp dir with
// "@/src/…" imports rewritten. Returns the output dir.
const fs = require("fs");
const path = require("path");
const os = require("os");
const ts = require("typescript");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function transpileSrc(root) {
  const srcDir = path.join(root, "src");
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "pa-src-"));
  for (const file of walk(srcDir)) {
    const code = fs.readFileSync(file, "utf8");
    if (/from ["']react|from ["']expo|from ["']@react|from ["']zustand/.test(code)) continue;
    const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
    const rewritten = js.replace(/require\("@\/src\/([^"]+)"\)/g, (_, p) => `require("${path.join(out, p).replace(/\\/g, "/")}")`);
    const dest = path.join(out, path.relative(srcDir, file).replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, rewritten);
  }
  return { out, srcDir, walk };
}

module.exports = { transpileSrc, walk };
