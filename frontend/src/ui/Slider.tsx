// Single-parameter slider for interactive infographics. Pan/tap on the track
// (gesture-handler + reanimated) plus −/+ step buttons (48px targets, also
// usable on web/keyboard). Value changes are reported synchronously.
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { PressableScale } from "./motion";

const THUMB = 28;

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format = (v: number) => String(v),
  testID,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  format?: (v: number) => string;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [trackW, setTrackW] = useState(0);
  const dragging = useSharedValue(0);

  const clamp = useCallback(
    (v: number) => {
      const snapped = Math.round((v - min) / step) * step + min;
      return Math.max(min, Math.min(max, +snapped.toFixed(6)));
    },
    [min, max, step],
  );

  const fromX = useCallback(
    (x: number) => {
      if (trackW <= THUMB) return;
      const ratio = (x - THUMB / 2) / (trackW - THUMB);
      onChange(clamp(min + Math.max(0, Math.min(1, ratio)) * (max - min)));
    },
    [trackW, min, max, clamp, onChange],
  );

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = 1;
      runOnJS(fromX)(e.x);
    })
    .onUpdate((e) => {
      runOnJS(fromX)(e.x);
    })
    .onFinalize(() => {
      dragging.value = 0;
    });

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const left = ratio * Math.max(0, trackW - THUMB);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ scale: dragging.value ? 1.15 : 1 }] }));

  return (
    <View style={s.root} testID={testID}>
      {label ? (
        <View style={s.labelRow}>
          <Text style={s.label}>{label}</Text>
          <Text style={s.value}>{format(value)}</Text>
        </View>
      ) : null}
      <View style={s.row}>
        <PressableScale onPress={() => onChange(clamp(value - step))} style={s.stepBtn} testID={testID ? `${testID}-dec` : undefined} accessibilityRole="adjustable" accessibilityLabel="−">
          <Text style={s.stepText}>−</Text>
        </PressableScale>
        <GestureDetector gesture={pan}>
          <View style={s.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
            <View style={s.rail} />
            <View style={[s.fill, { width: left + THUMB / 2 }]} />
            <Animated.View style={[s.thumb, { left, borderColor: colors.interactive }, thumbStyle]} />
          </View>
        </GestureDetector>
        <PressableScale onPress={() => onChange(clamp(value + step))} style={s.stepBtn} testID={testID ? `${testID}-inc` : undefined} accessibilityRole="adjustable" accessibilityLabel="+">
          <Text style={s.stepText}>+</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { gap: spacing.xs },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  label: { color: c.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.6 },
  value: { color: c.onSurface, fontSize: 14, fontWeight: "700", ...tabular },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border },
  stepText: { color: c.onSurface, fontSize: 20, fontWeight: "700", lineHeight: 24 },
  track: { flex: 1, height: 44, justifyContent: "center" },
  rail: { height: 6, borderRadius: 3, backgroundColor: c.surfaceTertiary },
  fill: { position: "absolute", left: 0, height: 6, borderRadius: 3, backgroundColor: c.interactive },
  thumb: { position: "absolute", width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: c.surfaceSecondary, borderWidth: 3 },
}));
