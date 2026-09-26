// Grading: error taxonomy, detection and penalty. Pure functions. All numbers
// come from the engine, never from an LLM.

import { EvContext } from "./ev";
import { GameState, heroSeat, pot, toCall } from "./gameState";
import { alpha as alphaFn, clamp, mdf as mdfFn, round1 } from "./math";
import { Action, ActionEv } from "./types";

export type ErrorCode =
  | "PREFLOP_OPEN_WIDE"
  | "PREFLOP_OPEN_TIGHT"
  | "LIMP"
  | "PREFLOP_CALL_WIDE"
  | "MISSED_3BET"
  | "POT_ODDS_CALL"
  | "FOLD_WITH_EQUITY"
  | "IMPLIED_ODDS_IGNORED"
  | "REVERSE_IMPLIED"
  | "RANGE_MISREAD"
  | "SIZING_TOO_SMALL"
  | "SIZING_TOO_BIG"
  | "MISSED_VALUE_BET"
  | "MISSED_RAISE"
  | "BLUFF_WITH_SHOWDOWN_VALUE"
  | "BLUFF_NO_FOLD_EQUITY"
  | "OVERFOLD_MDF"
  | "OVERCALL_MDF"
  | "SPR_COMMIT"
  | "STACKOFF_DOMINATED"
  | "SLOWPLAY_WET"
  | "NO_PROTECTION"
  | "EXPLOIT_MISSED"
  | "EV_GENERIC"
  | "TIMEOUT";

export interface ErrorMeta {
  code: ErrorCode;
  labelIt: string;
  weight: number;
  cap: number;
  lesson: string;
}

export const ERROR_META: Record<ErrorCode, ErrorMeta> = {
  PREFLOP_OPEN_WIDE: { code: "PREFLOP_OPEN_WIDE", labelIt: "Apertura fuori range", weight: 1.5, cap: 6, lesson: "M3" },
  PREFLOP_OPEN_TIGHT: { code: "PREFLOP_OPEN_TIGHT", labelIt: "Fold di una mano da aprire", weight: 1.0, cap: 4, lesson: "M3" },
  LIMP: { code: "LIMP", labelIt: "Open-limp", weight: 3.0, cap: 3, lesson: "M3" },
  PREFLOP_CALL_WIDE: { code: "PREFLOP_CALL_WIDE", labelIt: "Call preflop fuori range", weight: 1.5, cap: 6, lesson: "M3" },
  MISSED_3BET: { code: "MISSED_3BET", labelIt: "3-bet mancato", weight: 1.2, cap: 5, lesson: "M3" },
  POT_ODDS_CALL: { code: "POT_ODDS_CALL", labelIt: "Call senza equity", weight: 2.0, cap: 10, lesson: "L02" },
  FOLD_WITH_EQUITY: { code: "FOLD_WITH_EQUITY", labelIt: "Fold con equity sufficiente", weight: 2.0, cap: 10, lesson: "L02" },
  IMPLIED_ODDS_IGNORED: { code: "IMPLIED_ODDS_IGNORED", labelIt: "Implied odds ignorate", weight: 1.5, cap: 6, lesson: "L03" },
  REVERSE_IMPLIED: { code: "REVERSE_IMPLIED", labelIt: "Reverse implied odds ignorate", weight: 1.5, cap: 6, lesson: "L03" },
  RANGE_MISREAD: { code: "RANGE_MISREAD", labelIt: "Errore di lettura del range", weight: 1.0, cap: 8, lesson: "L06" },
  SIZING_TOO_SMALL: { code: "SIZING_TOO_SMALL", labelIt: "Puntata troppo piccola", weight: 1.0, cap: 5, lesson: "L07" },
  SIZING_TOO_BIG: { code: "SIZING_TOO_BIG", labelIt: "Puntata troppo grande", weight: 1.0, cap: 5, lesson: "L07" },
  MISSED_VALUE_BET: { code: "MISSED_VALUE_BET", labelIt: "Value bet mancato", weight: 2.0, cap: 8, lesson: "L07" },
  MISSED_RAISE: { code: "MISSED_RAISE", labelIt: "Raise mancato", weight: 2.0, cap: 8, lesson: "L04" },
  BLUFF_WITH_SHOWDOWN_VALUE: { code: "BLUFF_WITH_SHOWDOWN_VALUE", labelIt: "Bluff con showdown value", weight: 1.5, cap: 6, lesson: "L05" },
  BLUFF_NO_FOLD_EQUITY: { code: "BLUFF_NO_FOLD_EQUITY", labelIt: "Bluff senza fold equity", weight: 1.5, cap: 6, lesson: "L05" },
  OVERFOLD_MDF: { code: "OVERFOLD_MDF", labelIt: "Difesa sotto MDF", weight: 2.0, cap: 8, lesson: "L08" },
  OVERCALL_MDF: { code: "OVERCALL_MDF", labelIt: "Difesa eccessiva", weight: 1.5, cap: 6, lesson: "L08" },
  SPR_COMMIT: { code: "SPR_COMMIT", labelIt: "Commitment con SPR sbagliato", weight: 2.5, cap: 10, lesson: "M4" },
  STACKOFF_DOMINATED: { code: "STACKOFF_DOMINATED", labelIt: "Stack-off dominato", weight: 3.0, cap: 12, lesson: "L02" },
  SLOWPLAY_WET: { code: "SLOWPLAY_WET", labelIt: "Slowplay su board dinamico", weight: 1.5, cap: 6, lesson: "M4" },
  NO_PROTECTION: { code: "NO_PROTECTION", labelIt: "Mancata protezione", weight: 1.2, cap: 5, lesson: "M4" },
  EXPLOIT_MISSED: { code: "EXPLOIT_MISSED", labelIt: "Exploit mancato", weight: 1.0, cap: 4, lesson: "M6" },
  EV_GENERIC: { code: "EV_GENERIC", labelIt: "Decisione sub-ottimale", weight: 1.0, cap: 5, lesson: "M1" },
  TIMEOUT: { code: "TIMEOUT", labelIt: "Decisione scaduta", weight: 1.0, cap: 1, lesson: "M1" },
};

export type Verdict = "correct" | "imprecise" | "error";
export type Severity = "light" | "medium" | "severe";

export interface DecisionGrade {
  verdict: Verdict;
  errorCode: ErrorCode | null;
  errorLabel: string | null;
  severity: Severity;
  pointsLost: number;
  deltaEvBb: number;
  bonus: number;
  numbers: {
    equity: number;
    requiredEquity: number;
    mdf: number;
    alpha: number;
    sizePct: number;
    spr: number;
  };
  chosenEv: ActionEv;
  bestEv: ActionEv;
}

function severityFor(points: number): Severity {
  if (points < 1) return "light";
  if (points <= 3) return "medium";
  return "severe";
}

export interface GradeInput {
  state: GameState;
  ev: EvContext;
  chosen: Action;
  chartWeight: number; // hero combo weight in RFI chart for position (preflop)
  isOpenSpot: boolean; // preflop unopened
  callChips: number;
  difficulty?: "normal" | "hard";
  rangeMisreadActive?: boolean; // suppress double counting on downstream action
  timedOut?: boolean;
}

function matchEv(evActions: ActionEv[], chosen: Action): ActionEv {
  let best: ActionEv | null = null;
  let bestDiff = Infinity;
  for (const a of evActions) {
    if (a.action.type !== chosen.type) {
      // allow bet<->raise equivalence
      const betRaise = (chosen.type === "bet" || chosen.type === "raise") && (a.action.type === "bet" || a.action.type === "raise");
      if (!betRaise) continue;
    }
    const diff = Math.abs((a.action.amount ?? 0) - (chosen.amount ?? 0));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = a;
    }
  }
  return best ?? evActions[evActions.length - 1];
}

export function gradeDecision(input: GradeInput): DecisionGrade {
  const { state, ev, chosen } = input;
  const hero = heroSeat(state);
  const potBefore = ev.potBeforeChips;
  const facing = ev.toCallChips > 0;
  const chosenEv = matchEv(ev.actions, chosen);
  const bestEv = ev.best;
  const deltaEvBb = Math.max(0, bestEv.evBb - chosenEv.evBb);

  const spr = state.potAtFlop > 0 ? hero.stack / state.potAtFlop : 0;
  const sizePct = chosen.amount ? ((chosen.amount - hero.committed) / Math.max(1, potBefore)) * 100 : 0;
  const numbers = {
    equity: ev.equity,
    requiredEquity: ev.requiredEquity,
    mdf: facing ? mdfFn(potBefore, ev.toCallChips) : 0,
    alpha: facing ? alphaFn(potBefore, ev.toCallChips) : 0,
    sizePct,
    spr,
  };

  // timeout is a fixed, always-applied penalty
  if (input.timedOut) {
    return grade("error", "TIMEOUT", 1.0, deltaEvBb, 0, numbers, chosenEv, bestEv);
  }

  // banding
  if (deltaEvBb <= 0.1) {
    let bonus = 0;
    if (input.difficulty === "hard" && chosenEv.rank === 0) bonus = 0.3;
    return grade("correct", null, 0, deltaEvBb, bonus, numbers, chosenEv, bestEv);
  }
  if (deltaEvBb <= 0.25) {
    return grade("imprecise", null, 0, deltaEvBb, 0, numbers, chosenEv, bestEv);
  }

  // classify (first match wins)
  const code = classify(input, numbers, ev);
  const meta = ERROR_META[code];
  let points: number;
  if (code === "LIMP") points = 3.0;
  else points = clamp(meta.weight * deltaEvBb, 0.5, meta.cap);
  points = round1(points);
  return grade("error", code, points, deltaEvBb, 0, numbers, chosenEv, bestEv);
}

function classify(input: GradeInput, numbers: DecisionGrade["numbers"], ev: EvContext): ErrorCode {
  const { state, chosen, isOpenSpot, chartWeight, callChips } = input;
  const hero = heroSeat(state);
  const facing = ev.toCallChips > 0;
  const isPreflop = state.street === "preflop";
  const eq = numbers.equity;
  const req = numbers.requiredEquity;

  // open-limp
  if (isPreflop && isOpenSpot && chosen.type === "call" && callChips <= state.bb + 0.01) return "LIMP";

  // stack-off dominated: calling an all-in with too little equity
  const callAllIn = chosen.type === "call" && callChips >= hero.stack - 0.01;
  if (facing && callAllIn && eq < req - 0.05) return "STACKOFF_DOMINATED";

  // pot odds call
  if (facing && chosen.type === "call" && eq < req - 0.02) return "POT_ODDS_CALL";

  // fold with equity
  if (facing && chosen.type === "fold" && eq >= req + 0.03) return "FOLD_WITH_EQUITY";

  // preflop open range errors
  if (isPreflop && isOpenSpot) {
    if ((chosen.type === "raise" || chosen.type === "bet") && chartWeight < 0.15) return "PREFLOP_OPEN_WIDE";
    if ((chosen.type === "fold" || chosen.type === "check") && chartWeight >= 0.8) return "PREFLOP_OPEN_TIGHT";
  }

  // missed value bet: strong hand checked/called
  const bet = ev.actions.find((a) => a.action.type === "bet" || a.action.type === "raise");
  if ((chosen.type === "check" || chosen.type === "call") && eq >= 0.6 && bet) {
    const chosenEv = matchEv(ev.actions, chosen);
    if (bet.evBb - chosenEv.evBb > 0.4) return chosen.type === "call" ? "MISSED_RAISE" : "MISSED_VALUE_BET";
  }

  // sizing errors
  if ((chosen.type === "bet" || chosen.type === "raise") && bet) {
    const chosenEv = matchEv(ev.actions, chosen);
    if (bet.evBb - chosenEv.evBb > 0.25) {
      const bestAmt = bet.action.amount ?? 0;
      const chosenAmt = chosen.amount ?? 0;
      if (chosenAmt < bestAmt) return "SIZING_TOO_SMALL";
      return "SIZING_TOO_BIG";
    }
  }

  return "EV_GENERIC";
}

function grade(
  verdict: Verdict,
  errorCode: ErrorCode | null,
  points: number,
  deltaEvBb: number,
  bonus: number,
  numbers: DecisionGrade["numbers"],
  chosenEv: ActionEv,
  bestEv: ActionEv,
): DecisionGrade {
  return {
    verdict,
    errorCode,
    errorLabel: errorCode ? ERROR_META[errorCode].labelIt : null,
    severity: severityFor(points),
    pointsLost: points,
    deltaEvBb: round1(deltaEvBb),
    bonus,
    numbers,
    chosenEv,
    bestEv,
  };
}

// Range-read Dice scoring (Sørensen–Dice, weighted).
export function diceScore(trueW: Float32Array, readW: Float32Array): number {
  let minSum = 0;
  let tSum = 0;
  let rSum = 0;
  for (let i = 0; i < 1326; i++) {
    minSum += Math.min(trueW[i], readW[i]);
    tSum += trueW[i];
    rSum += readW[i];
  }
  if (tSum + rSum === 0) return 0;
  return (2 * minSum) / (tSum + rSum);
}

export function gradeRangeRead(dice: number): { verdict: "solid" | "imprecise" | "error"; pointsLost: number; bonus: number } {
  if (dice >= 0.7) return { verdict: "solid", pointsLost: 0, bonus: dice >= 0.85 ? 0.3 : 0 };
  if (dice >= 0.45) return { verdict: "imprecise", pointsLost: 0, bonus: 0 };
  return { verdict: "error", pointsLost: round1(clamp((0.45 - dice) * 20, 0.5, 8)), bonus: 0 };
}

export function applyScore(current: number, pointsLost: number, bonus: number): number {
  return clamp(round1(current - pointsLost + bonus), 0, 100);
}
