// Session/hand orchestration for the simulator. Wires gameState + bots +
// bayesian range tracking + EV + grading into one controller the table screen
// drives. Not a React module.

import { autoPlayToHero, BOT_PROFILES, botDecision } from "@/src/engine/bots";
import { rfiRange } from "@/src/engine/charts";
import { formatCard } from "@/src/engine/cards";
import { computeActionEvs, EvContext, VillainModel } from "@/src/engine/ev";
import {
  applyAction,
  createHand,
  GameState,
  heroSeat,
  legalActions,
  pot,
  Seat,
  toCall,
} from "@/src/engine/gameState";
import { DecisionGrade, diceScore, gradeDecision, gradeRangeRead } from "@/src/engine/grading";
import { comboIndexFromCards, rangePercent, removeBlocked } from "@/src/engine/ranges";
import { initVillainRange, mergeRanges, TrackNode, updateRange } from "@/src/engine/rangeTracking";
import { makeSeed, Rng } from "@/src/engine/rng";
import { Action, BotProfileId } from "@/src/engine/types";
import { applyScore } from "@/src/engine/grading";
import { DecisionRecord } from "@/src/store/appStore";

export interface SimConfig {
  handsPlanned: number;
  villainProfiles: BotProfileId[]; // 5 profiles
  stackBb: number;
  mode: "rated" | "training";
  hudEnabled: boolean;
  timerSec: number;
  verdictMode: "coach" | "scoreOnly" | "silent";
  seed?: string;
  // live = the UI drives bot actions one at a time (with delays); false = bots run synchronously (tests)
  live?: boolean;
}

export interface VillainStat {
  seat: number;
  n: number;
  vpip: number;
  pfr: number;
  reliable: boolean;
}

export class SimController {
  cfg: SimConfig;
  state!: GameState;
  score = 100;
  handIndex = 0;
  finished = false;
  endedEarly = false;
  decisions: DecisionRecord[] = [];
  grades: DecisionGrade[] = []; // parallel to decisions (deep-dive of any past decision)
  scoreTimeline: number[] = [];
  startedAt = new Date().toISOString();

  private villainRanges: Record<number, Float32Array> = {};
  private lastBoardLen = 0;
  private evCache: EvContext | null = null;
  private rangeReadsDone = 0;
  private handHadRangeRead = false;
  private villainActionsThisHand: Record<number, number> = {};
  private seed: Rng;
  private buttonSeat = 0;

  // observed stats
  private statHands: Record<number, number> = {};
  private statVpip: Record<number, number> = {};
  private statPfr: Record<number, number> = {};
  private countedPreflop: Record<number, boolean> = {};

  scoreWarningShown = false;
  lastGrade: DecisionGrade | null = null;
  lastDecision: DecisionRecord | null = null;
  lastRangeRead: { dice: number; verdict: string; pointsLost: number } | null = null;
  pendingRangeReadSeat: number | null = null;

  constructor(cfg: SimConfig) {
    this.cfg = cfg;
    this.seed = new Rng(cfg.seed ?? makeSeed());
    for (let i = 0; i < 6; i++) {
      this.statHands[i] = 0;
      this.statVpip[i] = 0;
      this.statPfr[i] = 0;
    }
    this.startHand();
  }

  private seatProfiles(): (BotProfileId | null)[] {
    // hero at seat 0, villains fill 1..5
    return [null, ...this.cfg.villainProfiles];
  }

  startHand() {
    this.buttonSeat = this.handIndex % 6;
    const handSeed = `${this.cfg.seed ?? "s"}-${this.handIndex}-${this.seed.nextUint()}`;
    this.state = createHand({
      seatProfiles: this.seatProfiles(),
      buttonSeat: this.buttonSeat,
      startingStackBb: this.cfg.stackBb,
      bb: 1,
      sb: 0.5,
      handSeed,
    });
    // init villain ranges (blockers = hero hole)
    const hero = heroSeat(this.state);
    this.villainRanges = {};
    for (const s of this.state.seats) {
      if (!s.isHero) this.villainRanges[s.index] = initVillainRange([...(hero.hole ?? [])]);
      this.countedPreflop[s.index] = false;
    }
    this.lastBoardLen = 0;
    this.evCache = null;
    this.handHadRangeRead = false;
    this.villainActionsThisHand = {};
    for (const s of this.state.seats) if (!s.isHero) this.statHands[s.index]++;
    this.autoAdvance();
  }

  private facingContext(state: GameState, seat: Seat): TrackNode["facing"] {
    if (state.street === "preflop") return state.currentBet > state.bb ? "vsRaise" : "unopened";
    return state.currentBet > 0 ? "postflopFacing" : "postflopOpen";
  }

  private step(action: Action, botSeat: Seat | null) {
    if (botSeat) {
      const node: TrackNode = {
        street: this.state.street,
        position: botSeat.position,
        facing: this.facingContext(this.state, botSeat),
        board: this.state.board,
      };
      updateRange(this.villainRanges[botSeat.index], action, node, botSeat.profile as BotProfileId);
      this.villainActionsThisHand[botSeat.index] = (this.villainActionsThisHand[botSeat.index] ?? 0) + 1;
      // observed stats preflop
      if (this.state.street === "preflop" && !this.countedPreflop[botSeat.index]) {
        if (action.type === "call" || action.type === "raise") this.statVpip[botSeat.index]++;
        if (action.type === "raise") this.statPfr[botSeat.index]++;
        if (action.type !== "check") this.countedPreflop[botSeat.index] = true;
      }
    }
    applyAction(this.state, action);
    // remove new board blockers from all villain ranges
    if (this.state.board.length !== this.lastBoardLen) {
      const newCards = this.state.board.slice(this.lastBoardLen);
      for (const k of Object.keys(this.villainRanges)) {
        const seatIdx = Number(k);
        if (!this.state.seats[seatIdx].folded) {
          removeBlocked(this.villainRanges[seatIdx], newCards);
        }
      }
      this.lastBoardLen = this.state.board.length;
    }
  }

  // Run bots until hero acts or hand ends (synchronous; in live mode the UI calls botStep()).
  private autoAdvance() {
    if (!this.cfg.live) {
      let guard = 0;
      while (this.botToAct()) {
        const seat = this.state.seats[this.state.toAct];
        this.step(botDecision(this.state, seat.index), seat);
        if (++guard > 200) break;
      }
    }
    this.afterAdvance();
  }

  private afterAdvance() {
    if (this.state.finished) {
      this.onHandEnd();
    } else if (!this.botToAct()) {
      this.evCache = null;
      this.maybeTriggerRangeRead();
    }
  }

  botToAct(): boolean {
    return !this.state.finished && this.state.toAct !== -1 && !this.state.seats[this.state.toAct].isHero;
  }

  heroToAct(): boolean {
    return !this.state.finished && this.state.toAct !== -1 && this.state.seats[this.state.toAct].isHero;
  }

  // Live mode: perform exactly one bot action. Returns false if no bot is to act.
  botStep(): boolean {
    if (!this.botToAct()) return false;
    const seat = this.state.seats[this.state.toAct];
    this.step(botDecision(this.state, seat.index), seat);
    this.afterAdvance();
    return true;
  }

  // Errors and imprecisions, worst first (the review queue / report list).
  reviewQueue(): DecisionRecord[] {
    return this.decisions.filter((d) => d.verdict !== "correct").sort((a, b) => b.pointsLost - a.pointsLost);
  }

  effectiveRange(): Float32Array {
    const active = this.state.seats.filter((s) => !s.isHero && !s.folded).map((s) => this.villainRanges[s.index]);
    return mergeRanges(active);
  }

  private villainModels(): VillainModel[] {
    return this.state.seats
      .filter((s) => !s.isHero && !s.folded)
      .map((s) => ({ weights: this.villainRanges[s.index], profile: BOT_PROFILES[s.profile as BotProfileId], committed: s.committed, stack: s.stack }));
  }

  getEv(): EvContext {
    if (!this.evCache) {
      this.evCache = computeActionEvs(this.state, this.effectiveRange(), { villains: this.villainModels(), maxIters: 1000 });
    }
    return this.evCache;
  }

  // Start the EV computation in the background as soon as the hero's node opens,
  // so the result is ready (cached) by the time the player acts. Never blocks the UI.
  precomputeEv(): void {
    if (this.evCache || this.finished) return;
    const hero = heroSeat(this.state);
    if (this.state.toAct !== hero.index) return;
    const nodeKey = () => `${this.state.handSeed}-${this.state.street}-${this.state.log.length}-${this.state.toAct}`;
    const snapshot = nodeKey();
    const run = () => {
      if (this.evCache || this.finished || nodeKey() !== snapshot) return; // node changed meanwhile
      this.getEv();
    };
    if (typeof setImmediate === "function") setImmediate(run);
    else setTimeout(run, 0);
  }

  private maybeTriggerRangeRead() {
    if (this.cfg.mode !== "rated") return;
    if (this.handHadRangeRead) return;
    const maxReads = Math.max(2, Math.min(4, Math.ceil(this.cfg.handsPlanned / 6)));
    if (this.rangeReadsDone >= maxReads) return;
    const potBb = pot(this.state);
    // a single dominant villain who has taken >= 2 actions
    const active = this.state.seats.filter((s) => !s.isHero && !s.folded);
    const aggressor = active.find((s) => (this.villainActionsThisHand[s.index] ?? 0) >= 2);
    if (potBb >= 8 && aggressor && this.state.street !== "preflop") {
      this.pendingRangeReadSeat = aggressor.index;
    }
  }

  submitRangeRead(readWeights: Float32Array) {
    const seat = this.pendingRangeReadSeat!;
    const trueW = this.villainRanges[seat];
    const dice = diceScore(trueW, readWeights);
    const g = gradeRangeRead(dice);
    this.lastRangeRead = { dice, verdict: g.verdict, pointsLost: g.pointsLost };
    this.score = applyScore(this.score, g.pointsLost, g.bonus);
    this.rangeReadsDone++;
    this.handHadRangeRead = true;
    this.pendingRangeReadSeat = null;
  }

  skipRangeRead() {
    this.pendingRangeReadSeat = null;
    this.handHadRangeRead = true;
  }

  trueRangeForSeat(seat: number): Float32Array {
    return this.villainRanges[seat];
  }

  // Hero acts.
  act(action: Action, timedOut = false) {
    const ev = this.getEv();
    const hero = heroSeat(this.state);
    const isOpenSpot = this.state.street === "preflop" && this.state.currentBet <= this.state.bb + 1e-9 && this.state.lastAggressor === -1;
    let chartWeight = 0;
    if (this.state.street === "preflop" && hero.hole) {
      const idx = comboIndexFromCards(hero.hole[0], hero.hole[1]);
      chartWeight = rfiRange(hero.position)[idx];
    }
    const grade = gradeDecision({
      state: this.state,
      ev,
      chosen: action,
      chartWeight,
      isOpenSpot,
      callChips: ev.toCallChips,
      rangeMisreadActive: this.handHadRangeRead && this.lastRangeRead?.verdict === "error",
      timedOut,
    });
    // avoid double counting: if range was misread this hand, do not also penalize the coherent downstream action
    let pointsLost = grade.pointsLost;
    if (grade.verdict === "error" && this.lastRangeRead?.verdict === "error" && grade.errorCode !== "RANGE_MISREAD") {
      pointsLost = 0;
    }
    if (this.cfg.mode === "rated") this.score = applyScore(this.score, pointsLost, grade.bonus);

    const rec: DecisionRecord = {
      handIndex: this.handIndex,
      handSeed: this.state.handSeed,
      heroPosition: hero.position,
      heroCards: [formatCard(hero.hole![0]), formatCard(hero.hole![1])],
      board: this.state.board.map(formatCard),
      street: this.state.street,
      potBb: pot(this.state),
      verdict: grade.verdict,
      errorCode: grade.errorCode,
      errorLabel: grade.errorLabel,
      severity: grade.severity,
      pointsLost,
      deltaEvBb: grade.deltaEvBb,
      equity: grade.numbers.equity,
      requiredEquity: grade.numbers.requiredEquity,
      mdf: grade.numbers.mdf,
      alpha: grade.numbers.alpha,
      spr: grade.numbers.spr,
      chosenLabel: grade.chosenEv.label,
      bestLabel: grade.bestEv.label,
      evActions: ev.actions.map((a) => ({ label: a.label, evBb: a.evBb, rank: a.rank })),
      diceRead: this.lastRangeRead?.dice,
      villainPct: this.averageVillainPct(),
    };
    this.decisions.push(rec);
    this.grades.push({ ...grade, pointsLost });
    this.lastGrade = { ...grade, pointsLost };
    this.lastDecision = rec;
    this.lastRangeRead = null;

    this.step(action, null);
    if (this.state.finished) this.onHandEnd();
    else this.autoAdvance();
  }

  private onHandEnd() {
    this.scoreTimeline.push(this.score);
    this.score = Math.max(0, Math.min(100, this.score));
    if (this.cfg.mode === "rated" && this.score < 50) {
      this.endedEarly = true;
      this.finished = true;
      return;
    }
    if (this.handIndex + 1 >= this.cfg.handsPlanned) {
      this.finished = true;
      return;
    }
  }

  nextHand() {
    if (this.finished) return;
    this.handIndex++;
    this.startHand();
  }

  observedStats(seat: number): VillainStat {
    const n = this.statHands[seat] || 0;
    return {
      seat,
      n,
      vpip: n ? Math.round((this.statVpip[seat] / n) * 100) : 0,
      pfr: n ? Math.round((this.statPfr[seat] / n) * 100) : 0,
      reliable: n >= 25,
    };
  }

  // Mean width (% of hands) of the active villains' tracked ranges, for the deep dive.
  averageVillainPct(): number {
    const active = this.state.seats.filter((x) => !x.isHero && !x.folded);
    if (!active.length) return 0;
    return active.reduce((a, x) => a + rangePercent(this.villainRanges[x.index]), 0) / active.length;
  }

  villainRangePercent(seat: number): number {
    return rangePercent(this.villainRanges[seat]);
  }
}
