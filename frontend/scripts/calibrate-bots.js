#!/usr/bin/env node
// Fits BOT_PROFILES[*].calib so observed VPIP/PFR converge to the profile targets.
// Prints the constants to paste into src/engine/bots.ts. Usage: node scripts/calibrate-bots.js [iters] [hands]
const path = require("path");
const fs = require("fs");
const { transpileSrc } = require("./lib/transpile");

const iters = +(process.argv[2] || 10);
const hands = +(process.argv[3] || 3000);
const root = path.join(__dirname, "..");
const { out } = transpileSrc(root);
const { createHand, applyAction } = require(path.join(out, "engine/gameState.js"));
const { botDecision, BOT_PROFILES } = require(path.join(out, "engine/bots.js"));
const ids = ["nit", "tag", "lag", "fish", "whale", "maniac"];

function measure(n) {
  const st = {};
  for (const id of ids) st[id] = { hands: 0, vpip: 0, pfr: 0 };
  for (let i = 0; i < n; i++) {
    const rot = ids.map((_, k) => ids[(k + i) % ids.length]);
    const s = createHand({ seatProfiles: [null, rot[1], rot[2], rot[3], rot[4], rot[5]], buttonSeat: i % 6, startingStackBb: 100, bb: 1, sb: 0.5, handSeed: "c" + i });
    s.seats[0].profile = rot[0];
    let g = 0;
    while (!s.finished && s.toAct !== -1 && g++ < 400) applyAction(s, botDecision(s, s.toAct));
    const pre = s.log.filter((l) => l.street === "preflop");
    for (const seat of s.seats) {
      const mine = pre.filter((l) => l.seat === seat.index);
      const r = st[seat.profile];
      r.hands++;
      if (mine.some((l) => l.action.type === "raise" || l.action.type === "call")) r.vpip++;
      if (mine.some((l) => l.action.type === "raise")) r.pfr++;
    }
  }
  const res = {};
  for (const id of ids) res[id] = { vpip: (st[id].vpip / st[id].hands) * 100, pfr: (st[id].pfr / st[id].hands) * 100 };
  return res;
}

const clampM = (v) => Math.max(0.05, Math.min(12, v));
for (let it = 0; it < iters; it++) {
  const obs = measure(hands);
  let maxErr = 0;
  for (const id of ids) {
    const p = BOT_PROFILES[id];
    const o = obs[id];
    maxErr = Math.max(maxErr, Math.abs(o.vpip - p.vpip), Math.abs(o.pfr - p.pfr));
    // PFR is driven by opens (and 3-bets); passive VPIP (vpip - pfr) by limps + flat calls.
    const kr = Math.pow(p.pfr / Math.max(0.5, o.pfr), 0.8);
    p.calib.open = clampM(p.calib.open * kr);
    p.calib.threeBet = clampM(p.calib.threeBet * kr);
    const passiveT = Math.max(0.5, p.vpip - p.pfr);
    const passiveO = Math.max(0.5, o.vpip - o.pfr);
    const k = Math.pow(passiveT / passiveO, 0.8);
    p.calib.limp = clampM(p.calib.limp * k);
    p.calib.cont = clampM(p.calib.cont * k);
  }
  console.log(`iter ${it + 1}: max error ${maxErr.toFixed(1)} pts`);
  if (maxErr < 1.5) break;
}
const final = measure(5000);
console.log("\nfinal (5000 hands):");
for (const id of ids) {
  const p = BOT_PROFILES[id];
  console.log(`  ${id.padEnd(6)} VPIP ${final[id].vpip.toFixed(1)}/${p.vpip}  PFR ${final[id].pfr.toFixed(1)}/${p.pfr}  calib: { open: ${p.calib.open.toFixed(3)}, limp: ${p.calib.limp.toFixed(3)}, cont: ${p.calib.cont.toFixed(3)}, threeBet: ${p.calib.threeBet.toFixed(3)} }`);
}
fs.rmSync(out, { recursive: true, force: true });
