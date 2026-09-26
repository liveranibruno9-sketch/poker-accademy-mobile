// Reference policy + per-combo action probabilities. This module is the metric
// the app grades against and the probability source for range tracking.
// VERSIONED: bump REFERENCE_POLICY_VERSION when thresholds change.

import { BotProfile, continueVsOpenProb, handBucket, limpProb, openRaiseProb } from "./bots";
import type { TrackNode } from "./rangeTracking";
import { clamp } from "./math";
import { Action, Card, Position } from "./types";

export const REFERENCE_POLICY_VERSION = "1.0.0";

// Reference thresholds used by grading (documented, testable constants).
export const REFERENCE = {
  callWithEquityMargin: 0.0, // call when equity >= required
  semiBluffMinOuts: 8,
  valueTopFraction: 0.2, // value bet top 20% of range
  toleranceBb: 0.1,
  imprecisionBb: 0.25,
};

// Probability that the bot FOLDS a candidate combo when facing a bet/raise of
// `callChips` into a pot of `potChips` (pot at the bot's decision, i.e. including
// the aggressor's chips). Mirrors bots.ts decision branches exactly, including
// the size thresholds. Used forward (fold equity) — same policy the tracker uses backward.
export function foldProbForCombo(
  hole: [Card, Card],
  board: Card[],
  street: "preflop" | "flop" | "turn" | "river",
  profile: BotProfile,
  callChips: number,
  potChips: number,
  botStack = Infinity,
): number {
  if (street === "preflop") {
    const { call, raise } = continueVsOpenProb(hole, profile);
    let fold = clamp(1 - call - raise, 0, 1);
    // bots.ts: facing a call that costs > 35% of stack, fold with prob (1 - vpip/60)
    if (callChips > botStack * 0.35) fold += call * clamp(1 - profile.vpip / 60, 0, 1);
    return clamp(fold, 0, 1);
  }
  const bucket = handBucket(hole, board);
  const aggr = profile.bluffiness;
  if (bucket === "strong") return 0; // never folds
  if (bucket === "medium") {
    // folds with p = foldToCbet*0.7 only when the call costs more than 40% of the pot
    return callChips > potChips * 0.4 ? clamp((profile.foldToCbet / 100) * 0.7, 0, 1) : 0;
  }
  if (bucket === "draw") {
    // roll 1: raise (0.35 + aggr*0.3); roll 2: call 70% / fold 30%
    const raiseP = clamp(0.35 + aggr * 0.3, 0, 0.9);
    return (1 - raiseP) * 0.3;
  }
  // weak / air: fold roll, then bluff-raise roll, then call only if cheap (< 50% pot)
  const foldP = clamp(profile.foldToCbet / 100, 0, 1);
  const bluffRaiseP = clamp(aggr * 0.15, 0, 1);
  const callsIfCheap = callChips < potChips * 0.5 ? 0 : 1;
  return clamp(foldP + (1 - foldP) * (1 - bluffRaiseP) * callsIfCheap, 0, 1);
}

// Probability the bot's policy assigns to `action` given a candidate combo.
// Mirrors bots.ts so the tracked range equals the true range.
export function botProbForCombo(
  hole: [Card, Card],
  action: Action,
  node: TrackNode,
  profile: BotProfile,
): number {
  if (node.street === "preflop") {
    if (node.facing === "unopened") {
      const pOpen = openRaiseProb(hole, node.position as Position, profile);
      const pLimp = limpProb(hole, node.position as Position, profile);
      if (action.type === "raise" || action.type === "bet") return pOpen;
      if (action.type === "call") return pLimp;
      return clamp(1 - pOpen - pLimp, 0, 1); // fold / check
    }
    // vs a raise
    const { call, raise } = continueVsOpenProb(hole, profile);
    if (action.type === "raise") return raise;
    if (action.type === "call") return call;
    return clamp(1 - call - raise, 0, 1);
  }

  // postflop: derive from hand bucket
  const bucket = handBucket(hole, node.board);
  const aggr = profile.bluffiness;
  if (node.facing === "postflopOpen") {
    // bot may bet or check
    let betP = bucket === "strong" ? 0.85 : bucket === "medium" ? 0.55 : bucket === "draw" ? 0.5 + aggr * 0.3 : (profile.cbetFlop / 100) * (0.4 + aggr);
    betP = clamp(betP, 0.02, 0.95);
    if (action.type === "bet" || action.type === "raise") return betP;
    return 1 - betP; // check
  }
  // facing a bet: fold / call / raise
  let foldP: number, raiseP: number;
  if (bucket === "strong") {
    foldP = 0.02;
    raiseP = 0.4;
  } else if (bucket === "medium") {
    foldP = (profile.foldToCbet / 100) * 0.7;
    raiseP = 0.05;
  } else if (bucket === "draw") {
    foldP = 0.15;
    raiseP = 0.35 + aggr * 0.3;
  } else {
    foldP = profile.foldToCbet / 100;
    raiseP = aggr * 0.15;
  }
  foldP = clamp(foldP, 0, 0.95);
  raiseP = clamp(raiseP, 0, 0.9);
  const callP = clamp(1 - foldP - raiseP, 0, 1);
  if (action.type === "fold") return foldP;
  if (action.type === "raise" || action.type === "bet") return raiseP;
  return callP; // call / check
}
