// Canonical poker math (section 12 of the brief). Pure functions, exact values.

// P = pot BEFORE the bet, b = bet size.
export function requiredEquity(pot: number, bet: number): number {
  return bet / (pot + 2 * bet);
}

export function mdf(pot: number, bet: number): number {
  return pot / (pot + bet);
}

export function alpha(pot: number, bet: number): number {
  return bet / (pot + bet);
}

// Break-even bluff frequency = risk / (risk + reward) = b / (pot + b) = alpha.
export function breakEvenBluffFreq(pot: number, bet: number): number {
  return alpha(pot, bet);
}

// Break-even fold equity needed for a pure bluff of `bet` into `pot`.
// You risk `bet` to win `pot`: fe = bet / (bet + pot).
export function breakEvenFoldEquity(pot: number, bet: number): number {
  return bet / (bet + pot);
}

export function spr(effectiveStack: number, potAtFlop: number): number {
  return effectiveStack / potAtFlop;
}

export function ev(outcomes: { p: number; result: number }[]): number {
  return outcomes.reduce((s, o) => s + o.p * o.result, 0);
}

// Pot odds as ratio string helper (reward:risk).
export function potOdds(pot: number, bet: number): number {
  return bet / (pot + bet); // = alpha; equity-to-call convenience below
}

// Combinatorics of a starting hand.
export function comboCount(kind: "pair" | "suited" | "offsuit"): number {
  return kind === "pair" ? 6 : kind === "suited" ? 4 : 12;
}

// Rule of 2 and 4 approximation.
export function ruleOf2and4(outs: number, street: "flop" | "turn"): number {
  return street === "flop" ? outs * 4 : outs * 2;
}

// Exact equity for common draws (section 12 table), keyed by outs.
export const EXACT_OUTS: Record<number, { flopToRiver: number; turnToRiver: number; label: string }> = {
  4: { flopToRiver: 0.165, turnToRiver: 0.087, label: "gutshot" },
  8: { flopToRiver: 0.315, turnToRiver: 0.174, label: "scala aperta" },
  9: { flopToRiver: 0.35, turnToRiver: 0.196, label: "colore" },
  12: { flopToRiver: 0.45, turnToRiver: 0.261, label: "gutshot + colore" },
  15: { flopToRiver: 0.541, turnToRiver: 0.326, label: "scala aperta + colore" },
};

// Required equity by bet size fraction of pot.
export const REQUIRED_EQUITY_BY_SIZE: { size: string; frac: number; req: number }[] = [
  { size: "1/3 pot", frac: 1 / 3, req: 0.2 },
  { size: "1/2 pot", frac: 0.5, req: 0.25 },
  { size: "2/3 pot", frac: 2 / 3, req: 0.286 },
  { size: "3/4 pot", frac: 0.75, req: 0.3 },
  { size: "pot", frac: 1, req: 0.333 },
];

export const MDF_BY_SIZE: { size: string; frac: number; mdf: number }[] = [
  { size: "1/3 pot", frac: 1 / 3, mdf: 0.75 },
  { size: "1/2 pot", frac: 0.5, mdf: 0.667 },
  { size: "2/3 pot", frac: 2 / 3, mdf: 0.6 },
  { size: "3/4 pot", frac: 0.75, mdf: 0.571 },
  { size: "pot", frac: 1, mdf: 0.5 },
];

// Value:bluff ratio at river by size (value per bluff).
export const VALUE_BLUFF_BY_SIZE: { size: string; ratio: number; label: string }[] = [
  { size: "1/3 pot", ratio: 3, label: "3:1" },
  { size: "1/2 pot", ratio: 2, label: "2:1" },
  { size: "3/4 pot", ratio: 1.43, label: "1,43:1" },
  { size: "pot", ratio: 1, label: "1:1" },
  { size: "2x pot", ratio: 0.5, label: "1:2" },
];

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
