// 5-7 card hand evaluator. Returns a comparable integer (higher = stronger)
// plus a category + Italian label. Correct on all edge cases (wheel straight,
// quads > full house, straight flush, kickers).

import { Card } from "./types";

export const CATEGORY = {
  HIGH: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
} as const;

export const CATEGORY_LABEL_IT: Record<number, string> = {
  0: "Carta alta",
  1: "Coppia",
  2: "Doppia coppia",
  3: "Tris",
  4: "Scala",
  5: "Colore",
  6: "Full",
  7: "Poker",
  8: "Scala colore",
};

export interface HandResult {
  value: number;
  category: number;
  label: string;
}

// Pack category + up to 5 tiebreak ranks into one integer (base 15).
function pack(category: number, tb: number[]): number {
  let v = category;
  for (let i = 0; i < 5; i++) v = v * 15 + (tb[i] ?? 0);
  return v;
}

// Evaluate exactly 5 cards.
function rank5(cards: Card[]): { value: number; category: number } {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  // rank counts
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // sort ranks by (count desc, rank desc)
  const grouped = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // straight detection
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5; // wheel A-2-3-4-5
  }

  if (isFlush && straightHigh) return { value: pack(CATEGORY.STRAIGHT_FLUSH, [straightHigh]), category: CATEGORY.STRAIGHT_FLUSH };
  if (grouped[0][1] === 4) {
    const kicker = grouped[1][0];
    return { value: pack(CATEGORY.QUADS, [grouped[0][0], kicker]), category: CATEGORY.QUADS };
  }
  if (grouped[0][1] === 3 && grouped[1][1] === 2)
    return { value: pack(CATEGORY.FULL_HOUSE, [grouped[0][0], grouped[1][0]]), category: CATEGORY.FULL_HOUSE };
  if (isFlush) return { value: pack(CATEGORY.FLUSH, ranks), category: CATEGORY.FLUSH };
  if (straightHigh) return { value: pack(CATEGORY.STRAIGHT, [straightHigh]), category: CATEGORY.STRAIGHT };
  if (grouped[0][1] === 3) {
    const kickers = grouped.slice(1).map((g) => g[0]);
    return { value: pack(CATEGORY.TRIPS, [grouped[0][0], ...kickers]), category: CATEGORY.TRIPS };
  }
  if (grouped[0][1] === 2 && grouped[1][1] === 2) {
    const hp = Math.max(grouped[0][0], grouped[1][0]);
    const lp = Math.min(grouped[0][0], grouped[1][0]);
    const kicker = grouped[2][0];
    return { value: pack(CATEGORY.TWO_PAIR, [hp, lp, kicker]), category: CATEGORY.TWO_PAIR };
  }
  if (grouped[0][1] === 2) {
    const kickers = grouped.slice(1).map((g) => g[0]);
    return { value: pack(CATEGORY.PAIR, [grouped[0][0], ...kickers]), category: CATEGORY.PAIR };
  }
  return { value: pack(CATEGORY.HIGH, ranks), category: CATEGORY.HIGH };
}

// Precomputed 5-of-7 index combinations.
const COMB_5_OF_7: number[][] = (() => {
  const out: number[][] = [];
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 4; b++)
      for (let c = b + 1; c < 5; c++)
        for (let d = c + 1; d < 6; d++)
          for (let e = d + 1; e < 7; e++) out.push([a, b, c, d, e]);
  return out;
})();

// Evaluate 5, 6 or 7 cards; returns best comparable value.
export function evaluate(cards: Card[]): { value: number; category: number } {
  if (cards.length === 5) return rank5(cards);
  if (cards.length < 5) throw new Error("Need at least 5 cards");
  let best = { value: -1, category: 0 };
  if (cards.length === 7) {
    const buf: Card[] = [cards[0], cards[1], cards[2], cards[3], cards[4]];
    for (const combo of COMB_5_OF_7) {
      for (let i = 0; i < 5; i++) buf[i] = cards[combo[i]];
      const r = rank5(buf);
      if (r.value > best.value) best = r;
    }
    return best;
  }
  // 6 cards: 6 combos of 5
  for (let skip = 0; skip < cards.length; skip++) {
    const buf = cards.filter((_, i) => i !== skip);
    const r = rank5(buf);
    if (r.value > best.value) best = r;
  }
  return best;
}

export function evaluateFull(cards: Card[]): HandResult {
  const r = evaluate(cards);
  return { ...r, label: CATEGORY_LABEL_IT[r.category] };
}
