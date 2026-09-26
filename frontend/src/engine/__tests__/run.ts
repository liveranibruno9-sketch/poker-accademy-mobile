// Standalone engine verification (run via tsc transpile + node). Not a UI file.
import { requiredEquity, mdf, alpha, EXACT_OUTS, clamp } from "../math";
import { parseCards, formatCards } from "../cards";
import { evaluate, evaluateFull, CATEGORY } from "../evaluator";
import { parseRange, rangePercent, totalWeight, comboIndexFromCards } from "../ranges";
import { rfiRange } from "../charts";
import { handVsHand, handVsRange } from "../equity";

declare const process: { exit(code: number): void };
let pass = 0;
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log("FAIL:", msg);
  }
}
function near(a: number, b: number, tol: number, msg: string) {
  assert(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b}±${tol})`);
}

// math
near(requiredEquity(100, 50), 0.25, 1e-9, "requiredEquity 100/50");
near(mdf(100, 50), 2 / 3, 1e-9, "mdf 100/50");
near(alpha(100, 50), 1 / 3, 1e-9, "alpha 100/50");
near(EXACT_OUTS[9].flopToRiver, 0.35, 1e-9, "9 outs flop");

// evaluator
const sf = evaluate(parseCards("Ah Kh Qh Jh Th"));
assert(sf.category === CATEGORY.STRAIGHT_FLUSH, "royal is straight flush");
const wheel = evaluateFull(parseCards("Ah 2c 3d 4s 5h"));
assert(wheel.category === CATEGORY.STRAIGHT, "wheel is a straight");
const quads = evaluate(parseCards("As Ah Ad Ac Kh"));
const fh = evaluate(parseCards("As Ah Ad Kc Kh"));
assert(quads.value > fh.value, "quads beat full house");
const flush = evaluate(parseCards("Ah Th 8h 5h 2h"));
const straight = evaluate(parseCards("9c 8d 7h 6s 5c"));
assert(flush.value > straight.value, "flush beats straight");
// 7-card best
const seven = evaluateFull(parseCards("Ah Kh Qh Jh Th 2c 3d"));
assert(seven.category === CATEGORY.STRAIGHT_FLUSH, "7-card picks royal");

// ranges
const r77 = parseRange("77+");
// 77+ = 77,88,99,TT,JJ,QQ,KK,AA = 8 pairs * 6 = 48 combos
near(totalWeight(r77), 48, 0.01, "77+ combos");
const rATs = parseRange("ATs+");
// ATs,AJs,AQs,AKs = 4*4 = 16
near(totalWeight(rATs), 16, 0.01, "ATs+ combos");
const rKQo = parseRange("KQo");
near(totalWeight(rKQo), 12, 0.01, "KQo combos");
const rDash = parseRange("A5s-A2s");
near(totalWeight(rDash), 16, 0.01, "A5s-A2s combos"); // A5s,A4s,A3s,A2s =16
const btn = rfiRange("BTN");
const btnPct = rangePercent(btn);
assert(btnPct > 35 && btnPct < 50, `BTN RFI ~42% (got ${btnPct.toFixed(1)})`);
const utg = rangePercent(rfiRange("UTG"));
assert(utg > 12 && utg < 20, `UTG RFI ~16% (got ${utg.toFixed(1)})`);

// equity
const aakk = handVsHand(parseCards("As Ah"), parseCards("Ks Kh"));
near(aakk.equity, 0.82, 0.02, "AA vs KK ~82%");
const aa72 = handVsHand(parseCards("As Ah"), parseCards("7d 2c"));
near(aa72.equity, 0.88, 0.02, "AA vs 72o ~88%");
const aksqq = handVsHand(parseCards("As Ks"), parseCards("Qd Qh"));
near(aksqq.equity, 0.46, 0.03, "AKs vs QQ ~46%");
// determinism
const a = handVsHand(parseCards("As Ah"), parseCards("Ks Kh")).equity;
const b = handVsHand(parseCards("As Ah"), parseCards("Ks Kh")).equity;
assert(a === b, "handVsHand deterministic");

// hand vs range vs a tight range on a board
const eqVsRange = handVsRange(parseCards("Ah Kh"), parseRange("QQ+, AKs, AKo"), parseCards("Qh 7d 2c"));
assert(eqVsRange.equity > 0 && eqVsRange.equity < 1, "handVsRange in range");

console.log(`\nENGINE TESTS: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
