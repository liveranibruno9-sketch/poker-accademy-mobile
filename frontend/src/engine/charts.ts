// Preflop charts 6-max: RFI per position + a simple vs-RFI (call/3bet) and BB
// defense. Same source feeds both lessons and grading (single source of truth).

import { parseRange } from "./ranges";
import { Position } from "./types";

// RFI (raise first in) ranges by position. Percentages roughly match the
// reference anchors: UTG ~16%, HJ ~20%, CO ~26%, BTN ~42%, SB ~44%.
export const RFI_NOTATION: Record<Position, string> = {
  UTG: "44+, A8s+, KTs+, QTs+, J9s+, T9s, 98s, ATo+, KJo+",
  HJ: "44+, A7s+, K9s+, Q9s+, J9s+, T8s+, 98s, 87s, ATo+, KJo+, KQo",
  CO: "22+, A2s+, K8s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A9o+, KTo+, QTo+, JTo",
  BTN: "22+, A2s+, K4s+, Q6s+, J7s+, T7s+, 96s+, 86s+, 75s+, 64s+, 54s, A2o+, K7o+, Q8o+, J8o+, T8o+, 98o",
  SB: "22+, A2s+, K3s+, Q5s+, J6s+, T6s+, 95s+, 85s+, 74s+, 64s+, 53s+, A2o+, K6o+, Q8o+, J8o+, T8o+, 97o+",
  BB: "22+, A2s+, K2s+, Q2s+, J4s+, T5s+, 94s+, 84s+, 73s+, 63s+, 53s+, 43s, A2o+, K5o+, Q7o+, J7o+, T7o+, 97o+, 87o",
};

// vs-RFI: how BB (and others) continue. Call + 3bet split (simplified but
// consistent). Keyed by "defender_vs_openerPosition".
export const BB_DEFENSE_VS_BTN = {
  call: "22-99, A2s-AJs, K5s-KTs, Q7s-QTs, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A2o-ATo, K9o+, Q9o+, J9o+, T9o",
  threebet: "TT+, AJs+, KQs, A5s-A2s, AQo+, KQo",
};

export function rfiRange(pos: Position): Float32Array {
  return parseRange(RFI_NOTATION[pos]);
}

// A representative 3-bet value/bluff range vs an early open (used by grading).
export const THREEBET_VS_OPEN = "TT+, AQs+, KQs, A5s-A2s, AQo+";

export function threeBetRange(): Float32Array {
  return parseRange(THREEBET_VS_OPEN);
}
