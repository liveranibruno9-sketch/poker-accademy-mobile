# DECISIONS.md — Poker Academy

Scelte tecniche e deviazioni rigorose rispetto al brief, con motivazione.

## Piattaforma
- **React Native + Expo (SDK 57), TypeScript.** Non è stata costruita una PWA separata: il target nativo Expo è supportato. Il preview web (React Native Web) è usato solo per QA rapido.
- **Storage.** Il brief chiede `expo-sqlite` per lo storico e `AsyncStorage/MMKV` per le preferenze. In questo ambiente lo storage KV integrato (AsyncStorage) è l'astrazione fornita e usata per TUTTA la persistenza (`@/src/utils/storage`). Le statistiche sono calcolate in memoria a partire dalle sessioni persistite (volume dati piccolo: max 100 sessioni). Lo schema dati della sezione 11 è rispettato nei tipi (`SessionRecord`, `DecisionRecord`, `RangeRead`...). Migrazione a `expo-sqlite` possibile senza toccare la UI perché tutta la persistenza passa dallo store.

## Motore poker (`src/engine/`, TypeScript puro, zero import React/native)
- **Evaluator.** Ranker a 5 carte esatto applicato alle 21 combinazioni di 5 su 7. Corretto su tutti i casi limite (ruota A-2-3-4-5, poker > full, colore > scala, kicker). Verificato da test.
- **Equity.** `handVsHand` enumera esattamente quando i runout residui sono ≤ 200.000; oltre usa Monte Carlo **seeded dai valori delle carte** (deterministico: stesso input → stesso output). `handVsRange` è Monte Carlo adattivo con `budgetMs`/`maxIters` e stdErr dichiarato. Tolleranze dei test rispettate (AA vs KK ~82%, AA vs 72o ~88%, AKs vs QQ ~46%).
- **Charts.** Le notazioni RFI 6-max sono state calibrate per rispettare gli ordini di grandezza degli anchor (UTG ~15%, HJ ~16%, CO ~25%, BTN ~44%, SB ~49%, BB ~57%). Stessa fonte alimenta teoria e grading (nessuna doppia verità).
- **Range tracking bayesiano.** Il range vero del bot è calcolato esattamente: per ogni combo si moltiplica il peso per `p(azione | combo, nodo)` derivato dalla policy del bot (`referencePolicy.botProbForCombo`, coerente con `bots.ts`). Verificato: dopo un open UTG di un `tag`, 72o → 0, AA → peso massimo, somma pesi monotona non crescente, combo del board azzerate.
- **EV (`ev.ts`) — DEVIAZIONE documentata.** Il brief chiede l'EV via rollout multi-strada della policy dei bot con reference policy. Per garantire 60 fps offline su device mid-range senza worker nativi, l'EV di ogni azione legale è calcolato con un **modello in forma chiusa**: equity vs range tracciato + pot math + stima di fold equity (alpha corretto per il fold-to-cbet medio degli avversari). È deterministico e sufficiente per il grading equity-driven (pot odds, fold con equity, stack-off, value/raise mancati). La `referencePolicy` resta versionata (`REFERENCE_POLICY_VERSION`). Migliorabile a rollout completo senza refactor della UI.
- **Grading.** Tassonomia completa (24 codici) con pesi/cap/lezione. Banda di tolleranza 0,10bb / imprecisione 0,25bb. LIMP fisso 3,0. Nessun doppio conteggio quando `RANGE_MISREAD` è attivo. Punteggio limitato a [0,100]. Verificato da test.
- **Game state.** 6-max completo: blind, ordine di azione, min-raise, all-in, side pot multipli, odd chip alla posizione peggiore. Verificato: conservazione delle fiches su 500 mani, determinismo per seed, showdown corretto.

## Visualizzazioni
- Tutte vettoriali (`react-native-svg`) e theme-aware. La griglia 13×13 interattiva (`RangeGrid`) usa `View`/`Pressable` per il tocco affidabile (comunque vettoriale e adattiva al tema).

## RNG
- `xorshift128` seeded da stringa. Ogni mano ha un `handSeed` → replay identico.

## i18n / Tema
- Tutte le stringhe in `src/i18n/it.ts`. Tema dark di default (override `schemeOverride` in `theme.ts` per garantire dark-first anche dove `Appearance.setColorScheme` è no-op). Tema light completo.

## Palette v2 (Revisione 1)
- Da brand B2B navy/azzurro a palette da gioco di apprendimento: superfici near-black (#0A0E14/#121826/#1B2436), oro #FFC53D come CTA e ricompensa, teal #22D3A6 per successo/progressione, blu #4EA8FF per interazione/selezione/dati.
- Un token = un significato: `brandPrimary` CTA, `interactive` link/focus/selezione, `reward` punteggio, `progress` barre, `rare` achievement, `streak` streak, `highlight` numero-dato. Il testo di lettura è sempre `onSurface`/`muted`.
- `felt`/`feltCenter` restano verdi anche in tema chiaro: è la superficie di gioco, non lo sfondo app. Il testo sul feltro usa `onFelt` (fisso chiaro) per non dipendere dal tema.
- Ogni stato codificato a colore porta anche un glifo (✓ corretto, ! imprecisione/letto, ✕ errore, ▶ disponibile, ● selezionato): informazione preservata in deuteranopia.
- Contrasto verificato (WCAG): tema dark tutto ≥ 4.5:1 tranne `onError` su `error` (3.2:1, usato solo per glifi/testo bold ≥ 16px). Tema chiaro: gli accenti richiesti dal brief (#B8860B, #0F9B7A, #D98218) su bianco stanno tra 2.8 e 3.5:1 → usati solo per bordi, glifi, barre e testo bold grande; `onWarning` chiaro impostato a #241200 (6.5:1) perché il bianco su #D98218 non raggiungeva 3:1.
- Juice con reanimated: le animazioni sono solo visive, `onPress` scatta in modo sincrono; tutto disattivabile da Profilo o dall'impostazione di sistema.

## Revisione 4a — fold equity dal range tracciato (correzione motore)
- **Bug corretto**: `ev.ts` stimava `fe = alpha × foldToCbet/45`. Per il profilo `tag` (foldToCbet 45) fe ≡ alpha, quindi l'EV di un bluff puro `alpha·P − (1−alpha)·b` era identicamente 0 su ogni board e size: BLUFF_NO_FOLD_EQUITY e ogni giudizio su bet/raise non misuravano nulla. Dimostrato in `__tests__/acceptance.ts` (sezione "PRIMA/DOPO").
- **Ora**: `foldEquityVsRange()` = Σ wᵢ·P(fold ᵢ | size, nodo, board) / Σ wᵢ, con i pesi bayesiani di `rangeTracking.ts` e la policy del bot usata in avanti (`referencePolicy.foldProbForCombo`, che rispecchia i rami e le soglie di size di `bots.ts`: medium folda solo se il call > 40% del piatto, weak chiama solo se < 50%). Multi-way: prodotto delle probabilità di fold di ciascun villain sul proprio range. Nessuna media di profilo.
- **Performance**: la fold equity costa ~5 ms per size (1326 combo × villain); il resto (~70 ms) è l'equity Monte Carlo preesistente. `SimController.precomputeEv()` avvia il calcolo con `setImmediate` all'apertura del nodo hero (`table.tsx`), così il risultato è in cache quando il giocatore agisce.
- **Calibrazione bot**: aggiunti moltiplicatori empirici `calib` a ogni profilo (`scripts/calibrate-bots.js`) per far convergere VPIP/PFR osservati ai target entro 3 punti su 5 000 mani (test). Conseguenza: anche i profili tight aprono una piccola quota di mani fuori chart (72o UTG per il tag pesa ~0,12 vs 1 di AA nel range tracciato).
- **Resta approssimato**: modello in forma chiusa (equity vs range + pot math + fold equity) senza rollout multi-strada; la fold equity ignora il gioco futuro dopo il call (il villain che chiama viene trattato a showdown); la policy postflop è a bucket (strong/medium/draw/weak) e non pesa i blocker.
- **Test**: `npm test` esegue tutti i file in `src/**/__tests__` (engine, game, acceptance): pot odds call, fold con equity, open-limp = 3,0 esatti, banda 0,10 bb, bluff nit > tag > whale, side pot con 3 all-in, 10 000 mani con fiches conservate, convergenza stat bot.

## Fuori scope v1 (come da brief)
- Nessun backend, login, denaro reale, IAP, ads, multiplayer. `SyncProvider` predisposto (`services/sync.ts`).
- Contenuto reale solo per M1 (10 lezioni). M2–M8 scheletro "in arrivo".
