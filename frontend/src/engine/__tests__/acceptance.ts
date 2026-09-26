// Acceptance tests from the brief (grading, fold equity, side pots, robustness,
// bot stat convergence). Run via `npm test` (tsc transpile + node).
declare const process: { exit(code: number): void };

import { parseCards } from "../cards";
import { createHand, applyAction, distributePots, GameState, heroSeat, HandConfig, pot } from "../gameState";
import { botDecision, BOT_PROFILES } from "../bots";
import { computeActionEvs, EvContext, VillainModel } from "../ev";
import { initVillainRange } from "../rangeTracking";
import { gradeDecision } from "../grading";
import { ActionEv, BotProfileId } from "../types";

let pass = 0;
let fail = 0;
function assert(c: boolean, m: string) {
  if (c) pass++;
  else {
    fail++;
    console.log("FAIL:", m);
  }
}
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// ---------------------------------------------------------------------------
// 1. Fold equity is computed from the tracked range, not from a profile average.
//    Same board, same air hand, same size: EV(bluff vs nit) > EV(vs tag) > EV(vs whale).
// ---------------------------------------------------------------------------
function riverOpenSpot(): GameState {
  const st = createHand({ seatProfiles: [null, "tag", null, null, null, null] as any, buttonSeat: 1, startingStackBb: 100, bb: 1, sb: 0.5, handSeed: "fe-spot" });
  for (const s of st.seats) {
    s.folded = s.index !== 0 && s.index !== 1;
    s.committed = 0;
    s.invested = 10;
    s.stack = 90;
  }
  st.street = "river";
  st.board = parseCards("Ah Kd 9c 4s 2h");
  st.seats[0].hole = parseCards("7h 8h") as [any, any]; // pure air
  st.seats[1].hole = parseCards("Qs Qd") as [any, any];
  st.potAtFlop = 20;
  st.currentBet = 0;
  st.lastRaiseSize = 0;
  st.lastAggressor = -1;
  st.toAct = 0; // hero first to act, can bet
  return st;
}

function bluffEv(profileId: BotProfileId): { ev75: number; ctx: EvContext } {
  const st = riverOpenSpot();
  const villain: VillainModel = { weights: initVillainRange(parseCards("7h 8h Ah Kd 9c 4s 2h")), profile: BOT_PROFILES[profileId], committed: 0, stack: 90 };
  const ctx = computeActionEvs(st, villain.weights, { villains: [villain], maxIters: 600 });
  const bet75 = ctx.actions.find((a) => a.label === "Bet 75%")!;
  return { ev75: bet75.evBb, ctx };
}

const P0 = pot(riverOpenSpot());
const b75 = Math.round(P0 * 0.75);
const alpha = b75 / (P0 + b75);
console.log("\n[fold equity] river Ah Kd 9c 4s 2h, hero 7h8h, pot", P0, "bet 75% =", b75);
console.log("  PRIMA (fe = alpha × foldToCbet/45, EV bluff puro = fe·P − (1−fe)·b):");
const results: Record<string, number> = {};
for (const id of ["nit", "tag", "whale"] as BotProfileId[]) {
  const feOld = Math.min(0.92, Math.max(0.02, alpha * (BOT_PROFILES[id].foldToCbet / 45)));
  const evOld = feOld * P0 - (1 - feOld) * b75;
  console.log(`    ${id.padEnd(6)} fe=${feOld.toFixed(3)}  EV=${evOld.toFixed(2)} bb${id === "tag" ? "   ← tautologia: identicamente 0" : ""}`);
}
console.log("  DOPO (fe = Σ w_i·P(fold_i | size, board) / Σ w_i dal range tracciato):");
for (const id of ["nit", "tag", "whale"] as BotProfileId[]) {
  const { ev75 } = bluffEv(id);
  results[id] = ev75;
  console.log(`    ${id.padEnd(6)} EV=${ev75.toFixed(2)} bb`);
}
assert(results.nit > results.tag && results.tag > results.whale, "EV bluff: nit > tag > whale");
assert(results.nit - results.whale > 1, "bluff vs nit beats bluff vs whale by more than 1bb");
assert(Math.abs(results.tag) > 0.05, "bluff vs tag is not identically zero");

// ---------------------------------------------------------------------------
// 2–5. Grading acceptance cases (EvContext built from the brief's numbers).
// ---------------------------------------------------------------------------
function mkEv(state: GameState, equity: number, potBefore: number, callChips: number, extra: ActionEv[] = []): EvContext {
  const req = callChips > 0 ? callChips / (potBefore + 2 * callChips) : 0;
  const P = potBefore + callChips;
  const acts: ActionEv[] = [];
  if (callChips > 0) {
    acts.push({ action: { type: "fold" }, label: "Fold", evChips: 0, evBb: 0, stdErr: 0, rank: 0 });
    const evCall = equity * P - (1 - equity) * callChips;
    acts.push({ action: { type: "call", amount: callChips }, label: "Call", evChips: evCall, evBb: evCall / state.bb, stdErr: 0, rank: 0 });
  }
  acts.push(...extra);
  acts.sort((a, b) => b.evChips - a.evChips);
  acts.forEach((a, i) => (a.rank = i));
  return { equity, requiredEquity: req, potBeforeChips: potBefore, toCallChips: callChips, actions: acts, best: acts[0] };
}

function facingSpot(): GameState {
  const st = riverOpenSpot();
  st.street = "turn";
  st.board = parseCards("Ah Kd 9c 4s");
  return st;
}

// pot 100, villain bets 50, gutshot 16.5% vs 25% required, hero calls → POT_ODDS_CALL
{
  const st = facingSpot();
  const ev = mkEv(st, 0.165, 100, 50);
  const g = gradeDecision({ state: st, ev, chosen: { type: "call", amount: 50 }, chartWeight: 0, isOpenSpot: false, callChips: 50 });
  assert(g.verdict === "error" && g.errorCode === "POT_ODDS_CALL", `gutshot call → POT_ODDS_CALL (got ${g.verdict}/${g.errorCode})`);
  assert(g.pointsLost > 0, "POT_ODDS_CALL loses points > 0 (" + g.pointsLost + ")");
  assert(near(g.numbers.requiredEquity, 0.25, 1e-9), "required equity 25%");
}
// hero folds a flush draw with 35% vs 25% → FOLD_WITH_EQUITY
{
  const st = facingSpot();
  const ev = mkEv(st, 0.35, 100, 50);
  const g = gradeDecision({ state: st, ev, chosen: { type: "fold" }, chartWeight: 0, isOpenSpot: false, callChips: 50 });
  assert(g.verdict === "error" && g.errorCode === "FOLD_WITH_EQUITY", `fold flush draw → FOLD_WITH_EQUITY (got ${g.verdict}/${g.errorCode})`);
  assert(g.pointsLost > 0, "FOLD_WITH_EQUITY loses points");
}
// open-limp → LIMP, exactly 3.0
{
  const st = createHand({ seatProfiles: [null, "tag", "tag", "nit", "lag", "fish"], buttonSeat: 3, startingStackBb: 100, bb: 1, sb: 0.5, handSeed: "limp" });
  assert(st.toAct === 0 && st.seats[0].position === "UTG", "hero UTG first to act");
  const raise: ActionEv = { action: { type: "raise", amount: 2.5 }, label: "Raise", evChips: 0.6, evBb: 0.6, stdErr: 0, rank: 0 };
  const ev = mkEv(st, 0.2, 1.5, 1, [raise]); // limp EV −0.3 vs raise +0.6 → classified
  const g = gradeDecision({ state: st, ev, chosen: { type: "call", amount: 1 }, chartWeight: 0.8, isOpenSpot: true, callChips: 1 });
  assert(g.errorCode === "LIMP", `open-limp → LIMP (got ${g.errorCode})`);
  assert(g.pointsLost === 3.0, `LIMP penalty exactly 3.0 (got ${g.pointsLost})`);
}
// within 0.10bb of optimal → correct, 0 points
{
  const st = facingSpot();
  const ev = mkEv(st, 0.26, 100, 50); // call EV ≈ +1.0 chips vs fold 0 → within 0.1bb? use bb=1 → 0.01bb... make it explicit
  const call = ev.actions.find((a) => a.action.type === "call")!;
  const fold = ev.actions.find((a) => a.action.type === "fold")!;
  call.evBb = 0.08;
  call.evChips = 0.08;
  fold.evBb = 0;
  ev.actions.sort((a, b) => b.evBb - a.evBb);
  ev.actions.forEach((a, i) => (a.rank = i));
  ev.best = ev.actions[0];
  const g = gradeDecision({ state: st, ev, chosen: { type: "fold" }, chartWeight: 0, isOpenSpot: false, callChips: 50 });
  assert(g.verdict === "correct" && g.pointsLost === 0, `within 0.10bb → correct, 0 points (got ${g.verdict}/${g.pointsLost})`);
}

// ---------------------------------------------------------------------------
// 6. Side pots with three all-ins of different stacks.
// ---------------------------------------------------------------------------
{
  const st = createHand({ seatProfiles: [null, "tag", "tag", "nit", "lag", "fish"], buttonSeat: 0, startingStackBb: 100, bb: 1, sb: 0.5, handSeed: "sidepot" });
  for (const s of st.seats) {
    s.folded = s.index > 2;
    s.committed = 0;
  }
  // stacks 20 / 50 / 100, all in
  st.seats[0].invested = 20; st.seats[0].stack = 0; st.seats[0].allIn = true;
  st.seats[1].invested = 50; st.seats[1].stack = 0; st.seats[1].allIn = true;
  st.seats[2].invested = 100; st.seats[2].stack = 0; st.seats[2].allIn = true;
  st.seats[3].invested = 0; st.seats[4].invested = 0; st.seats[5].invested = 0;
  st.street = "river";
  st.board = parseCards("2c 7d 9h Js Kd");
  st.seats[0].hole = parseCards("As Ad") as [any, any]; // best: AA
  st.seats[1].hole = parseCards("Kh Qc") as [any, any]; // pair of kings
  st.seats[2].hole = parseCards("3s 4s") as [any, any]; // nothing
  distributePots(st);
  const w = st.seats.map((s) => s.stack);
  // main pot 60 (20×3) → seat 0; side pot 60 (30×2) → seat 1; remaining 50 back to seat 2
  assert(w[0] === 60, `main pot 60 to shortest all-in (got ${w[0]})`);
  assert(w[1] === 60, `side pot 60 to middle stack (got ${w[1]})`);
  assert(w[2] === 50, `uncalled 50 returned to big stack (got ${w[2]})`);
  assert(near(w[0] + w[1] + w[2], 170, 1e-9), "side pots conserve chips");
}

// ---------------------------------------------------------------------------
// 7. 10 000 hands: no illegal state, chips conserved.
// ---------------------------------------------------------------------------
function playOut(st: GameState) {
  let guard = 0;
  while (!st.finished && st.toAct !== -1) {
    const seat = st.seats[st.toAct];
    const restore = seat.profile;
    if (seat.isHero) seat.profile = "tag";
    applyAction(st, botDecision(st, st.toAct));
    seat.profile = restore;
    if (++guard > 400) throw new Error("guard tripped: hand did not terminate");
  }
}
{
  const N = 10000;
  let ok = true;
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const cfg: HandConfig = { seatProfiles: [null, "tag", "nit", "lag", "fish", "maniac"], buttonSeat: i % 6, startingStackBb: 100, bb: 1, sb: 0.5, handSeed: "h" + i };
    const st = createHand(cfg);
    try {
      playOut(st);
    } catch (e) {
      ok = false;
      console.log("hand", i, String(e));
      break;
    }
    const total = st.seats.reduce((s, x) => s + x.stack, 0);
    if (Math.abs(total - 600) > 1e-6 || !st.finished || st.seats.some((s) => s.stack < -1e-9)) {
      ok = false;
      console.log("illegal state / chip mismatch at hand", i, total, st.finished);
      break;
    }
  }
  console.log(`\n[robustness] ${N} hands in ${Date.now() - t0} ms`);
  assert(ok, `${N} hands without illegal state, chips conserved`);
}

// ---------------------------------------------------------------------------
// 8. Observed VPIP/PFR of every bot converge to its target within 3 points over 5 000 hands.
// ---------------------------------------------------------------------------
{
  const ids: BotProfileId[] = ["nit", "tag", "lag", "fish", "whale", "maniac"];
  const stats: Record<string, { hands: number; vpip: number; pfr: number }> = {};
  for (const id of ids) stats[id] = { hands: 0, vpip: 0, pfr: 0 };
  const N = 5000;
  for (let i = 0; i < N; i++) {
    // rotate profiles across seats so positions average out; hero seat plays as a bot too
    const rot = ids.map((_, k) => ids[(k + i) % ids.length]);
    const st = createHand({ seatProfiles: [null, rot[1], rot[2], rot[3], rot[4], rot[5]], buttonSeat: i % 6, startingStackBb: 100, bb: 1, sb: 0.5, handSeed: "s" + i });
    st.seats[0].profile = rot[0];
    let guard = 0;
    while (!st.finished && st.toAct !== -1 && guard++ < 400) applyAction(st, botDecision(st, st.toAct));
    const pre = st.log.filter((l) => l.street === "preflop");
    for (const s of st.seats) {
      const id = s.profile as BotProfileId;
      const mine = pre.filter((l) => l.seat === s.index);
      stats[id].hands++;
      const voluntarily = mine.some((l) => l.action.type === "raise" || (l.action.type === "call" && !(s.position === "BB" && (l.action.amount ?? 0) === 0)));
      if (voluntarily) stats[id].vpip++;
      if (mine.some((l) => l.action.type === "raise")) stats[id].pfr++;
    }
  }
  console.log("\n[bot stats] observed vs target over", N, "hands");
  for (const id of ids) {
    const s = stats[id];
    const vp = (s.vpip / s.hands) * 100;
    const pf = (s.pfr / s.hands) * 100;
    const t = BOT_PROFILES[id];
    console.log(`  ${id.padEnd(6)} VPIP ${vp.toFixed(1)} (target ${t.vpip})  PFR ${pf.toFixed(1)} (target ${t.pfr})`);
    assert(near(vp, t.vpip, 3), `${id} VPIP within 3 points`);
    assert(near(pf, t.pfr, 3), `${id} PFR within 3 points`);
  }
}

console.log(`\nACCEPTANCE TESTS: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
