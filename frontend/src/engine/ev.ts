// EV of every legal action at the hero's decision node. Uses an equity + pot
// model against the effective (bayesian-tracked) opponent range, plus a fold
// -equity estimate for bets/raises. Deterministic. (See DECISIONS.md: the full
// multi-street bot rollout is approximated by this closed-form model in v1.)

import { handVsRange } from "./equity";
import { GameState, heroSeat, legalActions, pot, toCall } from "./gameState";
import { clamp } from "./math";
import { ActionEv, Card } from "./types";
import { BotProfile } from "./bots";
import { foldProbForCombo } from "./referencePolicy";
import { ALL_COMBOS } from "./ranges";
import { cardFromIndex } from "./cards";

// One active opponent: its tracked (bayesian) range, its policy and its state.
export interface VillainModel {
  weights: Float32Array;
  profile: BotProfile;
  committed: number; // chips committed this street
  stack: number;
}

// Fold equity of a bet/raise TO `toAmount`, computed from the villain's tracked
// range: Σ w_i · P(fold_i | size, node, board) / Σ w_i. Multi-way: product over villains.
export function foldEquityVsRange(
  villain: VillainModel,
  board: Card[],
  street: GameState["street"],
  toAmount: number,
  potAtVillainDecision: number,
): number {
  const callChips = Math.max(0, toAmount - villain.committed);
  let num = 0;
  let den = 0;
  for (let i = 0; i < 1326; i++) {
    const w = villain.weights[i];
    if (w <= 0) continue;
    const [ai, bi] = ALL_COMBOS[i];
    const hole: [Card, Card] = [cardFromIndex(ai), cardFromIndex(bi)];
    num += w * foldProbForCombo(hole, board, street, villain.profile, callChips, potAtVillainDecision, villain.stack);
    den += w;
  }
  return den > 0 ? num / den : 0;
}

export function combinedFoldEquity(villains: VillainModel[], board: Card[], street: GameState["street"], toAmount: number, potAtVillainDecision: number): number {
  if (villains.length === 0) return 0;
  let fe = 1;
  for (const v of villains) fe *= foldEquityVsRange(v, board, street, toAmount, potAtVillainDecision);
  return clamp(fe, 0, 0.98);
}

export interface EvContext {
  equity: number;
  requiredEquity: number;
  potBeforeChips: number;
  toCallChips: number;
  actions: ActionEv[];
  best: ActionEv;
}

const SIZE_PRESETS: { key: string; frac: number }[] = [
  { key: "33%", frac: 1 / 3 },
  { key: "50%", frac: 0.5 },
  { key: "75%", frac: 0.75 },
  { key: "100%", frac: 1 },
];

export function computeActionEvs(
  state: GameState,
  effectiveRange: Float32Array,
  opts: { villains?: VillainModel[]; maxIters?: number } = {},
): EvContext {
  const hero = heroSeat(state);
  const hole = hero.hole!;
  const board = state.board;
  const la = legalActions(state);
  const P = pot(state);
  const callChips = toCall(state, hero.index);
  const potBefore = Math.max(1, P - callChips); // pot before villain's current bet
  const bb = state.bb;

  const eqRes = handVsRange(hole, effectiveRange, board, { maxIters: opts.maxIters ?? 1200, targetStdErr: 0.01 });
  const eq = eqRes.equity;
  const villains = opts.villains ?? [];

  const req = callChips > 0 ? callChips / (potBefore + 2 * callChips) : 0;

  const actions: ActionEv[] = [];

  // fold
  if (la.canFold) {
    actions.push({ action: { type: "fold" }, label: "Fold", evChips: 0, evBb: 0, stdErr: 0, rank: 0 });
  }
  // check
  if (la.canCheck) {
    const evChips = eq * P;
    actions.push({ action: { type: "check" }, label: "Check", evChips, evBb: evChips / bb, stdErr: eqRes.stdErr * P, rank: 0 });
  }
  // call
  if (la.canCall) {
    const evChips = eq * P - (1 - eq) * callChips;
    actions.push({ action: { type: "call", amount: callChips }, label: `Call ${(callChips / bb).toFixed(1)}bb`, evChips, evBb: evChips / bb, stdErr: eqRes.stdErr * P, rank: 0 });
  }

  // bets / raises
  const addSize = (label: string, toAmount: number) => {
    const b = toAmount - hero.committed; // additional chips beyond this street's commit
    if (b <= 0) return;
    // Fold equity is CALCULATED from the tracked ranges (never a profile average):
    // the pot at the villain's decision already contains our b chips.
    const fe = villains.length ? combinedFoldEquity(villains, board, state.street, toAmount, P + b) : 0;
    const evCalled = eq * (P + b) - (1 - eq) * b;
    const evChips = fe * P + (1 - fe) * evCalled;
    actions.push({
      action: { type: la.canRaise ? "raise" : "bet", amount: toAmount },
      label,
      evChips,
      evBb: evChips / bb,
      stdErr: eqRes.stdErr * P,
      rank: 0,
    });
  };

  if (la.canBet || la.canRaise) {
    for (const preset of SIZE_PRESETS) {
      const raw = hero.committed + Math.round(potBefore * preset.frac + (callChips > 0 ? callChips : 0));
      const toAmount = clamp(raw, la.minRaiseTo, la.maxRaiseTo);
      addSize(`${la.canRaise ? "Raise" : "Bet"} ${preset.key}`, toAmount);
    }
    // all-in
    if (la.maxRaiseTo > la.minRaiseTo) addSize("All-in", la.maxRaiseTo);
  }

  // dedupe by toAmount (clamping can collapse sizes)
  const seen = new Set<string>();
  const deduped = actions.filter((a) => {
    const k = a.action.type + ":" + (a.action.amount ?? 0);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  deduped.sort((a, b) => b.evChips - a.evChips);
  deduped.forEach((a, i) => (a.rank = i));
  const best = deduped[0];

  return {
    equity: eq,
    requiredEquity: req,
    potBeforeChips: potBefore,
    toCallChips: callChips,
    actions: deduped,
    best,
  };
}

export function heroHoleAndBoard(state: GameState): { hole: [Card, Card]; board: Card[] } {
  return { hole: heroSeat(state).hole!, board: state.board };
}
