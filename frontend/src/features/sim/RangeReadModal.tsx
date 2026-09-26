import React, { useMemo, useState } from "react";
import { Modal, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, spacing, tabular } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { RangeGrid13x13 } from "@/src/viz/RangeGrid";
import { cellCombos, emptyRange, rangePercent, totalWeight } from "@/src/engine/ranges";
import { Heading, Pill, PrimaryButton, SecondaryButton, SectionLabel } from "@/src/ui/components";

export function RangeReadModal({ visible, onSubmit, onSkip }: { visible: boolean; onSubmit: (w: Float32Array) => void; onSkip: () => void }) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [weights, setWeights] = useState<Float32Array>(() => emptyRange());
  const [, force] = useState(0);

  const gridWidth = Math.min(width - spacing.xl * 2, 360);

  const toggle = (row: number, col: number) => {
    const combos = cellCombos(row, col);
    const on = combos.some((c) => weights[c] > 0);
    const next = weights.slice();
    for (const c of combos) next[c] = on ? 0 : 1;
    setWeights(next);
    force((x) => x + 1);
  };

  const clear = () => {
    setWeights(emptyRange());
    force((x) => x + 1);
  };

  const combos = Math.round(totalWeight(weights));
  const pct = rangePercent(weights);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onSkip}>
      <View style={[s.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.md }]} testID="range-read-modal">
        <SectionLabel>{it.tabs.sim}</SectionLabel>
        <Heading size="h1">{it.sim.rangeReadTitle}</Heading>
        <Text style={s.body}>{it.sim.rangeReadBody}</Text>

        <View style={{ alignItems: "center", marginTop: spacing.lg }}>
          <RangeGrid13x13 width={gridWidth} weights={weights} editable onToggle={toggle} />
        </View>

        <Text style={s.counter}>
          {combos} {it.sim.combos} · {pct.toFixed(0)}%
        </Text>

        <View style={s.tools}>
          <Pill label={it.sim.clear} onPress={clear} testID="range-clear" />
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton title={it.sim.submitRead} onPress={() => onSubmit(weights)} testID="range-submit" disabled={combos === 0} />
          <SecondaryButton title={it.common.cancel} onPress={onSkip} testID="range-skip" />
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, paddingHorizontal: spacing.xl },
  body: { color: c.muted, fontSize: 14, marginTop: spacing.sm, lineHeight: 20 },
  counter: { color: c.highlight, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: spacing.md, ...tabular },
  tools: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginTop: spacing.sm },
}));
