// Teaching infographics. Every component here is INTERACTIVE by default: one
// parameter (max two) drives the result in real time, the key number stays
// big and visible, the flip zone is highlighted, labels live inside/adjacent
// to the graphic. No decorative animation.
import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { requiredEquity } from "@/src/engine/math";
import { Slider } from "@/src/ui/Slider";
import { CountUp, PressableScale } from "@/src/ui/motion";
import { RangeGrid13x13 } from "./RangeGrid";
import { cellCombos, emptyRange, rangePercent, totalWeight } from "@/src/engine/ranges";

const W = 320;
const pct1 = (v: number) => `${v.toFixed(1)}%`;
const pct0 = (v: number) => `${v.toFixed(0)}%`;

// ---------------------------------------------------------------------------
// Pot odds: slider on bet size → required equity moves live.
// ---------------------------------------------------------------------------
export function PotOddsBar({
  pot = 100,
  bet = 50,
  equity,
  interactive = true,
  showRequired = true,
  width = W,
}: {
  pot?: number;
  bet?: number;
  equity?: number; // hero's estimated equity (%) → shows the flip
  interactive?: boolean;
  showRequired?: boolean;
  width?: number;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [b, setB] = useState(bet);
  const req = requiredEquity(pot, b) * 100;
  const total = pot + b + b;
  const h = 44;
  const potW = (pot / total) * width;
  const betW = (b / total) * width;
  const callOk = equity != null ? equity >= req : null;
  const flipBet = equity != null && equity < 50 ? (pot * (equity / 100)) / (1 - 2 * (equity / 100)) : null;

  return (
    <View style={{ gap: spacing.md }}>
      <Svg width={width} height={h}>
        <Rect x={0} y={0} width={potW} height={h} rx={6} fill={colors.brandTertiary} />
        <Rect x={potW} y={0} width={betW} height={h} fill={colors.warning} />
        <Rect x={potW + betW} y={0} width={width - potW - betW} height={h} rx={6} fill={colors.highlight} />
        <SvgText x={potW / 2} y={h / 2 + 5} fontSize={13} fontWeight="700" fill={colors.onSurface} textAnchor="middle">Piatto {pot}</SvgText>
        <SvgText x={potW + betW / 2} y={h / 2 + 5} fontSize={13} fontWeight="700" fill={colors.onWarning} textAnchor="middle">Puntata {b}</SvgText>
        <SvgText x={potW + betW + betW / 2} y={h / 2 + 5} fontSize={13} fontWeight="700" fill={colors.onInfo} textAnchor="middle">Call {b}</SvgText>
      </Svg>
      {showRequired ? (
        <View style={s.keyRow}>
          <Text style={s.keyLabel}>EQUITY RICHIESTA</Text>
          <CountUp value={req} format={pct1} style={s.keyNumber} testID="potodds-required" />
        </View>
      ) : null}
      {equity != null ? (
        <View style={[s.verdict, { borderColor: callOk ? colors.positive : colors.negative, backgroundColor: (callOk ? colors.positive : colors.negative) + "18" }]}>
          <Text style={[s.verdictText, { color: callOk ? colors.positive : colors.negative }]}>{callOk ? "✓ Call" : "✕ Fold"}</Text>
          <Text style={s.verdictSub}>
            hai {equity}% · {flipBet != null ? `si ribalta a puntata ${Math.round(flipBet)}` : "chiami sempre"}
          </Text>
        </View>
      ) : null}
      {interactive ? <Slider value={b} min={10} max={200} step={5} onChange={setB} label="PUNTATA" testID="potodds-slider" /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Equity wheel: slider on equity; optional `required` shows the flip.
// ---------------------------------------------------------------------------
export function EquityWheel({
  equity = 0.5,
  required,
  interactive = false,
  width = 160,
  labelHero = "Tu",
  labelVillain = "Avv.",
}: {
  equity?: number;
  required?: number; // 0..1
  interactive?: boolean;
  width?: number;
  labelHero?: string;
  labelVillain?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [e, setE] = useState(equity);
  const r = width / 2 - 10;
  const cx = width / 2;
  const cy = width / 2;
  const circ = 2 * Math.PI * r;
  const ok = required != null ? e >= required : null;
  const reqAngle = required != null ? -90 + required * 360 : 0;
  const rad = (reqAngle * Math.PI) / 180;
  return (
    <View style={{ alignItems: "center", gap: spacing.md, alignSelf: "stretch" }}>
      <Svg width={width} height={width}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.negative} strokeWidth={16} fill="none" />
        <Circle cx={cx} cy={cy} r={r} stroke={colors.positive} strokeWidth={16} fill="none" strokeDasharray={`${circ * e} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        {required != null ? <Line x1={cx + (r - 14) * Math.cos(rad)} y1={cy + (r - 14) * Math.sin(rad)} x2={cx + (r + 14) * Math.cos(rad)} y2={cy + (r + 14) * Math.sin(rad)} stroke={colors.onSurface} strokeWidth={3} /> : null}
        <SvgText x={cx} y={cy - 2} fontSize={26} fontWeight="700" fill={colors.onSurface} textAnchor="middle">{Math.round(e * 100)}%</SvgText>
        <SvgText x={cx} y={cy + 18} fontSize={11} fill={colors.muted} textAnchor="middle">{labelHero}</SvgText>
        <SvgText x={cx} y={cy + 34} fontSize={10} fill={colors.negative} textAnchor="middle">{labelVillain} {Math.round((1 - e) * 100)}%</SvgText>
      </Svg>
      {required != null ? (
        <Text style={[s.verdictText, { color: ok ? colors.positive : colors.negative }]}>{ok ? "✓ Call" : "✕ Fold"} · serve {Math.round(required * 100)}%</Text>
      ) : null}
      {interactive ? <Slider value={Math.round(e * 100)} min={0} max={100} step={1} onChange={(v) => setE(v / 100)} label="LA TUA EQUITY" format={pct0} testID="equity-slider" /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Outs counter: tap the cards to set the outs; rule of 2 and 4 live.
// ---------------------------------------------------------------------------
export function OutsCounter({ outs = 9, interactive = true, width = W }: { outs?: number; interactive?: boolean; width?: number }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [n, setN] = useState(outs);
  const [street, setStreet] = useState<"flop" | "turn">("flop");
  const cols = 12;
  const gap = 4;
  const dot = (width - (cols - 1) * gap) / cols;
  const total = street === "flop" ? 47 : 46;
  const est = street === "flop" ? n * 4 : n * 2;
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        {Array.from({ length: 48 }, (_, i) => {
          const cell = (
            <View style={{ width: dot, height: dot, borderRadius: 3, backgroundColor: i < n ? colors.positive : colors.surfaceTertiary, opacity: i < total ? 1 : 0 }} />
          );
          return interactive && i < total ? (
            <PressableScale key={i} onPress={() => setN(i + 1)} testID={`outs-dot-${i}`} haptics="none">
              {cell}
            </PressableScale>
          ) : (
            <View key={i}>{cell}</View>
          );
        })}
      </View>
      <View style={s.keyRow}>
        <Text style={s.keyLabel}>{n} OUTS × {street === "flop" ? 4 : 2}</Text>
        <CountUp value={est} format={(v) => `≈ ${v.toFixed(0)}%`} style={s.keyNumber} testID="outs-estimate" />
      </View>
      {interactive ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["flop", "turn"] as const).map((st) => (
            <PressableScale key={st} onPress={() => setStreet(st)} style={[s.toggle, street === st && { backgroundColor: colors.interactive, borderColor: colors.interactive }]} testID={`outs-${st}`}>
              <Text style={[s.toggleText, street === st && { color: colors.onInteractive }]}>{st === "flop" ? "Al flop (×4)" : "Al turn (×2)"}</Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// EV bars (verdict sheet) — static by nature.
// ---------------------------------------------------------------------------
export function EvBarChart({ actions, width = W }: { actions: { label: string; evBb: number; rank: number }[]; width?: number }) {
  const { colors } = useTheme();
  if (!actions || actions.length === 0) return null;
  const vals = actions.map((a) => a.evBb);
  const max = Math.max(...vals, 0.1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const rowH = 26;
  const labelW = 96;
  const barMax = width - labelW - 44;
  const zeroX = labelW + (-min / range) * barMax;
  return (
    <View>
      {actions.map((a, i) => {
        const isBest = a.rank === 0;
        const len = (Math.abs(a.evBb) / range) * barMax;
        const positive = a.evBb >= 0;
        return (
          <View key={i} style={{ height: rowH, flexDirection: "row", alignItems: "center" }}>
            <Text numberOfLines={1} style={{ width: labelW, color: isBest ? colors.highlight : colors.onSurfaceSecondary, fontSize: 12, fontWeight: isBest ? "700" : "500" }}>
              {a.label}
            </Text>
            <View style={{ flex: 1, height: rowH, justifyContent: "center" }}>
              <Svg width={barMax + 4} height={rowH}>
                <Line x1={zeroX - labelW} y1={2} x2={zeroX - labelW} y2={rowH - 2} stroke={colors.border} strokeWidth={1} />
                <Rect x={positive ? zeroX - labelW : zeroX - labelW - len} y={5} width={len} height={rowH - 12} rx={2} fill={isBest ? colors.positive : positive ? colors.highlight : colors.negative} />
              </Svg>
            </View>
            <Text style={{ width: 40, textAlign: "right", color: colors.onSurface, fontSize: 12, ...tabular }}>{a.evBb.toFixed(1)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ScoreTimeline({ timeline, width = W }: { timeline: number[]; width?: number; onPoint?: (i: number) => void }) {
  const { colors } = useTheme();
  const h = 120;
  const pad = 8;
  if (timeline.length === 0) return null;
  const pts = [100, ...timeline];
  const maxX = pts.length - 1 || 1;
  const x = (i: number) => pad + (i / maxX) * (width - pad * 2);
  const y = (v: number) => pad + (1 - v / 100) * (h - pad * 2);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  return (
    <Svg width={width} height={h}>
      <Line x1={pad} y1={y(50)} x2={width - pad} y2={y(50)} stroke={colors.warning} strokeWidth={1} strokeDasharray="4 4" />
      <Path d={d} stroke={colors.highlight} strokeWidth={2} fill="none" />
      {pts.map((v, i) => (
        <Circle key={i} cx={x(i)} cy={y(v)} r={i === 0 ? 2 : 4} fill={i > 0 && timeline[i - 1] < (timeline[i - 2] ?? 100) ? colors.negative : colors.highlight} />
      ))}
    </Svg>
  );
}

export function CombosMatrix({ width = W }: { width?: number }) {
  const s = useStyles();
  const { colors } = useTheme();
  const items = [
    { label: "Coppia", n: 6, color: colors.positive },
    { label: "Suited", n: 4, color: colors.highlight },
    { label: "Offsuit", n: 12, color: colors.warning },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 10, width }}>
      {items.map((it) => (
        <View key={it.label} style={[s.comboCard, { flex: 1 }]}>
          <Text style={{ color: it.color, fontSize: 24, fontWeight: "700", ...tabular }}>{it.n}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{it.label}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2, marginTop: 4 }}>
            {Array.from({ length: it.n }, (_, i) => (
              <View key={i} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: it.color }} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// MDF / alpha: slider on bet size; marker follows on both curves.
// ---------------------------------------------------------------------------
export function MdfAlphaCurve({ size = 0.66, interactive = true, width = W }: { size?: number; interactive?: boolean; width?: number }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [f, setF] = useState(size);
  const h = 160;
  const pad = 28;
  const fMin = 0.25;
  const fMax = 2;
  const mdf = (v: number) => 1 / (1 + v);
  const x = (v: number) => pad + ((v - fMin) / (fMax - fMin)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - v) * (h - pad * 2);
  const steps = Array.from({ length: 36 }, (_, i) => fMin + (i / 35) * (fMax - fMin));
  const dMdf = steps.map((v, i) => `${i === 0 ? "M" : "L"}${x(v)},${y(mdf(v))}`).join(" ");
  const dAlpha = steps.map((v, i) => `${i === 0 ? "M" : "L"}${x(v)},${y(1 - mdf(v))}`).join(" ");
  return (
    <View style={{ gap: spacing.md }}>
      <Svg width={width} height={h}>
        <Line x1={x(f)} y1={pad - 6} x2={x(f)} y2={h - pad + 6} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
        <Path d={dMdf} stroke={colors.positive} strokeWidth={2} fill="none" />
        <Path d={dAlpha} stroke={colors.warning} strokeWidth={2} fill="none" />
        <Circle cx={x(f)} cy={y(mdf(f))} r={5} fill={colors.positive} />
        <Circle cx={x(f)} cy={y(1 - mdf(f))} r={5} fill={colors.warning} />
        <SvgText x={x(fMax)} y={y(mdf(fMax)) - 8} fontSize={11} fontWeight="700" fill={colors.positive} textAnchor="end">MDF: quanto difendi</SvgText>
        <SvgText x={x(fMax)} y={y(1 - mdf(fMax)) + 16} fontSize={11} fontWeight="700" fill={colors.warning} textAnchor="end">Alpha: quanto foldi</SvgText>
        <SvgText x={x(f)} y={h - 4} fontSize={11} fill={colors.muted} textAnchor="middle">size {Math.round(f * 100)}%</SvgText>
      </Svg>
      <View style={s.keyRow}>
        <Text style={[s.keyLabel, { color: colors.positive }]}>MDF</Text>
        <CountUp value={mdf(f) * 100} format={pct0} style={[s.keyNumber, { color: colors.positive }]} testID="mdf-value" />
        <Text style={[s.keyLabel, { color: colors.warning, marginLeft: spacing.lg }]}>ALPHA</Text>
        <CountUp value={(1 - mdf(f)) * 100} format={pct0} style={[s.keyNumber, { color: colors.warning }]} testID="alpha-value" />
      </View>
      {interactive ? <Slider value={Math.round(f * 100)} min={25} max={200} step={5} onChange={(v) => setF(v / 100)} label="PUNTATA (% DEL PIATTO)" format={pct0} testID="mdf-slider" /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Value:bluff by size — tap a row to focus it. Canonical numbers, unchanged.
// ---------------------------------------------------------------------------
const VB_ROWS: [string, string][] = [["1/3 pot", "3:1"], ["1/2 pot", "2:1"], ["3/4 pot", "1,43:1"], ["pot", "1:1"], ["2× pot", "1:2"]];

export function ValueBluffTree({ width = W }: { width?: number }) {
  const { colors } = useTheme();
  const [sel, setSel] = useState(1);
  return (
    <View style={{ gap: 6, width }}>
      {VB_ROWS.map((r, i) => {
        const on = i === sel;
        return (
          <PressableScale key={r[0]} onPress={() => setSel(i)} testID={`vb-row-${i}`} style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: on ? colors.interactive + "22" : colors.surfaceTertiary, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: on ? colors.interactive : colors.surfaceTertiary }}>
            <Text style={{ color: colors.onSurfaceSecondary, fontWeight: "600" }}>{on ? "● " : ""}{r[0]}</Text>
            <Text style={{ color: colors.highlight, fontWeight: "700", fontSize: on ? 18 : 14, ...tabular }}>{r[1]}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// SPR gauge: slider on SPR; zone label adjacent to the marker.
// ---------------------------------------------------------------------------
export function SprGauge({ spr = 4, interactive = true, width = W }: { spr?: number; interactive?: boolean; width?: number }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [v, setV] = useState(spr);
  const h = 56;
  const pos = (Math.min(v, 15) / 15) * width;
  const zone = v < 3 ? { label: "Basso: commit con top pair", color: colors.negative } : v < 7 ? { label: "Medio: attenzione", color: colors.warning } : { label: "Alto: serve una mano forte", color: colors.positive };
  return (
    <View style={{ gap: spacing.md }}>
      <Svg width={width} height={h}>
        <Rect x={0} y={24} width={width * 0.2} height={12} fill={colors.negative} />
        <Rect x={width * 0.2} y={24} width={width * 0.27} height={12} fill={colors.warning} />
        <Rect x={width * 0.47} y={24} width={width * 0.53} height={12} fill={colors.positive} />
        <SvgText x={width * 0.1} y={50} fontSize={10} fill={colors.muted} textAnchor="middle">0–3</SvgText>
        <SvgText x={width * 0.335} y={50} fontSize={10} fill={colors.muted} textAnchor="middle">3–7</SvgText>
        <SvgText x={width * 0.735} y={50} fontSize={10} fill={colors.muted} textAnchor="middle">7+</SvgText>
        <Path d={`M${pos},12 L${pos - 7},24 L${pos + 7},24 Z`} fill={colors.onSurface} />
      </Svg>
      <View style={s.keyRow}>
        <Text style={s.keyLabel}>SPR</Text>
        <CountUp value={v} format={(n) => n.toFixed(1)} style={s.keyNumber} testID="spr-value" />
        <Text style={[s.verdictText, { color: zone.color, marginLeft: spacing.md, flex: 1 }]} numberOfLines={1}>{zone.label}</Text>
      </View>
      {interactive ? <Slider value={Math.round(v * 2) / 2} min={0.5} max={15} step={0.5} onChange={setV} label="STACK / PIATTO" format={(n) => n.toFixed(1)} testID="spr-slider" /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Range painting (13×13) with live combos / % readout.
// ---------------------------------------------------------------------------
export function RangeGridPaint({ width = W }: { width?: number }) {
  const s = useStyles();
  const [weights, setWeights] = useState<Float32Array>(() => emptyRange());
  const toggle = (row: number, col: number) => {
    const combos = cellCombos(row, col);
    const on = combos.some((c) => weights[c] > 0);
    const next = weights.slice();
    for (const c of combos) next[c] = on ? 0 : 1;
    setWeights(next);
  };
  return (
    <View style={{ gap: spacing.md, alignItems: "center" }}>
      <RangeGrid13x13 width={Math.min(width, 340)} weights={weights} editable onToggle={toggle} />
      <View style={s.keyRow}>
        <Text style={s.keyLabel}>{Math.round(totalWeight(weights))} COMBO</Text>
        <CountUp value={rangePercent(weights)} format={pct1} style={s.keyNumber} testID="range-percent" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  keyRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, flexWrap: "wrap" },
  keyLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.9 },
  keyNumber: { color: c.highlight, fontSize: 30, fontWeight: "800", ...tabular },
  verdict: { borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "baseline", gap: spacing.md },
  verdictText: { fontSize: 16, fontWeight: "800" },
  verdictSub: { color: c.muted, fontSize: 12, ...tabular },
  toggle: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceTertiary, alignItems: "center" },
  toggleText: { color: c.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  comboCard: { backgroundColor: c.surfaceTertiary, borderRadius: 10, padding: 12, alignItems: "flex-start" },
}));

// Registry for the lesson renderer.
export const VIZ_REGISTRY: Record<string, React.ComponentType<any>> = {
  PotOddsBar,
  EquityWheel,
  OutsCounter,
  EvBarChart,
  ScoreTimeline,
  CombosMatrix,
  MdfAlphaCurve,
  ValueBluffTree,
  SprGauge,
  RangeGridPaint,
};
