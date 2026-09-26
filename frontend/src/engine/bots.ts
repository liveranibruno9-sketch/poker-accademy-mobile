// CPU profiles + policy. Deterministic given the hand's seeded RNG. The same
// probability functions are reused by rangeTracking so the tracked range is the
// bot's true range, not an estimate.

import { rfiRange, threeBetRange } from "./charts";
import { evaluate, CATEGORY } from "./evaluator";
import { GameState, legalActions, pot, positionForSeat, Seat, toCall } from "./gameState";
import { comboIndexFromCards } from "./ranges";
import { Action, BotProfileId, Card, Position } from "./types";

export interface BotProfile {
  id: BotProfileId;
  labelIt: string;
  vpip: number;
  pfr: number;
  threeBet: number;
  cbetFlop: number;
  foldToCbet: number;
  descriptionIt: string;
  openWiden: number; // multiplier on RFI width
  bluffiness: number; // 0..1 tendency to bet/raise weak
}

export const BOT_PROFILES: Record<BotProfileId, BotProfile> = {
  nit: { id: "nit", labelIt: "Nit", vpip: 14, pfr: 11, threeBet: 3, cbetFlop: 55, foldToCbet: 62, openWiden: 0.7, bluffiness: 0.05, descriptionIt: "Apre solo mani forti, folda facile, non bluffa." },
  tag: { id: "tag", labelIt: "TAG", vpip: 23, pfr: 19, threeBet: 8, cbetFlop: 65, foldToCbet: 45, openWiden: 1.0, bluffiness: 0.25, descriptionIt: "Reg solido, quasi equilibrato, punisce gli errori." },
  lag: { id: "lag", labelIt: "LAG", vpip: 34, pfr: 28, threeBet: 13, cbetFlop: 75, foldToCbet: 38, openWiden: 1.5, bluffiness: 0.45, descriptionIt: "Aggressivo, 3-betta largo, barrel frequenti." },
  fish: { id: "fish", labelIt: "Fish", vpip: 52, pfr: 9, threeBet: 2, cbetFlop: 30, foldToCbet: 25, openWiden: 1.3, bluffiness: 0.1, descriptionIt: "Limpa, chiama troppo, non folda mai un paio." },
  whale: { id: "whale", labelIt: "Whale", vpip: 68, pfr: 14, threeBet: 3, cbetFlop: 40, foldToCbet: 15, openWiden: 1.8, bluffiness: 0.15, descriptionIt: "Chiama qualsiasi cosa, sizing incoerenti." },
  maniac: { id: "maniac", labelIt: "Maniac", vpip: 60, pfr: 45, threeBet: 22, cbetFlop: 85, foldToCbet: 30, openWiden: 2.2, bluffiness: 0.7, descriptionIt: "Raise costanti, bluff eccessivi." },
};

// Probability the bot opens (raises first in) with a given combo from position.
export function openRaiseProb(hole: [Card, Card], position: Position, profile: BotProfile): number {
  const idx = comboIndexFromCards(hole[0], hole[1]);
  const inRfi = rfiRange(position)[idx] > 0;
  if (inRfi) return Math.min(0.95, 0.8 + profile.bluffiness * 0.2);
  // out of RFI: tight profiles never open trash; wider profiles open a little
  if (profile.openWiden <= 1.1) return 0;
  return Math.min(0.5, 0.02 * profile.openWiden * (profile.pfr / 15));
}

// Probability the bot limps (calls) an unopened pot (fish/whale do this a lot).
export function limpProb(hole: [Card, Card], position: Position, profile: BotProfile): number {
  const idx = comboIndexFromCards(hole[0], hole[1]);
  const inRfi = rfiRange(position)[idx] > 0;
  const looseCaller = profile.vpip - profile.pfr; // gap = passive calling
  if (looseCaller <= 5) return inRfi ? 0.02 : 0.0; // aggressive profiles rarely limp
  const base = looseCaller / 100;
  return inRfi ? base : base * 0.6;
}

// Probability the bot continues (call or 3bet) facing an open.
export function continueVsOpenProb(hole: [Card, Card], profile: BotProfile): { call: number; raise: number } {
  const idx = comboIndexFromCards(hole[0], hole[1]);
  const in3b = threeBetRange()[idx] > 0;
  const cont = Math.min(0.9, (profile.vpip / 100) * 1.6);
  const raise = in3b ? Math.min(0.8, profile.threeBet / 12) : profile.bluffiness * 0.06;
  const call = Math.max(0, cont - raise);
  return { call, raise };
}

// ---- Postflop hand-strength bucket ----
export type StrengthBucket = "strong" | "medium" | "weak" | "draw";

export function handBucket(hole: [Card, Card], board: Card[]): StrengthBucket {
  const res = evaluate([...hole, ...board]);
  if (res.category >= CATEGORY.TWO_PAIR) return "strong";
  if (res.category === CATEGORY.PAIR) {
    // top pair or overpair?
    const boardMax = Math.max(...board.map((c) => c.rank), 0);
    const overpair = hole[0].rank === hole[1].rank && hole[0].rank > boardMax;
    const madePairRank = pairedRank(hole, board);
    if (overpair || madePairRank >= boardMax) return "medium";
    return "weak";
  }
  // check flush/straight draws
  if (hasDraw(hole, board)) return "draw";
  return "weak";
}

function pairedRank(hole: [Card, Card], board: Card[]): number {
  const boardRanks = new Set(board.map((c) => c.rank));
  let best = 0;
  for (const c of hole) if (boardRanks.has(c.rank)) best = Math.max(best, c.rank);
  if (hole[0].rank === hole[1].rank) best = Math.max(best, hole[0].rank);
  return best;
}

function hasDraw(hole: [Card, Card], board: Card[]): boolean {
  const all = [...hole, ...board];
  // flush draw: 4 of a suit
  for (let s = 0; s < 4; s++) if (all.filter((c) => c.suit === s).length === 4) return true;
  // open-ended-ish: 4 consecutive ranks
  const ranks = [...new Set(all.map((c) => c.rank))].sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1] + 1) {
      run++;
      if (run >= 4) return true;
    } else run = 1;
  }
  return false;
}

// ---- Main bot decision ----
export function botDecision(state: GameState, seatIndex: number): Action {
  const seat = state.seats[seatIndex];
  const la = legalActions(state);
  const profile = BOT_PROFILES[seat.profile!];
  const r = () => state.rng.next();

  if (state.street === "preflop") {
    return preflopDecision(state, seat, profile, la, r);
  }
  return postflopDecision(state, seat, profile, la, r);
}

function preflopDecision(
  state: GameState,
  seat: Seat,
  profile: BotProfile,
  la: ReturnType<typeof legalActions>,
  r: () => number,
): Action {
  const hole = seat.hole!;
  const raised = state.currentBet > state.bb;
  const potNow = pot(state);

  if (!raised) {
    // unopened (possibly with limpers)
    const pOpen = openRaiseProb(hole, seat.position, profile);
    const pLimp = limpProb(hole, seat.position, profile);
    const roll = r();
    if (roll < pOpen) {
      const size = Math.round((2.3 + (potNow - state.bb - state.sb) / state.bb) * state.bb);
      return { type: "raise", amount: Math.max(la.minRaiseTo, size) };
    }
    if (roll < pOpen + pLimp && la.canCall) return { type: "call", amount: la.callAmount };
    return la.canCheck ? { type: "check" } : { type: "fold" };
  }

  // facing a raise
  const { call, raise } = continueVsOpenProb(hole, profile);
  const roll = r();
  if (roll < raise && la.canRaise) {
    const threeBetTo = Math.round(state.currentBet * (seat.position === "BB" || seat.position === "SB" ? 4 : 3));
    return { type: "raise", amount: Math.max(la.minRaiseTo, Math.min(threeBetTo, la.maxRaiseTo)) };
  }
  if (roll < raise + call && la.canCall) {
    // don't call huge if not strong
    if (la.callAmount > seat.stack * 0.35 && r() > profile.vpip / 60) return { type: "fold" };
    return { type: "call", amount: la.callAmount };
  }
  return la.canCheck ? { type: "check" } : { type: "fold" };
}

function postflopDecision(
  state: GameState,
  seat: Seat,
  profile: BotProfile,
  la: ReturnType<typeof legalActions>,
  r: () => number,
): Action {
  const bucket = handBucket(seat.hole!, state.board);
  const potNow = pot(state);
  const facing = la.callAmount > 0;

  const betSize = (frac: number) => Math.round(Math.min(potNow * frac, seat.stack) + seat.committed);

  if (!facing) {
    // we can check or bet
    const wasAggressor = state.lastAggressor === -1; // nobody bet this street
    let betProb = 0;
    if (bucket === "strong") betProb = 0.85;
    else if (bucket === "medium") betProb = 0.55;
    else if (bucket === "draw") betProb = 0.5 + profile.bluffiness * 0.3;
    else betProb = (state.street === "flop" ? profile.cbetFlop / 100 : profile.cbetFlop / 160) * (0.4 + profile.bluffiness);
    if (wasAggressor && r() < betProb && la.canBet) {
      const frac = bucket === "strong" ? 0.75 : bucket === "draw" ? 0.6 : 0.5;
      return { type: "bet", amount: betSize(frac) };
    }
    return { type: "check" };
  }

  // facing a bet: fold / call / raise
  if (bucket === "strong") {
    if (r() < 0.4 && la.canRaise) {
      return { type: "raise", amount: Math.max(la.minRaiseTo, Math.min(betSize(1.0), la.maxRaiseTo)) };
    }
    return la.canCall ? { type: "call", amount: la.callAmount } : { type: "check" };
  }
  if (bucket === "medium") {
    const foldP = (profile.foldToCbet / 100) * 0.7;
    if (r() < foldP && la.callAmount > potNow * 0.4) return { type: "fold" };
    return la.canCall ? { type: "call", amount: la.callAmount } : { type: "check" };
  }
  if (bucket === "draw") {
    if (r() < 0.35 + profile.bluffiness * 0.3 && la.canRaise)
      return { type: "raise", amount: Math.max(la.minRaiseTo, Math.min(betSize(1.0), la.maxRaiseTo)) };
    if (r() < 0.7) return la.canCall ? { type: "call", amount: la.callAmount } : { type: "check" };
    return { type: "fold" };
  }
  // weak / air
  const foldP = profile.foldToCbet / 100;
  if (r() < foldP) return { type: "fold" };
  // occasional bluff-raise for aggressive profiles
  if (r() < profile.bluffiness * 0.15 && la.canRaise)
    return { type: "raise", amount: Math.max(la.minRaiseTo, Math.min(betSize(0.75), la.maxRaiseTo)) };
  return la.canCall && la.callAmount < potNow * 0.5 ? { type: "call", amount: la.callAmount } : { type: "fold" };
}

// Auto-play all non-hero seats until it's the hero's turn or the hand ends.
export function autoPlayToHero(
  state: GameState,
  apply: (s: GameState, a: Action) => GameState,
): GameState {
  let guard = 0;
  while (!state.finished && state.toAct !== -1 && !state.seats[state.toAct].isHero) {
    const action = botDecision(state, state.toAct);
    apply(state, action);
    if (++guard > 200) break;
  }
  return state;
}
