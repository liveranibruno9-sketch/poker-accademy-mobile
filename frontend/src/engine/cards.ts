// Cards: creation, parsing/formatting notation ("As","Th"), deck, seeded shuffle,
// and a 0..51 index encoding used by ranges/equity.

import { Rng } from "./rng";
import { Card, RANK_CHARS, SUIT_CHARS, Suit } from "./types";

export function cardIndex(c: Card): number {
  return (c.rank - 2) * 4 + c.suit; // 0..51
}

export function cardFromIndex(i: number): Card {
  return { rank: (i >> 2) + 2, suit: (i & 3) as Suit };
}

export function parseCard(s: string): Card {
  const r = RANK_CHARS.indexOf(s[0].toUpperCase());
  const su = SUIT_CHARS.indexOf(s[1].toLowerCase());
  if (r < 0 || su < 0) throw new Error(`Bad card: ${s}`);
  return { rank: r + 2, suit: su as Suit };
}

export function parseCards(s: string): Card[] {
  const clean = s.replace(/\s+/g, "");
  const out: Card[] = [];
  for (let i = 0; i < clean.length; i += 2) out.push(parseCard(clean.slice(i, i + 2)));
  return out;
}

export function formatCard(c: Card): string {
  return RANK_CHARS[c.rank - 2] + SUIT_CHARS[c.suit];
}

export function formatCards(cards: Card[]): string {
  return cards.map(formatCard).join(" ");
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (let r = 2; r <= 14; r++) for (let s = 0; s < 4; s++) deck.push({ rank: r, suit: s as Suit });
  return deck;
}

export function shuffledDeck(rng: Rng): Card[] {
  return rng.shuffle(makeDeck());
}

// Remove a set of cards from a deck (by index equality).
export function removeCards(deck: Card[], used: Card[]): Card[] {
  const usedSet = new Set(used.map(cardIndex));
  return deck.filter((c) => !usedSet.has(cardIndex(c)));
}

export const RANK_LABEL_IT: Record<number, string> = {
  14: "Asso",
  13: "Re",
  12: "Donna",
  11: "Jack",
  10: "10",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2",
};
