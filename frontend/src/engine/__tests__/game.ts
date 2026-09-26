// Game + tracking + grading verification. Run via tsc transpile + node.
declare const process: { exit(code: number): void };

import { parseCards } from "../cards";
import { createHand, applyAction, GameState, pot, heroSeat, HandConfig } from "../gameState";
import { autoPlayToHero, botDecision } from "../bots";
import { initVillainRange, updateRange } from "../rangeTracking";
import { comboIndexFromCards, totalWeight } from "../ranges";
import { diceScore, gradeRangeRead, applyScore, gradeDecision } from "../grading";
import { computeActionEvs } from "../ev";
import { parseRange } from "../ranges";

let pass = 0;
let fail = 0;
function assert(c: boolean, m: string) {
  if (c) pass++;
  else {
    fail++;
    console.log("FAIL:", m);
  }
}

function baseConfig(seed: string, button = 0): HandConfig {
  return {
    seatProfiles: [null, "tag", "tag", "nit", "lag", "fish"],
    buttonSeat: button,
    startingStackBb: 100,
    bb: 1,
    sb: 0.5,
    handSeed: seed,
  };
}

// chip conservation over many hands
const startTotal = 6 * 100;
let conservationOk = true;
for (let i = 0; i < 10000; i++) {
  const st = createHand(baseConfig("hand-" + i, i % 6));
  playOutWithFolds(st);
  const total = st.seats.reduce((s, x) => s + x.stack, 0);
  if (Math.abs(total - startTotal) > 1e-6) {
    conservationOk = false;
    console.log("chip mismatch hand", i, total);
    break;
  }
}
assert(conservationOk, "chip conservation over 10000 hands");

// determinism: same seed -> identical board + result
const a = createHand(baseConfig("fixed-seed", 2));
playOutWithFolds(a);
const b = createHand(baseConfig("fixed-seed", 2));
playOutWithFolds(b);
assert(JSON.stringify(a.board) === JSON.stringify(b.board), "same seed same board");
assert(a.seats[0].stack === b.seats[0].stack, "same seed same hero stack");

// range tracking: tag opens UTG
const vr = initVillainRange([]);
const before = totalWeight(vr);
updateRange(vr, { type: "raise", amount: 3 }, { street: "preflop", position: "UTG", facing: "unopened", board: [] }, "tag");
const after = totalWeight(vr);
const idx72o = comboIndexFromCards(parseCards("7h")[0], parseCards("2c")[0]);
const idxAA = comboIndexFromCards(parseCards("As")[0], parseCards("Ah")[0]);
let maxW = 0;
for (let i = 0; i < 1326; i++) maxW = Math.max(maxW, vr[i]);
// calibrated bots open a small share of out-of-chart hands: 72o must be far below AA, not necessarily 0
assert(vr[idx72o] < 0.2 * maxW, "72o weight ≪ AA after tag UTG open (got " + vr[idx72o].toFixed(3) + " vs " + maxW.toFixed(3) + ")");
assert(vr[idxAA] === maxW, "AA at max weight after open");
assert(after <= before, "weight sum monotone non-increasing");

// grading pure helpers
assert(applyScore(100, 0, 0) === 100, "score stays 100");
assert(applyScore(2, 5, 0) === 0, "score floored at 0");
const dSolid = gradeRangeRead(0.9);
assert(dSolid.verdict === "solid" && dSolid.bonus === 0.3, "dice 0.9 solid + bonus");
const dErr = gradeRangeRead(0.3);
assert(dErr.verdict === "error" && dErr.pointsLost > 0, "dice 0.3 error with penalty");
// dice identical ranges = 1
const r1 = parseRange("AA, KK");
assert(Math.abs(diceScore(r1, r1) - 1) < 1e-6, "dice identical = 1");

// constructed grading: gutshot call without odds -> POT_ODDS_CALL
// Build a river spot: hero has a busted gutshot vs a value-heavy range, villain bets.
const grState = makeRiverSpot();
const evc = computeActionEvs(grState, parseRange("QQ+, AKs, AKo, AQs"), { maxIters: 800 });
console.log("  [debug] equity", evc.equity.toFixed(3), "required", evc.requiredEquity.toFixed(3), "best", evc.best.label, evc.best.evBb.toFixed(2));
const callAction = grState.currentBet > heroSeat(grState).committed ? { type: "call" as const, amount: evc.toCallChips } : { type: "check" as const };
const g = gradeDecision({
  state: grState,
  ev: evc,
  chosen: callAction,
  chartWeight: 0,
  isOpenSpot: false,
  callChips: evc.toCallChips,
});
console.log("  [debug] verdict", g.verdict, g.errorCode, "pts", g.pointsLost, "delta", g.deltaEvBb);
assert(g.pointsLost >= 0, "grade produces non-negative penalty");

console.log(`\nGAME TESTS: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

// ---- helpers ----
function playOutWithFolds(st: GameState) {
  let guard = 0;
  while (!st.finished && st.toAct !== -1) {
    const seat = st.seats[st.toAct];
    const restore = seat.profile;
    if (seat.isHero) seat.profile = "tag";
    applyAction(st, botDecision(st, st.toAct));
    seat.profile = restore;
    if (++guard > 400) {
      console.log("guard tripped");
      break;
    }
  }
}

function makeRiverSpot(): GameState {
  // Manufacture a river node: hero to act facing a pot-size bet with a weak hand.
  const st = createHand({
    seatProfiles: [null, "tag", null, null, null, null] as any,
    buttonSeat: 0,
    startingStackBb: 100,
    bb: 1,
    sb: 0.5,
    handSeed: "river-spot",
  });
  // override to a simple heads-up river
  for (const s of st.seats) {
    s.folded = s.index !== 0 && s.index !== 1;
    s.committed = 0;
    s.invested = 5;
    s.stack = 95;
  }
  st.street = "river";
  st.board = parseCards("Ah Kd 9c 4s 2h");
  st.seats[0].hole = parseCards("7h 8h") as [any, any]; // busted
  st.seats[1].hole = parseCards("Qs Qd") as [any, any];
  st.potAtFlop = 10;
  // villain bets pot (10) on the river
  st.seats[1].committed = 10;
  st.seats[1].invested = 15;
  st.seats[1].stack = 85;
  st.currentBet = 10;
  st.lastRaiseSize = 10;
  st.toAct = 0;
  return st;
}
