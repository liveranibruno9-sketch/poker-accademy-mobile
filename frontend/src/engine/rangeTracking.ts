// Bayesian range tracking. Every villain starts with all combos at weight 1
// (minus blockers). Each observed action multiplies each combo's weight by the
// probability the bot's policy would take that action with that combo. The
// result is the bot's TRUE range (policy is code), not an estimate.

import { botProbForCombo } from "./referencePolicy";
import { fullRange, removeBlocked, ALL_COMBOS } from "./ranges";
import { BOT_PROFILES } from "./bots";
import { Action, BotProfileId, Card } from "./types";
import { cardFromIndex } from "./cards";

export interface TrackNode {
  street: "preflop" | "flop" | "turn" | "river";
  position: string;
  facing: "unopened" | "vsRaise" | "postflopFacing" | "postflopOpen";
  board: Card[];
}

export function initVillainRange(blockers: Card[]): Float32Array {
  const r = fullRange();
  removeBlocked(r, blockers);
  return r;
}

export function updateRange(
  weights: Float32Array,
  action: Action,
  node: TrackNode,
  profileId: BotProfileId,
  newBlockers: Card[] = [],
): Float32Array {
  const profile = BOT_PROFILES[profileId];
  for (let i = 0; i < 1326; i++) {
    if (weights[i] <= 0) continue;
    const [ai, bi] = ALL_COMBOS[i];
    const hole: [Card, Card] = [cardFromIndex(ai), cardFromIndex(bi)];
    const p = botProbForCombo(hole, action, node, profile);
    weights[i] *= p;
  }
  if (newBlockers.length) removeBlocked(weights, newBlockers);
  return weights;
}

// Merge active villains into one representative opponent range (average of
// normalized weights). Used by the EV/equity model as the effective opponent.
export function mergeRanges(ranges: Float32Array[]): Float32Array {
  const out = new Float32Array(1326);
  if (ranges.length === 0) return out.fill(1);
  for (const r of ranges) for (let i = 0; i < 1326; i++) out[i] += r[i];
  return out;
}
