import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { makeStyles, tabular, useTheme } from "@/src/theme";
import { requiredEquity } from "@/src/engine/math";

const W = 320;

export function PotOddsBar({ pot = 100, bet = 50, width = W }: { pot?: number; bet?: number; width?: number }) {
  const { colors } = useTheme();
  const req = requiredEquity(pot, bet) * 100;
  const total = pot + bet + bet;
  const h = 34;
  const potW = (pot / total) * width;
  const betW = (bet / total) * width;
  const callW = (bet / total) * width;
  return (
    <View style={{ gap: 8 }}>
      <Svg width={width} height={h}>
        <Rect x={0} y={0} width={potW} height={h} rx={4} fill={colors.brandTertiary} />
        <Rect x={potW} y={0} width={betW} height={h} fill={colors.warning} />
        <Rect x={potW + betW} y={0} width={callW} height={h} rx={4} fill={colors.brandPrimary} />
      </Svg>
      <LegendRow items={[["Piatto", colors.brandTertiary], ["Puntata", colors.warning], ["Il tuo call", colors.brandPrimary]]} />
      <Text style={{ color: colors.highlight, fontWeight: "700", ...tabular }}>Equity richiesta: {req.toFixed(1)}%</Text>
    </View>
  );
}

export function EquityWheel({ equity = 0.5, width = 160, labelHero = "Tu", labelVillain = "Avv." }: { equity?: number; width?: number; labelHero?: string; labelVillain?: string }) {
  const { colors } = useTheme();
  const r = width / 2 - 10;
  const cx = width / 2;
  const cy = width / 2;
  const circ = 2 * Math.PI * r;
  const heroLen = circ * equity;
  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={width} height={width}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.negative} strokeWidth={16} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={colors.positive}
          strokeWidth={16}
          fill="none"
          strokeDasharray={`${heroLen} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <SvgText x={cx} y={cy - 2} fontSize={26} fontWeight="700" fill={colors.onSurface} textAnchor="middle">
          {Math.round(equity * 100)}%
        </SvgText>
        <SvgText x={cx} y={cy + 18} fontSize={11} fill={colors.muted} textAnchor="middle">
          {labelHero}
        </SvgText>
      </Svg>
      <LegendRow items={[[labelHero, colors.positive], [labelVillain, colors.negative]]} />
    </View>
  );
}

export function OutsCounter({ outs = 9, width = W }: { outs?: number; width?: number }) {
  const { colors } = useTheme();
  const cols = 13;
  const dot = (width - (cols - 1) * 4) / cols;
  const total = 47;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ width: dot, height: dot, borderRadius: 3, backgroundColor: i < outs ? colors.positive : colors.surfaceTertiary }} />
        ))}
      </View>
      <Text style={{ color: colors.highlight, fontWeight: "700", ...tabular }}>{outs} outs su {total} carte residue</Text>
    </View>
  );
}

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
                <Rect
                  x={positive ? zeroX - labelW : zeroX - labelW - len}
                  y={5}
                  width={len}
                  height={rowH - 12}
                  rx={2}
                  fill={isBest ? colors.positive : positive ? colors.brandPrimary : colors.negative}
                />
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
      <Path d={d} stroke={colors.brandPrimary} strokeWidth={2} fill="none" />
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
    { label: "Suited", n: 4, color: colors.brandPrimary },
    { label: "Offsuit", n: 12, color: colors.warning },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
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

export function MdfAlphaCurve({ width = W }: { width?: number }) {
  const { colors } = useTheme();
  const h = 150;
  const pad = 24;
  const sizes = [1 / 3, 0.5, 2 / 3, 0.75, 1];
  const mdf = (f: number) => 1 / (1 + f);
  const x = (i: number) => pad + (i / (sizes.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - v) * (h - pad * 2);
  const dMdf = sizes.map((f, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(mdf(f))}`).join(" ");
  const dAlpha = sizes.map((f, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(1 - mdf(f))}`).join(" ");
  return (
    <View style={{ gap: 6 }}>
      <Svg width={width} height={h}>
        <Path d={dMdf} stroke={colors.positive} strokeWidth={2} fill="none" />
        <Path d={dAlpha} stroke={colors.warning} strokeWidth={2} fill="none" />
        {sizes.map((f, i) => (
          <Circle key={i} cx={x(i)} cy={y(mdf(f))} r={3} fill={colors.positive} />
        ))}
      </Svg>
      <LegendRow items={[["MDF", colors.positive], ["Alpha", colors.warning]]} />
    </View>
  );
}

export function ValueBluffTree({ width = W }: { width?: number }) {
  const { colors } = useTheme();
  const rows = [["1/3 pot", "3:1"], ["1/2 pot", "2:1"], ["3/4 pot", "1,43:1"], ["pot", "1:1"], ["2× pot", "1:2"]];
  return (
    <View style={{ gap: 6 }}>
      {rows.map((r) => (
        <View key={r[0]} style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surfaceTertiary, padding: 8, borderRadius: 8 }}>
          <Text style={{ color: colors.onSurfaceSecondary, fontWeight: "600" }}>{r[0]}</Text>
          <Text style={{ color: colors.highlight, fontWeight: "700", ...tabular }}>{r[1]}</Text>
        </View>
      ))}
    </View>
  );
}

export function SprGauge({ spr = 4, width = W }: { spr?: number; width?: number }) {
  const { colors } = useTheme();
  const h = 40;
  const clamped = Math.min(spr, 15);
  const pos = (clamped / 15) * width;
  return (
    <View style={{ gap: 6 }}>
      <Svg width={width} height={h}>
        <Rect x={0} y={12} width={width * 0.2} height={12} fill={colors.negative} />
        <Rect x={width * 0.2} y={12} width={width * 0.27} height={12} fill={colors.warning} />
        <Rect x={width * 0.47} y={12} width={width * 0.53} height={12} fill={colors.positive} />
        <Path d={`M${pos},2 L${pos - 6},14 L${pos + 6},14 Z`} fill={colors.onSurface} />
      </Svg>
      <Text style={{ color: colors.highlight, fontWeight: "700", ...tabular }}>SPR {spr.toFixed(1)}</Text>
    </View>
  );
}

function LegendRow({ items }: { items: [string, string][] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
      {items.map(([label, color]) => (
        <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
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
};
