// Deterministic verdict explanations parametrized on the real numbers. No LLM.
import { DecisionGrade } from "@/src/engine/grading";

export function decisiveNumber(g: DecisionGrade): { label: string; value: string } | null {
  const n = g.numbers;
  const facing = n.requiredEquity > 0;
  if (g.errorCode === "POT_ODDS_CALL" || g.errorCode === "STACKOFF_DOMINATED" || (facing && g.chosenEv.action.type === "call")) {
    return { label: "Equity vs richiesta", value: `serviva ${(n.requiredEquity * 100).toFixed(0)}%, avevi ${(n.equity * 100).toFixed(0)}%` };
  }
  if (g.errorCode === "FOLD_WITH_EQUITY") {
    return { label: "Equity vs richiesta", value: `avevi ${(n.equity * 100).toFixed(0)}%, ne bastava ${(n.requiredEquity * 100).toFixed(0)}%` };
  }
  if (g.errorCode === "MISSED_VALUE_BET" || g.errorCode === "MISSED_RAISE") {
    return { label: "EV lasciato sul tavolo", value: `${g.deltaEvBb.toFixed(1)} bb` };
  }
  if (facing) return { label: "MDF", value: `${(n.mdf * 100).toFixed(0)}%` };
  return { label: "Differenza di EV", value: `${g.deltaEvBb.toFixed(1)} bb` };
}

export function explainText(g: DecisionGrade): string {
  const n = g.numbers;
  const eq = (n.equity * 100).toFixed(0);
  const req = (n.requiredEquity * 100).toFixed(0);
  const delta = g.deltaEvBb.toFixed(1);
  const best = g.bestEv.label;
  switch (g.verdict) {
    case "correct":
      return `Decisione corretta: ${best} è l'azione con EV più alto e la tua rientra nella banda ottimale.`;
    case "imprecise":
      return `Non è un errore, ma ${best} rendeva un po' di più (${delta} bb). Piccola imprecisione da tenere d'occhio.`;
    default:
      break;
  }
  switch (g.errorCode) {
    case "POT_ODDS_CALL":
      return `Ti serviva il ${req}% di equity per chiamare, ne avevi solo il ${eq}%. Il call perde ${delta} bb: la scelta corretta era ${best}.`;
    case "FOLD_WITH_EQUITY":
      return `Avevi il ${eq}% di equity, più del ${req}% richiesto. Foldare butta via ${delta} bb: dovevi continuare con ${best}.`;
    case "STACKOFF_DOMINATED":
      return `Hai messo lo stack con solo il ${eq}% contro il ${req}% richiesto. È uno stack-off dominato: costo ${delta} bb.`;
    case "LIMP":
      return `Open-limp: entrare chiamando senza rilanciare regala l'iniziativa. Meglio aprire con un raise o foldare.`;
    case "PREFLOP_OPEN_WIDE":
      return `Questa combo è fuori dal range di apertura per la tua posizione. Apri più stretto: costo ${delta} bb.`;
    case "PREFLOP_OPEN_TIGHT":
      return `Questa mano andava aperta dalla tua posizione. Foldarla lascia ${delta} bb: era un open standard.`;
    case "MISSED_VALUE_BET":
      return `La tua mano è nella parte alta del range: puntare per valore rendeva ${delta} bb in più. Non checkare le mani forti.`;
    case "MISSED_RAISE":
      return `Rilanciare batteva il call di ${delta} bb: con questa forza vai per il valore invece di chiamare.`;
    case "SIZING_TOO_SMALL":
      return `Size troppo piccola: una puntata più grande rendeva ${delta} bb in più su questa texture.`;
    case "SIZING_TOO_BIG":
      return `Size troppo grande: rischi troppo per il valore che raccogli, ${delta} bb persi rispetto a ${best}.`;
    default:
      return `${best} era l'azione con EV più alto. La tua scelta perde ${delta} bb.`;
  }
}
