# Poker Academy — PRD

## Problem statement (original)
App mobile "Poker Academy": trainer di Texas Hold'em No Limit 6-max cash (micro stakes NL2–NL25), interamente in italiano. Due pilastri: moduli di studio e simulatore di mani con punteggio tecnico. Offline-first, matematica calcolata dal codice (mai da LLM), motore poker puro e testato.

## Architecture
- **Frontend only, offline-first.** React Native + Expo (SDK 57), TypeScript, expo-router (4 tab: Studio · Simulatore · Statistiche · Profilo). Nessun backend nella v1.
- **Engine** (`src/engine/`, TS puro, testato con harness Node): cards, evaluator, equity (enum + Monte Carlo seeded), ranges (1326 combo + parser notazione), charts (RFI 6-max), math (formule canoniche), gameState (side pot, all-in), bots (6 profili), rangeTracking (bayesiano esatto), referencePolicy, ev, grading (24 classi di errore).
- **Store** Zustand + persistenza locale (`@/src/utils/storage`): profilo, progressi lezioni, padronanza concetti (SM-2), storico sessioni.
- **Viz** SVG theme-aware: PlayingCard, RangeGrid13x13, PotOddsBar, EquityWheel, OutsCounter, EvBarChart, ScoreTimeline, CombosMatrix, MdfAlphaCurve, ValueBluffTree, SprGauge.

## User personas
- Giocatore italiano principiante/intermedio di cash game online 6-max a micro stakes, conosce le regole ma non la teoria.

## Core requirements (static)
- Tutta la UI/testi/feedback in italiano; codice in inglese.
- Matematica dal codice, funzioni pure e testate; nessun LLM nel loop di valutazione.
- Offline-first; RNG deterministico seeded per replay.
- Sistema di punteggio tecnico: si parte da 100, si perde per errori dimostrabili (EV-based), non per piatti persi.

## Implemented (2026-06-26)
- Motore poker completo e verificato (20 test engine + 12 test game/grading verdi): evaluator, equity, ranges, charts, gameState (side pot/all-in), bots, tracking bayesiano, EV, grading.
- Studio: curriculum M1 con 10 lezioni reali + quiz (numeric/single), renderer generico da schema dati, viz nelle lezioni, sblocco sequenziale, padronanza concetti con ripasso spaziato. M2–M8 scheletro "in arrivo".
- Simulatore: tavolo 6-max giocabile end-to-end, bot con policy, HUD stat osservate con sample size, action bar (fold/check/call/bet-raise + preset size + all-in), timer decisione.
- Punteggio: grading EV-based con tassonomia completa, verdetto immediato (sheet) con "il numero che decide", EvBarChart, spiegazioni deterministiche.
- "Che range gli dai?": griglia 13×13 interattiva, punteggio Dice vs range vero.
- Report di sessione: anello punteggio, KPI, ScoreTimeline, errori per classe, mani più costose, piano d'azione.
- Statistiche: dashboard, leak ranking, stat personali vs banda, heatmap concetti, per posizione.
- Profilo: tema (dark default + light + system), verdetto immediato/differito, timer, reset con doppia conferma, export JSON, gioco responsabile.
- Glossario tappabile collegato alle lezioni.

## Revisione 1 — palette & juice (2026-06-26)
- `src/theme.ts`: valori dark/light sostituiti (oro #FFC53D CTA, teal success/progress, blu interactive, superfici near-black); `felt` verde scuro in entrambi i temi.
- Token nuovi: `feltCenter, reward, onReward, progress, rare, streak, interactive, onInteractive, scrim, onFelt` + helper `shade()`.
- Migrazione d'uso: `interactive` = link/focus/selezione (Pill attiva, tab attiva, opzione quiz, livello onboarding, bordo "a chi tocca"); `brandPrimary` = solo CTA/Bet-Raise; `reward` = punteggio; `progress` = barre; `highlight` = dato numerico nei contenuti.
- Tavolo: sfondo radiale SVG `feltCenter → felt`, hero pod con bordo `interactive` quando tocca a te.
- Juice (`src/ui/motion.tsx`, `src/ui/haptics.ts`): PressableScale (0.96/80ms + spring), CountUp (250–400ms), FlashView (150–300ms), PrimaryButton con lip inferiore; haptics light su conferma / medium-notification su esito.
- Profilo → "Riduci animazioni" (Sistema/Sì/No) persistito in `profile.reduceMotion`, rispetta `AccessibilityInfo.isReduceMotionEnabled`.
- Ogni stato colorato porta anche glifo (✓ ! ✕ ▶ ●). Zero colori hardcoded fuori da theme.ts.

## Revisione 2 — Home separata dal percorso (2026-06-26)
- `app/(tabs)/index.tsx` = HOME minimale: riga stato (streak `streak` + media `reward`), una card progresso (lezione in corso → tap riprende), CTA hero `reward` "GIOCA UNA SESSIONE", pill "Ripassa" (badge concetti in scadenza) e "Statistiche". 16 token di contenuto (21 con tab bar).
- `app/(tabs)/study.tsx` = percorso di studio: una card chiusa per modulo (titolo, sottotitolo, barra, contatore o lucchetto). Lezioni solo in `app/module/[id].tsx`.
- Onboarding: 3 schermate, ≤ 8 parole + grafica SVG, "Salta" sempre visibile.
- Store: `activityDays` (streak), selettori `streakDays()` e `currentLesson()`.
- Frase "Applica la teoria al tavolo…" spostata nel setup sessione.

## Backlog (prioritized)
- **P0**: —
- **P1**: EV via rollout multi-strada completo (attuale: modello in forma chiusa, vedi DECISIONS.md); replay mano con "rigioca da qui"; export report come immagine (react-native-view-shot).
- **P2**: contenuto reale M2–M8; verdetto differito a fine mano; audio TTS lezioni; storico mani con filtri e ricerca per seed; migrazione persistenza a expo-sqlite.

## Next tasks
- Replay della mano e "rigioca da qui" dallo stesso seed.
- Storico mani con filtri (posizione/esito/classe/street).
- Contenuto M2 (Equilibrio e GTO).
