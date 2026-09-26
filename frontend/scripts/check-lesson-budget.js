#!/usr/bin/env node
// Word budget check for lesson sub-screens (brief §B): max 60 words per slide, target 35–45.
// Counts the text visible at once on a slide: kicker, heading, text/formula/example/table/
// warning/takeaway blocks, pretest prompt + options + the longest single feedback, and for
// exercises the heaviest single item (prompt + longest feedback). Exits 1 on any violation.
// Usage: node scripts/check-lesson-budget.js [LESSON_ID ...]   (default: all lessons with `role` slides)

const fs = require("fs");
const path = require("path");
const os = require("os");
const ts = require("typescript");

const MAX = 60;
const src = fs.readFileSync(path.join(__dirname, "..", "src", "content", "curriculum.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const tmp = path.join(os.tmpdir(), `curriculum-${Date.now()}.js`);
fs.writeFileSync(tmp, js);
const { LESSONS } = require(tmp);
fs.unlinkSync(tmp);

const words = (t) => String(t ?? "").replace(/\[\[|\]\]/g, "").trim().split(/\s+/).filter((w) => w && !/^[·—–|→=×+\-/()]+$/.test(w)).length;
const longest = (arr) => Math.max(0, ...arr.map(words));

function slideWords(slide) {
  let n = words(slide.kicker) + words(slide.heading);
  for (const b of slide.blocks) {
    switch (b.kind) {
      case "text": case "warning": case "takeaway": n += words(b.text); break;
      case "formula": n += b.lines.reduce((a, l) => a + words(l), 0); break;
      case "example": n += words(b.given) + b.steps.reduce((a, l) => a + words(l), 0) + words(b.result); break;
      case "table": n += b.headers.reduce((a, l) => a + words(l), 0) + b.rows.flat().reduce((a, l) => a + words(l), 0); break;
      case "pretest": n += words(b.prompt) + b.options.reduce((a, l) => a + words(l), 0) + longest(b.feedback); break;
      case "exercise": n += Math.max(...b.items.map((it) => words(it.prompt) + Math.max(words(it.correct), words(it.fallback), longest(it.wrong.map((w) => w.text))))); break;
      default: break;
    }
  }
  return n;
}

const only = process.argv.slice(2);
let failed = false;
for (const lesson of LESSONS) {
  const structured = lesson.slides.some((s) => s.role);
  if (only.length ? !only.includes(lesson.id) : !structured) continue;
  console.log(`\n${lesson.id} — ${lesson.title} (${lesson.slides.length} sub-schermate)`);
  let total = 0;
  lesson.slides.forEach((s, i) => {
    const n = slideWords(s);
    total += n;
    const flag = n > MAX ? "  ✕ SUPERA 60" : n < 35 || n > 45 ? "  (fuori obiettivo 35–45)" : "";
    if (n > MAX) failed = true;
    console.log(`  ${i + 1}/${lesson.slides.length} ${String(s.role ?? "-").padEnd(9)} ${String(n).padStart(3)} parole${flag}`);
  });
  console.log(`  totale: ${total} parole`);
  if (structured && lesson.slides.length !== 7) console.log(`  ! attese 7 sub-schermate, trovate ${lesson.slides.length}`);
}
if (failed) {
  console.error("\nFAIL: almeno una sub-schermata supera 60 parole.");
  process.exit(1);
}
console.log("\nOK: nessuna sub-schermata supera 60 parole.");
