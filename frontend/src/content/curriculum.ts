// Curriculum content as data (not JSX). A generic renderer reads this schema.
// M1 is fully written; M2–M8 are skeletons marked "coming".

export type Block =
  | { kind: "text"; text: string }
  | { kind: "formula"; lines: string[] }
  | { kind: "example"; given: string; steps: string[]; result: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "viz"; component: string; props?: Record<string, any> }
  | { kind: "warning"; text: string }
  | { kind: "takeaway"; text: string };

export interface Slide {
  kicker: string;
  heading: string;
  blocks: Block[];
}

export type QuizItem =
  | { id: string; kind: "numeric"; prompt: string; answer: number; unit: string; tolerance: number; explain: string; concept: string }
  | { id: string; kind: "single"; prompt: string; options: string[]; correctIndex: number; distractorRationale: string[]; explain: string; concept: string };

export interface Lesson {
  id: string;
  module: string;
  order: number;
  title: string;
  subtitle: string;
  estMinutes: number;
  concepts: string[];
  slides: Slide[];
  quiz: QuizItem[];
}

export interface Module {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  status: "published" | "coming";
  lessonTitles: string[]; // for skeleton modules
}

export const MODULES: Module[] = [
  { id: "M1", order: 1, title: "Fondamenti matematici", subtitle: "I numeri che decidono ogni mano", status: "published", lessonTitles: [] },
  { id: "M2", order: 2, title: "Equilibrio e GTO", subtitle: "Strategia non sfruttabile", status: "coming", lessonTitles: ["Cos'è l'equilibrio", "Indifferenza", "Polarizzazione vs condensazione", "Range advantage", "Nut advantage"] },
  { id: "M3", order: 3, title: "Preflop", subtitle: "Posizioni e range di apertura", status: "coming", lessonTitles: ["Le posizioni", "RFI per posizione", "3-bet e 4-bet", "Difesa del BB", "Squeeze", "Aggiustamenti"] },
  { id: "M4", order: 4, title: "Postflop", subtitle: "Texture, c-bet, barreling", status: "coming", lessonTitles: ["Texture del board", "C-bet e sizing", "Barreling", "Check-raise", "SPR e commitment"] },
  { id: "M5", order: 5, title: "Varianza e bankroll", subtitle: "Sopravvivere ai downswing", status: "coming", lessonTitles: ["Deviazione standard", "Downswing", "Bankroll management", "Gestione del tilt"] },
  { id: "M6", order: 6, title: "Gioco exploitative", subtitle: "Sfruttare gli errori altrui", status: "coming", lessonTitles: ["Leggere le stat", "Deviazioni dall'equilibrio", "Sfruttare i fish", "Sfruttare i nit"] },
  { id: "M7", order: 7, title: "Tornei e ICM", subtitle: "Il valore delle fiches cambia", status: "coming", lessonTitles: ["Valore ICM", "Push/fold", "La bolla", "Ladder"] },
  { id: "M8", order: 8, title: "Metodo di studio", subtitle: "Come si migliora davvero", status: "coming", lessonTitles: ["Review delle mani", "Tracking dei leak", "Routine settimanale"] },
];

export const LESSONS: Lesson[] = [
  {
    id: "L01", module: "M1", order: 1, title: "Equity, outs e la regola del 2 e 4",
    subtitle: "Quanto spesso vinci se arrivi allo showdown", estMinutes: 3, concepts: ["equity", "outs"],
    slides: [
      { kicker: "IL CONCETTO", heading: "L'equity è la tua fetta di piatto", blocks: [
        { kind: "text", text: "L'equity è la percentuale di volte in cui vinceresti la mano se tutte le carte venissero girate adesso. È la tua quota teorica del piatto." },
        { kind: "text", text: "Gli outs sono le carte che migliorano la tua mano fino a farla vincere. Contarli è il primo passo per stimare l'equity." },
        { kind: "viz", component: "OutsCounter", props: { outs: 9 } },
      ]},
      { kicker: "LA REGOLA", heading: "La regola del 2 e del 4", blocks: [
        { kind: "formula", lines: ["Dal flop:  equity ≈ outs × 4", "Dal turn:  equity ≈ outs × 2"] },
        { kind: "example", given: "Hai un progetto di colore: 9 outs, sei al flop", steps: ["9 × 4 = 36"], result: "≈ 35% di equity (valore esatto 35,0%)" },
        { kind: "table", headers: ["Outs", "Flop→River", "Turn→River"], rows: [["4 (gutshot)", "16,5%", "8,7%"], ["8 (scala aperta)", "31,5%", "17,4%"], ["9 (colore)", "35,0%", "19,6%"], ["12", "45,0%", "26,1%"], ["15", "54,1%", "32,6%"]] },
        { kind: "warning", text: "Oltre i 9 outs la regola del 4 sovrastima l'equity: usa i valori esatti della tabella." },
        { kind: "takeaway", text: "Conta gli outs, moltiplica per 4 (flop) o 2 (turn): hai una stima immediata dell'equity." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "Hai una scala aperta (8 outs) al flop. Con la regola del 4, quale equity stimi?", answer: 32, unit: "%", tolerance: 2, explain: "8 × 4 = 32% (valore esatto 31,5%).", concept: "outs" },
      { id: "Q2", kind: "single", prompt: "Perché dal turn moltiplichi per 2 e non per 4?", options: ["Perché resta una sola carta da girare", "Perché il turn vale meno", "Perché gli outs raddoppiano"], correctIndex: 0, distractorRationale: ["Corretto", "Il valore delle carte non cambia: cambia il numero di carte da venire", "Gli outs restano gli stessi"], explain: "Dopo il turn manca solo il river: una carta, quindi metà probabilità.", concept: "equity" },
    ],
  },
  {
    id: "L02", module: "M1", order: 2, title: "Pot odds ed equity di break-even",
    subtitle: "Quanta equity serve per chiamare", estMinutes: 3, concepts: ["pot_odds", "required_equity"],
    slides: [
      { kicker: "IL CONCETTO", heading: "Il prezzo del call", blocks: [
        { kind: "text", text: "Le pot odds sono il rapporto tra quanto paghi e quanto puoi vincere. Ti dicono quanta equity ti serve, come minimo, per chiamare senza perdere soldi." },
        { kind: "formula", lines: ["equity richiesta = call / (piatto + 2 × call)"] },
        { kind: "viz", component: "PotOddsBar", props: { pot: 100, bet: 50 } },
        { kind: "example", given: "Piatto 100, l'avversario punta 50", steps: ["50 / (100 + 50 + 50)", "50 / 200 = 25%"], result: "Ti serve almeno il 25% di equity" },
        { kind: "warning", text: "Errore comune: contare il piatto prima della puntata dell'avversario. Il piatto che vinci include già la sua bet." },
      ]},
      { kicker: "AL TAVOLO", heading: "Equity richiesta per size", blocks: [
        { kind: "table", headers: ["Size", "Equity richiesta"], rows: [["1/3 pot", "20%"], ["1/2 pot", "25%"], ["2/3 pot", "28,6%"], ["3/4 pot", "30%"], ["pot", "33,3%"]] },
        { kind: "takeaway", text: "Confronta sempre l'equity stimata con l'equity richiesta prima di chiamare. Se la tua equity è sotto, folda." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "Piatto 60, l'avversario punta 30. Quale equity ti serve per chiamare?", answer: 25, unit: "%", tolerance: 1, explain: "30 / (60 + 30 + 30) = 25%.", concept: "required_equity" },
      { id: "Q2", kind: "single", prompt: "L'avversario punta pot. Quanta equity ti serve?", options: ["25%", "33,3%", "50%"], correctIndex: 1, distractorRationale: ["Questa è per 1/2 pot", "Corretto: pot = 33,3%", "Mai: chiameresti sempre in perdita"], explain: "b / (P + 2b) con b = P dà 1/3 = 33,3%.", concept: "pot_odds" },
    ],
  },
  {
    id: "L03", module: "M1", order: 3, title: "Implied e reverse implied odds",
    subtitle: "I soldi che vinci (o perdi) dopo", estMinutes: 3, concepts: ["implied_odds", "reverse_implied"],
    slides: [
      { kicker: "IL CONCETTO", heading: "Non solo il piatto di adesso", blocks: [
        { kind: "text", text: "Le implied odds sono i soldi extra che ti aspetti di vincere nelle strade successive quando chiudi il tuo progetto. Ti permettono di chiamare anche con equity leggermente sotto quella richiesta." },
        { kind: "example", given: "Chiami 20 per un colore che chiude nel 19% dei casi, ma dietro ci sono 200 di stack", steps: ["Le pot odds da sole non bastano", "Ma se chiudi, spesso incassi altre bet"], result: "Le implied odds giustificano il call" },
        { kind: "text", text: "Le reverse implied odds sono l'opposto: i soldi che perdi quando chiudi un progetto dominato (es. il colore basso contro il colore alto)." },
        { kind: "warning", text: "Con mani dominate le reverse implied odds ti fanno perdere di più proprio quando pensi di aver vinto." },
        { kind: "takeaway", text: "Implied odds: quanto vinci in più se chiudi. Reverse: quanto perdi se chiudi ma sei secondo." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "single", prompt: "Quando le implied odds sono più forti?", options: ["Stack profondi e progetto nascosto", "Stack corti", "Board pairato"], correctIndex: 0, distractorRationale: ["Corretto: c'è tanto da vincere e l'avversario non teme il tuo progetto", "Con stack corti c'è poco da guadagnare dopo", "Il board pairato non c'entra con le implied"], explain: "Servono stack da vincere e una mano che l'avversario paghi.", concept: "implied_odds" },
    ],
  },
  {
    id: "L04", module: "M1", order: 4, title: "Expected Value",
    subtitle: "Il valore medio di una decisione", estMinutes: 3, concepts: ["ev"],
    slides: [
      { kicker: "IL CONCETTO", heading: "L'EV è la media dei risultati", blocks: [
        { kind: "text", text: "L'Expected Value (EV) è quanto guadagni in media da una decisione, pesando ogni risultato per la sua probabilità. Non conta il singolo esito: conta la media su infinite ripetizioni." },
        { kind: "formula", lines: ["EV = Σ (probabilità_i × risultato_i)"] },
        { kind: "example", given: "Chiami 50 per vincere 150. Vinci il 40% delle volte", steps: ["EV = 0,40 × (+150) + 0,60 × (−50)", "EV = 60 − 30 = +30"], result: "Call +EV: guadagni 30 in media" },
        { kind: "takeaway", text: "Una mano persa con EV positivo era la scelta giusta. Un piatto vinto con EV negativo era un errore." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "Chiami 20 per vincere 100 (piatto già comprensivo). Vinci il 30%. Qual è l'EV del call in chip?", answer: 4, unit: "chip", tolerance: 1, explain: "0,30 × 80 − 0,70 × 20 = 24 − 14 = +4. (Vinci 80 netti perché 20 sono tuoi.)", concept: "ev" },
    ],
  },
  {
    id: "L05", module: "M1", order: 5, title: "Fold equity e l'EV del bluff",
    subtitle: "Vincere senza la mano migliore", estMinutes: 3, concepts: ["fold_equity"],
    slides: [
      { kicker: "IL CONCETTO", heading: "Il bluff ha due modi di vincere", blocks: [
        { kind: "text", text: "La fold equity è la probabilità che l'avversario foldi alla tua puntata. Un bluff vince o perché l'avversario molla, o perché migliori quando viene chiamato (semi-bluff)." },
        { kind: "formula", lines: ["fold equity di break-even = bet / (bet + piatto)"] },
        { kind: "example", given: "Punti 50 in un piatto di 100", steps: ["50 / (50 + 100)", "= 33,3%"], result: "Il bluff è profittevole se l'avversario folda più del 33,3%" },
        { kind: "takeaway", text: "Prima di bluffare chiediti: quanto spesso deve foldare perché sia +EV? Poi stima se lo fa davvero." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "Punti pot come bluff. Quale fold frequency ti serve per andare in pari?", answer: 50, unit: "%", tolerance: 1, explain: "pot / (pot + pot) = 50%.", concept: "fold_equity" },
    ],
  },
  {
    id: "L06", module: "M1", order: 6, title: "Combinatorics e blocker",
    subtitle: "Contare le combo cambia tutto", estMinutes: 3, concepts: ["combos", "blocker"],
    slides: [
      { kicker: "IL CONCETTO", heading: "Quante combo esistono davvero", blocks: [
        { kind: "text", text: "Ogni mano ha un numero preciso di combinazioni: una coppia servita ha 6 combo, una mano suited 4, una offsuit 12. In totale esistono 1.326 mani preflop." },
        { kind: "viz", component: "CombosMatrix", props: {} },
        { kind: "text", text: "I blocker sono carte in tuo possesso che riducono le combo dell'avversario. Se hai un Asso, l'avversario ha meno combo di AA e AK." },
        { kind: "example", given: "L'avversario può avere AA. Tu hai un Asso in mano", steps: ["Restano 3 assi", "Le combo di AA scendono da 6 a 3"], result: "Il tuo Asso dimezza le sue combo di AA" },
        { kind: "takeaway", text: "Quando leggi un range, conta le combo e togli quelle bloccate dalle tue carte e dal board." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "Quante combo ha una mano offsuit (es. AKo)?", answer: 12, unit: "combo", tolerance: 0, explain: "4 semi × 3 semi diversi = 12.", concept: "combos" },
      { id: "Q2", kind: "single", prompt: "Avere il K♠ come si chiama rispetto al colore di picche avversario?", options: ["Un blocker", "Un out", "Un kicker"], correctIndex: 0, distractorRationale: ["Corretto: blocchi le sue combo di colore/mani con quel Re", "Un out migliora la tua mano", "Il kicker è la carta di accompagnamento"], explain: "Una carta che riduce le combo avversarie è un blocker.", concept: "blocker" },
    ],
  },
  {
    id: "L07", module: "M1", order: 7, title: "Value:bluff per size",
    subtitle: "Il giusto rapporto di puntata", estMinutes: 3, concepts: ["value_bluff"],
    slides: [
      { kicker: "IL CONCETTO", heading: "Più punti grosso, più bluff ti servono", blocks: [
        { kind: "text", text: "Al river, per non essere sfruttabile, il rapporto tra mani di valore e bluff dipende dalla size: puntate grandi danno all'avversario pot odds migliori, quindi puoi (e devi) bluffare di più." },
        { kind: "viz", component: "ValueBluffTree", props: {} },
        { kind: "table", headers: ["Size", "Value:Bluff"], rows: [["1/3 pot", "3:1"], ["1/2 pot", "2:1"], ["3/4 pot", "1,43:1"], ["pot", "1:1"], ["2× pot", "1:2"]] },
        { kind: "takeaway", text: "Puntata pot al river? Per ogni value bet puoi avere un bluff. Puntata piccola? Molto più valore che bluff." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "single", prompt: "Punti pot al river. Qual è il rapporto value:bluff bilanciato?", options: ["2:1", "1:1", "3:1"], correctIndex: 1, distractorRationale: ["Questo è per 1/2 pot", "Corretto: pot = 1:1", "Questo è per 1/3 pot"], explain: "A size pot le pot odds dell'avversario sono 2:1, che corrisponde a 1:1 value:bluff.", concept: "value_bluff" },
    ],
  },
  {
    id: "L08", module: "M1", order: 8, title: "MDF e Alpha",
    subtitle: "Quanto devi difendere per non essere bluffato", estMinutes: 3, concepts: ["mdf", "alpha"],
    slides: [
      { kicker: "IL CONCETTO", heading: "La difesa minima", blocks: [
        { kind: "text", text: "L'MDF (Minimum Defense Frequency) è la percentuale del tuo range che devi difendere contro una puntata per non rendere profittevole ogni bluff avversario. Alpha è il complemento: quanto puoi foldare." },
        { kind: "formula", lines: ["MDF = piatto / (piatto + bet)", "alpha = bet / (piatto + bet)"] },
        { kind: "viz", component: "MdfAlphaCurve", props: {} },
        { kind: "example", given: "L'avversario punta 50 in un piatto di 100", steps: ["MDF = 100 / 150 = 66,7%", "alpha = 50 / 150 = 33,3%"], result: "Devi difendere il 66,7% del tuo range" },
        { kind: "takeaway", text: "Contro puntate piccole devi difendere tanto; contro puntate grandi puoi foldare di più." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "L'avversario punta 1/2 pot. Qual è l'MDF?", answer: 66.7, unit: "%", tolerance: 1, explain: "P / (P + 0,5P) = 1 / 1,5 = 66,7%.", concept: "mdf" },
    ],
  },
  {
    id: "L09", module: "M1", order: 9, title: "Break-even bluff frequency",
    subtitle: "Quanti bluff sono troppi", estMinutes: 2, concepts: ["breakeven_bluff"],
    slides: [
      { kicker: "IL CONCETTO", heading: "Rischio contro ricompensa", blocks: [
        { kind: "text", text: "La break-even bluff frequency ti dice quanto spesso un tuo bluff deve funzionare per andare in pari. È rischio / (rischio + ricompensa), identica ad alpha." },
        { kind: "formula", lines: ["break-even = bet / (piatto + bet)"] },
        { kind: "example", given: "Bluffi 75 in un piatto di 100", steps: ["75 / (100 + 75)", "= 42,9%"], result: "Il bluff deve funzionare più del 42,9% delle volte" },
        { kind: "takeaway", text: "Più grande la puntata, più alta la frequenza di successo richiesta al bluff." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "numeric", prompt: "Bluffi 1/3 pot. Quale fold frequency ti serve per andare in pari?", answer: 25, unit: "%", tolerance: 1, explain: "0,33P / (P + 0,33P) = 25%.", concept: "breakeven_bluff" },
    ],
  },
  {
    id: "L10", module: "M1", order: 10, title: "Il rake",
    subtitle: "La tassa che cambia i tuoi range", estMinutes: 3, concepts: ["rake"],
    slides: [
      { kicker: "IL CONCETTO", heading: "La casa prende una fetta", blocks: [
        { kind: "text", text: "Il rake è la percentuale che la room trattiene da ogni piatto (con un cap). Ai micro stakes il rake è alto in proporzione e cambia la matematica: molte mani marginali diventano perdenti." },
        { kind: "text", text: "Effetti pratici: apri un po' più stretto, eviti di limpare e di giocare troppi piatti multiway piccoli, cerchi di rubare piatti dove il rake incide meno." },
        { kind: "warning", text: "Il rake colpisce di più chi vede tanti flop con mani deboli: è un altro motivo per non essere loose-passive." },
        { kind: "takeaway", text: "Ai micro stakes gioca un filo più tight e aggressivo: il rake punisce il gioco marginale e passivo." },
      ]},
    ],
    quiz: [
      { id: "Q1", kind: "single", prompt: "Come aggiusti i range per il rake ai micro stakes?", options: ["Apri più largo e limpi", "Apri più stretto e aggressivo", "Non cambia nulla"], correctIndex: 1, distractorRationale: ["Il rake punisce i piatti marginali e passivi", "Corretto: eviti mani marginali, punti a piatti dove hai edge", "Il rake cambia eccome la matematica"], explain: "Il rake rende perdenti molte mani marginali: gioca più selettivo.", concept: "rake" },
    ],
  },
];

export function lessonsForModule(moduleId: string): Lesson[] {
  return LESSONS.filter((l) => l.module === moduleId).sort((a, b) => a.order - b.order);
}

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export const ALL_CONCEPTS = Array.from(new Set(LESSONS.flatMap((l) => l.concepts)));
