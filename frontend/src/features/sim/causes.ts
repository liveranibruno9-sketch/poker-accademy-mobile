// Short causes for the in-game feedback pill: max 8 words, Italian, no judgement.
import { DecisionGrade } from "@/src/engine/grading";
import { DecisionRecord } from "@/src/store/appStore";

export interface ShortFeedback {
  verdict: "correct" | "imprecise" | "error";
  points: number; // signed: negative = lost, positive = bonus
  cause: string; // ≤ 8 words
}

const CAUSES: Record<string, string> = {
  PREFLOP_OPEN_WIDE: "apertura troppo larga per la posizione",
  PREFLOP_OPEN_TIGHT: "mano da aprire, non da foldare",
  LIMP: "mai limpare: apri o folda",
  PREFLOP_CALL_WIDE: "call preflop troppo largo",
  POT_ODDS_CALL: "dovevi foldare, equity insufficiente",
  FOLD_WITH_EQUITY: "avevi equity per chiamare",
  IMPLIED_ODDS_IGNORED: "implied odds sufficienti per chiamare",
  REVERSE_IMPLIED: "reverse implied odds, meglio foldare",
  RANGE_MISREAD: "range letto male",
  SIZING_TOO_SMALL: "size piccolo, serviva più pressione",
  SIZING_TOO_BIG: "size troppo grande per il valore",
  MISSED_VALUE_BET: "value bet mancata",
  MISSED_RAISE: "serviva un raise",
  BLUFF_WITH_SHOWDOWN_VALUE: "bluff con showdown value, meglio check",
  BLUFF_NO_FOLD_EQUITY: "bluff senza fold equity",
  OVERFOLD_MDF: "fold oltre la frequenza minima di difesa",
  OVERCALL_MDF: "call oltre la frequenza di difesa",
  SPR_COMMIT: "SPR basso, eri già committed",
  STACKOFF_DOMINATED: "stack-off con mano dominata",
  SLOWPLAY_WET: "slowplay su board pericoloso",
  NO_PROTECTION: "serviva proteggere la mano",
  EXPLOIT_MISSED: "exploit mancato contro questo profilo",
  EV_GENERIC: "c'era una linea con EV migliore",
  TIMEOUT: "tempo scaduto, fold automatico",
};

function trimWords(text: string, max = 8): string {
  const w = text.split(/\s+/).filter(Boolean);
  return w.length <= max ? text : w.slice(0, max).join(" ");
}

export function shortCause(grade: DecisionGrade, decision: DecisionRecord): string {
  if (grade.verdict === "correct") return trimWords(`${decision.chosenLabel.toLowerCase()} corretto`);
  const base = (grade.errorCode && CAUSES[grade.errorCode]) || grade.errorLabel || "linea migliorabile";
  if (grade.verdict === "imprecise" && grade.errorCode?.startsWith("SIZING")) return trimWords(`size migliorabile, meglio ${decision.bestLabel.toLowerCase()}`);
  return trimWords(base);
}

export function signedPoints(grade: DecisionGrade): number {
  if (grade.pointsLost > 0) return -grade.pointsLost;
  return grade.bonus > 0 ? grade.bonus : 0;
}

export function shortFeedback(grade: DecisionGrade, decision: DecisionRecord): ShortFeedback {
  return { verdict: grade.verdict, points: signedPoints(grade), cause: shortCause(grade, decision) };
}
