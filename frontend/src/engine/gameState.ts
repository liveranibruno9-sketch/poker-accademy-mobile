// Hand state machine for No Limit Hold'em 6-max cash. Handles blinds, action
// order, min-raise, all-in, multiple side pots, and showdown with split pots.

import { cardIndex, shuffledDeck } from "./cards";
import { evaluate } from "./evaluator";
import { Rng } from "./rng";
import { Action, BotProfileId, Card, Position, Street } from "./types";

export interface Seat {
  index: number;
  isHero: boolean;
  profile: BotProfileId | null;
  position: Position;
  stack: number; // chips remaining
  hole: [Card, Card] | null;
  committed: number; // chips in this street
  invested: number; // chips in this whole hand
  folded: boolean;
  allIn: boolean;
  needsToAct: boolean;
}

export interface LogEntry {
  seat: number;
  position: Position;
  street: Street;
  action: Action;
  text: string;
}

export interface HandConfig {
  seatProfiles: (BotProfileId | null)[]; // 6 entries; null = hero
  buttonSeat: number;
  startingStackBb: number;
  bb: number; // chip value of big blind
  sb: number;
  handSeed: string;
}

export interface GameState {
  seats: Seat[];
  buttonSeat: number;
  street: Street;
  board: Card[];
  deck: Card[];
  deckPos: number;
  currentBet: number; // highest committed this street
  lastRaiseSize: number;
  toAct: number; // seat index, -1 when hand over / needs deal
  lastAggressor: number;
  bb: number;
  sb: number;
  handSeed: string;
  log: LogEntry[];
  finished: boolean;
  rng: Rng;
  potAtFlop: number;
}

const ORDER: Position[] = ["SB", "BB", "UTG", "HJ", "CO", "BTN"];

export function positionForSeat(seatIndex: number, buttonSeat: number): Position {
  // BTN = buttonSeat, SB = +1, BB = +2, UTG = +3, HJ = +4, CO = +5
  const off = (seatIndex - buttonSeat + 6) % 6;
  const map: Position[] = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];
  return map[off];
}

export function pot(state: GameState): number {
  return state.seats.reduce((s, x) => s + x.invested, 0);
}

export function toCall(state: GameState, seatIndex: number): number {
  const seat = state.seats[seatIndex];
  return Math.max(0, state.currentBet - seat.committed);
}

export function activeSeats(state: GameState): Seat[] {
  return state.seats.filter((s) => !s.folded);
}

export function createHand(cfg: HandConfig): GameState {
  const rng = new Rng(cfg.handSeed);
  const deck = shuffledDeck(rng);
  const seats: Seat[] = cfg.seatProfiles.map((profile, index) => ({
    index,
    isHero: profile === null,
    profile,
    position: positionForSeat(index, cfg.buttonSeat),
    stack: cfg.startingStackBb * cfg.bb,
    hole: null,
    committed: 0,
    invested: 0,
    folded: false,
    allIn: false,
    needsToAct: true,
  }));

  let deckPos = 0;
  // deal 2 cards each starting from SB
  for (let round = 0; round < 2; round++) {
    for (let k = 0; k < 6; k++) {
      const idx = (cfg.buttonSeat + 1 + k) % 6;
      if (!seats[idx].hole) seats[idx].hole = [deck[deckPos++], deck[deckPos++]] as [Card, Card];
      else {
        const h = seats[idx].hole!;
        seats[idx].hole = [h[0], deck[deckPos++]];
      }
    }
  }
  // simpler deterministic deal: overwrite cleanly
  deckPos = 0;
  for (const s of seats) s.hole = null;
  for (let k = 0; k < 6; k++) {
    const idx = (cfg.buttonSeat + 1 + k) % 6;
    seats[idx].hole = [deck[deckPos], deck[deckPos + 6]] as [Card, Card];
    deckPos++;
  }
  deckPos = 12;

  const state: GameState = {
    seats,
    buttonSeat: cfg.buttonSeat,
    street: "preflop",
    board: [],
    deck,
    deckPos,
    currentBet: 0,
    lastRaiseSize: cfg.bb,
    toAct: -1,
    lastAggressor: -1,
    bb: cfg.bb,
    sb: cfg.sb,
    handSeed: cfg.handSeed,
    log: [],
    finished: false,
    rng,
    potAtFlop: 0,
  };

  // post blinds
  const sbSeat = (cfg.buttonSeat + 1) % 6;
  const bbSeat = (cfg.buttonSeat + 2) % 6;
  postBlind(state, sbSeat, cfg.sb);
  postBlind(state, bbSeat, cfg.bb);
  state.currentBet = cfg.bb;
  state.lastRaiseSize = cfg.bb;
  // UTG acts first preflop
  state.toAct = (cfg.buttonSeat + 3) % 6;
  return state;
}

function postBlind(state: GameState, seatIndex: number, amount: number) {
  const seat = state.seats[seatIndex];
  const amt = Math.min(amount, seat.stack);
  seat.stack -= amt;
  seat.committed += amt;
  seat.invested += amt;
  if (seat.stack === 0) seat.allIn = true;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  canRaise: boolean;
  minRaiseTo: number; // total this street
  maxRaiseTo: number; // all-in
}

export function legalActions(state: GameState): LegalActions {
  const seat = state.seats[state.toAct];
  const call = toCall(state, seat.index);
  const facingBet = call > 0;
  const minRaiseTo = state.currentBet + state.lastRaiseSize;
  const maxRaiseTo = seat.committed + seat.stack;
  return {
    canFold: facingBet,
    canCheck: !facingBet,
    canCall: facingBet && seat.stack > 0,
    callAmount: Math.min(call, seat.stack),
    canBet: !facingBet && seat.stack > 0,
    canRaise: facingBet && maxRaiseTo > state.currentBet,
    minRaiseTo: Math.min(minRaiseTo, maxRaiseTo),
    maxRaiseTo,
  };
}

function actionText(seat: Seat, action: Action, bb: number): string {
  const inBb = (x: number) => (x / bb).toFixed(x % bb === 0 ? 0 : 1);
  switch (action.type) {
    case "fold":
      return `${seat.position} folda`;
    case "check":
      return `${seat.position} check`;
    case "call":
      return `${seat.position} chiama ${inBb(action.amount ?? 0)}bb`;
    case "bet":
      return `${seat.position} punta ${inBb(action.amount ?? 0)}bb`;
    case "raise":
      return `${seat.position} rilancia a ${inBb(action.amount ?? 0)}bb`;
  }
}

// Apply a fully-specified action for the seat to act. Advances state.
export function applyAction(state: GameState, action: Action): GameState {
  const seat = state.seats[state.toAct];
  const la = legalActions(state);

  if (action.type === "fold") {
    seat.folded = true;
    seat.needsToAct = false;
  } else if (action.type === "check") {
    seat.needsToAct = false;
  } else if (action.type === "call") {
    const amt = la.callAmount;
    seat.stack -= amt;
    seat.committed += amt;
    seat.invested += amt;
    if (seat.stack === 0) seat.allIn = true;
    seat.needsToAct = false;
  } else {
    // bet or raise: amount = total committed this street
    let raiseTo = action.amount ?? la.minRaiseTo;
    raiseTo = Math.max(la.minRaiseTo, Math.min(raiseTo, la.maxRaiseTo));
    const delta = raiseTo - seat.committed;
    seat.stack -= delta;
    seat.invested += delta;
    const prevBet = state.currentBet;
    seat.committed = raiseTo;
    state.lastRaiseSize = Math.max(state.lastRaiseSize, raiseTo - prevBet);
    state.currentBet = raiseTo;
    if (seat.stack === 0) seat.allIn = true;
    state.lastAggressor = seat.index;
    // everyone else active & not all-in must act again
    for (const s of state.seats) {
      if (s.index !== seat.index && !s.folded && !s.allIn) s.needsToAct = true;
    }
    seat.needsToAct = false;
  }

  state.log.push({
    seat: seat.index,
    position: seat.position,
    street: state.street,
    action: { ...action, amount: action.type === "call" ? la.callAmount : action.amount },
    text: actionText(seat, action, state.bb),
  });

  advance(state);
  return state;
}

function activeCount(state: GameState): number {
  return state.seats.filter((s) => !s.folded).length;
}

function nextToAct(state: GameState, from: number): number {
  for (let i = 1; i <= 6; i++) {
    const idx = (from + i) % 6;
    const s = state.seats[idx];
    if (!s.folded && !s.allIn && s.needsToAct) return idx;
  }
  return -1;
}

function advance(state: GameState) {
  // hand ends if only one player left
  if (activeCount(state) === 1) {
    endHand(state);
    return;
  }
  const next = nextToAct(state, state.toAct);
  if (next !== -1) {
    state.toAct = next;
    return;
  }
  // street complete -> deal next
  dealNextStreet(state);
}

function dealNextStreet(state: GameState) {
  // reset street commitments
  for (const s of state.seats) {
    s.committed = 0;
    s.needsToAct = !s.folded && !s.allIn;
  }
  state.currentBet = 0;
  state.lastRaiseSize = state.bb;
  state.lastAggressor = -1;

  if (state.street === "preflop") {
    state.street = "flop";
    state.board.push(state.deck[state.deckPos++], state.deck[state.deckPos++], state.deck[state.deckPos++]);
    state.potAtFlop = pot(state);
  } else if (state.street === "flop") {
    state.street = "turn";
    state.board.push(state.deck[state.deckPos++]);
  } else if (state.street === "turn") {
    state.street = "river";
    state.board.push(state.deck[state.deckPos++]);
  } else {
    endHand(state);
    return;
  }

  // if <=1 can act (all others all-in), run it out to showdown
  const canAct = state.seats.filter((s) => !s.folded && !s.allIn).length;
  if (canAct <= 1) {
    // deal remaining board then showdown
    while (state.board.length < 5) state.board.push(state.deck[state.deckPos++]);
    endHand(state);
    return;
  }
  // first to act postflop = first active after button
  state.toAct = firstActivePostflop(state);
}

function firstActivePostflop(state: GameState): number {
  for (let i = 1; i <= 6; i++) {
    const idx = (state.buttonSeat + i) % 6;
    const s = state.seats[idx];
    if (!s.folded && !s.allIn) return idx;
  }
  return -1;
}

function endHand(state: GameState) {
  state.finished = true;
  state.toAct = -1;
  distributePots(state);
}

export interface PotResult {
  amount: number;
  winners: number[];
}

// Build side pots from invested amounts and award to best hands.
export function distributePots(state: GameState): PotResult[] {
  const contenders = state.seats.filter((s) => !s.folded);
  // levels from distinct invested amounts across all seats (folded chips still in pot)
  const invests = state.seats.map((s) => s.invested);
  const levels = [...new Set(invests.filter((x) => x > 0))].sort((a, b) => a - b);
  const results: PotResult[] = [];
  let prev = 0;
  const winnings: Record<number, number> = {};
  for (const s of state.seats) winnings[s.index] = 0;

  for (const level of levels) {
    const layer = level - prev;
    let potAmount = 0;
    for (const s of state.seats) {
      const contribution = Math.min(Math.max(s.invested - prev, 0), layer);
      potAmount += contribution;
    }
    // eligible = contenders who invested at least `level`
    const eligible = contenders.filter((s) => s.invested >= level);
    if (eligible.length > 0 && potAmount > 0) {
      let winners: number[];
      if (eligible.length === 1) {
        winners = [eligible[0].index];
      } else {
        const scored = eligible.map((s) => ({
          seat: s.index,
          value: evaluate([...s.hole!, ...state.board]).value,
        }));
        const best = Math.max(...scored.map((x) => x.value));
        winners = scored.filter((x) => x.value === best).map((x) => x.seat);
      }
      const orderedWinners = [...winners].sort(
        (a, b) => ((a - state.buttonSeat + 6) % 6) - ((b - state.buttonSeat + 6) % 6),
      );
      if (winners.length === 1) {
        winnings[winners[0]] += potAmount;
      } else if (Number.isInteger(potAmount)) {
        const share = Math.floor(potAmount / winners.length);
        let remainder = potAmount - share * winners.length; // whole odd chips
        for (const w of orderedWinners) {
          winnings[w] += share + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;
        }
      } else {
        // fractional chip unit (e.g. 0.5 blinds): split evenly, conserves exactly
        const share = potAmount / winners.length;
        for (const w of orderedWinners) winnings[w] += share;
      }
      results.push({ amount: potAmount, winners });
    }
    prev = level;
  }
  // pay out
  for (const s of state.seats) s.stack += winnings[s.index];
  state.seats.forEach((s) => ((s as any).won = winnings[s.index]));
  return results;
}

export function heroSeat(state: GameState): Seat {
  return state.seats.find((s) => s.isHero)!;
}

export function heroNetBb(state: GameState, startingStackChips: number): number {
  const hero = heroSeat(state);
  return (hero.stack - startingStackChips) / state.bb;
}

// Utility: remaining known-to-hero blockers (hero cards + board).
export function heroBlockers(state: GameState): Card[] {
  const hero = heroSeat(state);
  return [...(hero.hole ?? []), ...state.board];
}

export function usedCardIndices(state: GameState): Set<number> {
  const set = new Set<number>();
  for (const s of state.seats) if (s.hole) for (const c of s.hole) set.add(cardIndex(c));
  for (const c of state.board) set.add(cardIndex(c));
  return set;
}
