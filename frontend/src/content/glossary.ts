// Glossary of poker terms in Italian, linked to lessons.
export interface GlossaryTerm {
  term: string;
  definition: string;
  lesson?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "Equity", definition: "La percentuale di volte in cui vinceresti la mano allo showdown se le carte venissero girate ora.", lesson: "L01" },
  { term: "Outs", definition: "Le carte non ancora uscite che migliorano la tua mano fino a farla vincere.", lesson: "L01" },
  { term: "Pot odds", definition: "Il rapporto tra quanto devi pagare e quanto puoi vincere; determina l'equity minima per chiamare.", lesson: "L02" },
  { term: "Equity richiesta", definition: "L'equity minima necessaria per rendere profittevole un call: call / (piatto + 2 × call).", lesson: "L02" },
  { term: "Implied odds", definition: "I soldi extra che ti aspetti di vincere nelle strade successive quando chiudi il progetto.", lesson: "L03" },
  { term: "Reverse implied odds", definition: "I soldi che perdi quando chiudi un progetto dominato e sei secondo.", lesson: "L03" },
  { term: "EV", definition: "Expected Value: il guadagno medio di una decisione pesato sulle probabilità.", lesson: "L04" },
  { term: "Fold equity", definition: "La probabilità che l'avversario foldi alla tua puntata.", lesson: "L05" },
  { term: "Blocker", definition: "Una carta in tuo possesso che riduce le combinazioni possibili dell'avversario.", lesson: "L06" },
  { term: "Combo", definition: "Una specifica combinazione di due carte. Le coppie hanno 6 combo, le suited 4, le offsuit 12.", lesson: "L06" },
  { term: "Value:bluff", definition: "Il rapporto tra mani di valore e bluff necessario per un range di puntata bilanciato.", lesson: "L07" },
  { term: "MDF", definition: "Minimum Defense Frequency: quanto del tuo range devi difendere per non essere sfruttato dai bluff.", lesson: "L08" },
  { term: "Alpha", definition: "La frequenza massima con cui puoi foldare senza rendere profittevole ogni bluff: bet / (piatto + bet).", lesson: "L08" },
  { term: "Rake", definition: "La percentuale trattenuta dalla room su ogni piatto, con un cap massimo.", lesson: "L10" },
  { term: "RFI", definition: "Raise First In: aprire il piatto con un raise quando nessuno è ancora entrato.", lesson: "M3" },
  { term: "3-bet", definition: "Il terzo rilancio in una sequenza di puntate preflop (raise, re-raise).", lesson: "M3" },
  { term: "SPR", definition: "Stack-to-Pot Ratio: stack effettivo diviso il piatto al flop; misura quanto sei impegnato.", lesson: "M4" },
  { term: "C-bet", definition: "Continuation bet: la puntata dell'aggressore preflop sulla strada successiva.", lesson: "M4" },
  { term: "VPIP", definition: "Voluntarily Put money In Pot: percentuale di mani con cui un giocatore entra volontariamente.", lesson: "M6" },
  { term: "PFR", definition: "Pre-Flop Raise: percentuale di mani con cui un giocatore rilancia preflop.", lesson: "M6" },
  { term: "Polarizzazione", definition: "Un range fatto di mani molto forti e bluff, senza mani intermedie.", lesson: "M2" },
  { term: "Range advantage", definition: "Il vantaggio di avere un range mediamente più forte su una certa texture di board.", lesson: "M2" },
];
