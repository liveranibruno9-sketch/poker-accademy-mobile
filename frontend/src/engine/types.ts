// Core engine types. Pure data, no React / native imports anywhere in engine/.

export type Suit = 0 | 1 | 2 | 3; // 0=clubs, 1=diamonds, 2=hearts, 3=spades
export interface Card {
  rank: number; // 2..14 (11=J,12=Q,13=K,14=A)
  suit: Suit;
}

export type Position = "UTG" | "HJ" | "CO" | "BTN" | "SB" | "BB";
export type Street = "preflop" | "flop" | "turn" | "river";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise";
export interface Action {
  type: ActionType;
  amount?: number; // total chips put in for bet/raise this street (to-amount), or call amount
}

export interface ActionEv {
  action: Action;
  label: string;
  evChips: number;
  evBb: number;
  stdErr: number;
  rank: number;
}

export type BotProfileId = "nit" | "tag" | "lag" | "fish" | "whale" | "maniac";

export const RANK_CHARS = "23456789TJQKA";
export const SUIT_CHARS = "cdhs"; // index = suit
