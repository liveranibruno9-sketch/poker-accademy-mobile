// Ranges: 1326 combos as a Float32Array of weights, the 13x13 grid, and a
// text-notation parser ("88+, A5s-A2s, KJo+").

import { cardFromIndex, cardIndex } from "./cards";
import { Card, RANK_CHARS } from "./types";

// All 1326 combos as [cardIndexA, cardIndexB] with A < B.
export const ALL_COMBOS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < 52; i++) for (let j = i + 1; j < 52; j++) out.push([i, j]);
  return out;
})();

export const COMBO_INDEX = (() => {
  const m = new Map<number, number>();
  ALL_COMBOS.forEach(([a, b], idx) => m.set(a * 52 + b, idx));
  return m;
})();

export function comboIndexFromCards(c1: Card, c2: Card): number {
  let a = cardIndex(c1);
  let b = cardIndex(c2);
  if (a > b) [a, b] = [b, a];
  return COMBO_INDEX.get(a * 52 + b)!;
}

export function emptyRange(): Float32Array {
  return new Float32Array(1326);
}

export function fullRange(): Float32Array {
  return new Float32Array(1326).fill(1);
}

// Grid: rows/cols index 0..12 map to ranks A(0)..2(12). Highest rank first.
export function rankToGrid(rank: number): number {
  return 14 - rank; // A(14)->0, 2(2)->12
}
export function gridToRank(g: number): number {
  return 14 - g;
}

// Grid cell -> the combos belonging to it.
// row < col => suited (row is higher rank), row > col => offsuit, row==col => pair.
export function cellCombos(row: number, col: number): number[] {
  const hi = gridToRank(Math.min(row, col));
  const lo = gridToRank(Math.max(row, col));
  const out: number[] = [];
  if (row === col) {
    // pair: 6 combos
    const idxs: number[] = [];
    for (let s = 0; s < 4; s++) idxs.push((hi - 2) * 4 + s);
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) out.push(comboFromIdx(idxs[i], idxs[j]));
  } else if (row < col) {
    // suited: same suit
    for (let s = 0; s < 4; s++) out.push(comboFromIdx((hi - 2) * 4 + s, (lo - 2) * 4 + s));
  } else {
    // offsuit: different suit
    for (let s1 = 0; s1 < 4; s1++)
      for (let s2 = 0; s2 < 4; s2++)
        if (s1 !== s2) {
          out.push(comboFromIdx((hi - 2) * 4 + s1, (lo - 2) * 4 + s2));
        }
  }
  return out;
}

function comboFromIdx(a: number, b: number): number {
  if (a > b) [a, b] = [b, a];
  return COMBO_INDEX.get(a * 52 + b)!;
}

// Aggregate weight of a grid cell (0..1 average of its combos).
export function cellWeight(range: Float32Array, row: number, col: number): number {
  const combos = cellCombos(row, col);
  let s = 0;
  for (const c of combos) s += range[c];
  return combos.length ? s / combos.length : 0;
}

export function combosOfCombo(idx: number): [Card, Card] {
  const [a, b] = ALL_COMBOS[idx];
  return [cardFromIndex(a), cardFromIndex(b)];
}

// Remove combos blocked by known cards (set weight 0).
export function removeBlocked(range: Float32Array, blockers: Card[]): Float32Array {
  const set = new Set(blockers.map(cardIndex));
  for (let i = 0; i < 1326; i++) {
    if (range[i] === 0) continue;
    const [a, b] = ALL_COMBOS[i];
    if (set.has(a) || set.has(b)) range[i] = 0;
  }
  return range;
}

export function totalWeight(range: Float32Array): number {
  let s = 0;
  for (let i = 0; i < 1326; i++) s += range[i];
  return s;
}

// Percentage of all combos (weighted) that a range represents.
export function rangePercent(range: Float32Array): number {
  return (totalWeight(range) / 1326) * 100;
}

// ---- Text notation parser ----
// Supports: pairs (AA, TT+, 88-55), suited (AKs, ATs+, A5s-A2s), offsuit (AKo,
// KQo+), and mixed single hands (AK => both s and o). Comma separated.
export function parseRange(notation: string): Float32Array {
  const r = emptyRange();
  const tokens = notation.split(",").map((t) => t.trim()).filter(Boolean);
  for (const tok of tokens) setToken(r, tok);
  return r;
}

function rankVal(ch: string): number {
  return RANK_CHARS.indexOf(ch.toUpperCase()) + 2;
}

function addCell(r: Float32Array, row: number, col: number, w = 1) {
  for (const c of cellCombos(row, col)) r[c] = w;
}

function setToken(r: Float32Array, tok: string) {
  // range form X-Y
  if (tok.includes("-")) {
    const [lhs, rhs] = tok.split("-");
    return setDashRange(r, lhs.trim(), rhs.trim());
  }
  const plus = tok.endsWith("+");
  const base = plus ? tok.slice(0, -1) : tok;

  const r1 = rankVal(base[0]);
  const r2 = rankVal(base[1]);
  const suffix = base.length > 2 ? base[2].toLowerCase() : "";

  if (r1 === r2) {
    // pair
    const start = r1;
    const end = plus ? 14 : r1;
    for (let rk = start; rk <= end; rk++) addCell(r, rankToGrid(rk), rankToGrid(rk));
    return;
  }

  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const kinds = suffix === "s" ? ["s"] : suffix === "o" ? ["o"] : ["s", "o"];
  // plus for non-pairs: fix the higher card, walk the lower up to hi-1
  const loEnd = plus ? hi - 1 : lo;
  for (const k of kinds) {
    for (let l = lo; l <= loEnd; l++) {
      const rowHi = rankToGrid(hi);
      const rowLo = rankToGrid(l);
      if (k === "s") addCell(r, Math.min(rowHi, rowLo), Math.max(rowHi, rowLo)); // suited: row<col
      else addCell(r, Math.max(rowHi, rowLo), Math.min(rowHi, rowLo)); // offsuit: row>col
    }
  }
}

function setDashRange(r: Float32Array, lhs: string, rhs: string) {
  const l1 = rankVal(lhs[0]);
  const l2 = rankVal(lhs[1]);
  if (l1 === l2) {
    // pair range e.g. 88-55
    const rHi = rankVal(rhs[0]);
    const a = Math.max(l1, rHi);
    const b = Math.min(l1, rHi);
    for (let rk = b; rk <= a; rk++) addCell(r, rankToGrid(rk), rankToGrid(rk));
    return;
  }
  // suited/offsuit dash e.g. A5s-A2s : same high card, low card varies
  const suffix = lhs[2]?.toLowerCase() ?? "";
  const hi = Math.max(l1, l2);
  const loA = Math.min(l1, l2);
  const loB = Math.min(rankVal(rhs[0]), rankVal(rhs[1]));
  const lo1 = Math.min(loA, loB);
  const lo2 = Math.max(loA, loB);
  for (let l = lo1; l <= lo2; l++) {
    const rowHi = rankToGrid(hi);
    const rowLo = rankToGrid(l);
    if (suffix === "s") addCell(r, Math.min(rowHi, rowLo), Math.max(rowHi, rowLo));
    else addCell(r, Math.max(rowHi, rowLo), Math.min(rowHi, rowLo));
  }
}

// Combo -> canonical grid label like "AKs".
export function comboLabel(idx: number): string {
  const [a, b] = ALL_COMBOS[idx];
  const ca = cardFromIndex(a);
  const cb = cardFromIndex(b);
  const hi = ca.rank >= cb.rank ? ca : cb;
  const lo = ca.rank >= cb.rank ? cb : ca;
  const hc = RANK_CHARS[hi.rank - 2];
  const lc = RANK_CHARS[lo.rank - 2];
  if (hi.rank === lo.rank) return hc + lc;
  return hc + lc + (hi.suit === lo.suit ? "s" : "o");
}
