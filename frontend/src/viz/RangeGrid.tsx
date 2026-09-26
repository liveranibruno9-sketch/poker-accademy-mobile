import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { makeStyles, useTheme } from "@/src/theme";
import { cellCombos, cellWeight, gridToRank } from "@/src/engine/ranges";
import { RANK_CHARS } from "@/src/engine/types";

function cellLabel(row: number, col: number): string {
  const hi = gridToRank(Math.min(row, col));
  const lo = gridToRank(Math.max(row, col));
  const hc = RANK_CHARS[hi - 2];
  const lc = RANK_CHARS[lo - 2];
  if (row === col) return hc + hc;
  return hc + lc + (row < col ? "s" : "o");
}

export function RangeGrid13x13({
  width,
  weights,
  editable,
  onToggle,
  overlay,
}: {
  width: number;
  weights?: Float32Array;
  editable?: boolean;
  onToggle?: (row: number, col: number) => void;
  overlay?: { trueW: Float32Array; readW: Float32Array };
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const gap = 2;
  const cell = (width - gap * 12) / 13;

  const rows = useMemo(() => Array.from({ length: 13 }, (_, r) => r), []);

  function colorFor(row: number, col: number): { bg: string; label: string } {
    if (overlay) {
      const t = cellWeight(overlay.trueW, row, col);
      const r = cellWeight(overlay.readW, row, col);
      if (t > 0.1 && r > 0.1) return { bg: colors.success, label: colors.onSuccess };
      if (t > 0.1 && r <= 0.1) return { bg: colors.error, label: colors.onError };
      if (t <= 0.1 && r > 0.1) return { bg: colors.warning, label: colors.onWarning };
      return { bg: colors.surfaceTertiary, label: colors.muted };
    }
    const w = weights ? cellWeight(weights, row, col) : 0;
    if (w > 0.05) {
      const alpha = Math.round(60 + w * 195).toString(16).padStart(2, "0");
      return { bg: colors.highlight + alpha, label: colors.onSurface };
    }
    return { bg: colors.surfaceTertiary, label: colors.muted };
  }

  return (
    <View style={{ gap }}>
      {rows.map((row) => (
        <View key={row} style={{ flexDirection: "row", gap }}>
          {rows.map((col) => {
            const { bg, label } = colorFor(row, col);
            const isPair = row === col;
            const content = (
              <View
                style={[
                  s.cell,
                  { width: cell, height: cell, backgroundColor: bg, borderColor: isPair ? colors.highlight : "transparent" },
                ]}
              >
                <Text style={[s.cellText, { color: label, fontSize: Math.max(6, cell * 0.32) }]} numberOfLines={1}>
                  {cellLabel(row, col)}
                </Text>
              </View>
            );
            if (editable) {
              return (
                <Pressable key={col} onPress={() => onToggle?.(row, col)} testID={`range-cell-${cellLabel(row, col)}`}>
                  {content}
                </Pressable>
              );
            }
            return <View key={col}>{content}</View>;
          })}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  cell: { borderRadius: 3, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  cellText: { fontWeight: "700" },
}));
