// Equity: hand vs hand (exact enumeration when feasible), hand vs range
// (enumeration or adaptive Monte Carlo). Deterministic given a seed.

import { cardIndex, makeDeck, removeCards } from "./cards";
import { evaluate } from "./evaluator";
import { ALL_COMBOS } from "./ranges";
import { Rng } from "./rng";
import { Card } from "./types";

export interface EquityResult {
  equity: number;
  iterations: number;
  exact: boolean;
  stdErr: number;
}

function combos(n: number, k: number): number {
  let num = 1;
  for (let i = 0; i < k; i++) num = (num * (n - i)) / (i + 1);
  return Math.round(num);
}

// Compare hero vs one villain given a full 5-card board. Returns 1/0/0.5.
function showdown(hero: Card[], villain: Card[], board: Card[]): number {
  const h = evaluate([...hero, ...board]).value;
  const v = evaluate([...villain, ...board]).value;
  return h > v ? 1 : h < v ? 0 : 0.5;
}

// Enumerate all ways to complete the board from `deck`, sum hero result.
function enumerate(hero: Card[], villain: Card[], board: Card[], deck: Card[]): { sum: number; n: number } {
  const need = 5 - board.length;
  let sum = 0;
  let n = 0;
  const b = [...board];
  const rec = (start: number, depth: number) => {
    if (depth === need) {
      sum += showdown(hero, villain, b);
      n++;
      return;
    }
    for (let i = start; i <= deck.length - (need - depth); i++) {
      b.push(deck[i]);
      rec(i + 1, depth + 1);
      b.pop();
    }
  };
  rec(0, 0);
  return { sum, n };
}

// Hand vs hand. Exact enumeration if the remaining runouts are small,
// otherwise deterministic Monte Carlo seeded from the inputs.
export function handVsHand(hero: Card[], villain: Card[], board: Card[] = []): EquityResult {
  const dead = [...hero, ...villain, ...board];
  const deck = removeCards(makeDeck(), dead);
  const need = 5 - board.length;
  const nCombos = combos(deck.length, need);

  if (nCombos <= 200000) {
    const { sum, n } = enumerate(hero, villain, board, deck);
    return { equity: sum / n, iterations: n, exact: true, stdErr: 0 };
  }

  // Monte Carlo, deterministic seed from inputs.
  const seed = dead.map(cardIndex).join("-");
  const rng = new Rng("hvh:" + seed);
  const iters = 30000;
  let sum = 0;
  const b: Card[] = [];
  for (let it = 0; it < iters; it++) {
    b.length = 0;
    const local = deck.slice();
    for (let d = 0; d < need; d++) {
      const idx = rng.int(local.length);
      b.push(local[idx]);
      local[idx] = local[local.length - 1];
      local.pop();
    }
    sum += showdown(hero, villain, [...board, ...b]);
  }
  const eq = sum / iters;
  const stdErr = Math.sqrt((eq * (1 - eq)) / iters);
  return { equity: eq, iterations: iters, exact: false, stdErr };
}

// Hand vs weighted range. Monte Carlo over villain combos weighted by the
// range, then a random runout. Adaptive iterations to hit target stdErr.
export function handVsRange(
  hero: Card[],
  range: Float32Array,
  board: Card[] = [],
  opts: { seed?: string; maxIters?: number; targetStdErr?: number } = {},
): EquityResult {
  const heroSet = new Set([...hero, ...board].map(cardIndex));
  // Build the list of legal villain combos (not blocked) with weights.
  const legal: { a: number; b: number; w: number }[] = [];
  let wsum = 0;
  for (let i = 0; i < 1326; i++) {
    const w = range[i];
    if (w <= 0) continue;
    const [a, b] = ALL_COMBOS[i];
    if (heroSet.has(a) || heroSet.has(b)) continue;
    legal.push({ a, b, w });
    wsum += w;
  }
  if (legal.length === 0 || wsum === 0) {
    return { equity: 0.5, iterations: 0, exact: false, stdErr: 1 };
  }
  // cumulative weights for sampling
  const cum: number[] = [];
  let acc = 0;
  for (const l of legal) {
    acc += l.w;
    cum.push(acc);
  }

  const rng = new Rng(opts.seed ?? "hvr:" + [...hero, ...board].map(cardIndex).join("-"));
  const maxIters = opts.maxIters ?? 4000;
  const targetStdErr = opts.targetStdErr ?? 0.005;
  const baseDeck = makeDeck().filter((c) => !heroSet.has(cardIndex(c)));

  let sum = 0;
  let sumSq = 0;
  let n = 0;
  const need = 5 - board.length;

  for (let it = 0; it < maxIters; it++) {
    // sample a villain combo by weight
    const r = rng.next() * acc;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const combo = legal[lo];
    const vA = cardFromIdx(combo.a);
    const vB = cardFromIdx(combo.b);
    // deck excluding villain cards
    const local = baseDeck.filter((c) => cardIndex(c) !== combo.a && cardIndex(c) !== combo.b);
    // random runout
    const b: Card[] = [];
    for (let d = 0; d < need; d++) {
      const idx = rng.int(local.length);
      b.push(local[idx]);
      local[idx] = local[local.length - 1];
      local.pop();
    }
    const res = showdown(hero, [vA, vB], [...board, ...b]);
    sum += res;
    sumSq += res * res;
    n++;
    if (n >= 400 && n % 200 === 0) {
      const mean = sum / n;
      const variance = sumSq / n - mean * mean;
      const se = Math.sqrt(Math.max(variance, 0) / n);
      if (se < targetStdErr) break;
    }
  }
  const equity = sum / n;
  const mean = equity;
  const variance = sumSq / n - mean * mean;
  const stdErr = Math.sqrt(Math.max(variance, 0) / n);
  return { equity, iterations: n, exact: false, stdErr };
}

function cardFromIdx(i: number): Card {
  return { rank: (i >> 2) + 2, suit: (i & 3) as any };
}
