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

## Fuori scope v1 (come da brief)
- Nessun backend, login, denaro reale, IAP, ads, multiplayer. `SyncProvider` predisposto (`services/sync.ts`).
- Contenuto reale solo per M1 (10 lezioni). M2–M8 scheletro "in arrivo".
