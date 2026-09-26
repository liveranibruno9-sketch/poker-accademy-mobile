// Reusable "juice" primitives built on react-native-reanimated.
// All effects are purely visual and never delay the next input: onPress
// fires synchronously, animations run on their own timeline.
// Every primitive respects the "reduce motion" preference (profile + OS).

import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useApp } from "@/src/store/appStore";
import { haptic } from "./haptics";

// ---------------------------------------------------------------------------
// Reduce motion
// ---------------------------------------------------------------------------

let systemReduceMotion = false;
const listeners = new Set<(v: boolean) => void>();
try {
  AccessibilityInfo.isReduceMotionEnabled?.()
    .then((v) => {
      systemReduceMotion = !!v;
      listeners.forEach((l) => l(systemReduceMotion));
    })
    .catch(() => {});
  AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => {
    systemReduceMotion = !!v;
    listeners.forEach((l) => l(systemReduceMotion));
  });
} catch {}

/** true when animations should play. */
export function useMotionEnabled(): boolean {
  const pref = useApp((s) => s.profile.reduceMotion);
  const [sys, setSys] = useState(systemReduceMotion);
  useEffect(() => {
    listeners.add(setSys);
    return () => {
      listeners.delete(setSys);
    };
  }, []);
  if (pref === "on") return false;
  if (pref === "off") return true;
  return !sys;
}

// ---------------------------------------------------------------------------
// PressableScale: 0.96 in 80ms, spring back with overshoot
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticKind = "light" | "medium" | "none";

export function PressableScale({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  haptics = "light",
  disabled,
  ...rest
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle>; haptics?: HapticKind; children?: React.ReactNode }) {
  const scale = useSharedValue(1);
  const motion = useMotionEnabled();
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (motion) scale.value = withTiming(0.96, { duration: 80, easing: Easing.out(Easing.quad) });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (motion) scale.value = withSpring(1, { damping: 9, stiffness: 420, mass: 0.5 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics === "light") haptic.light();
        else if (haptics === "medium") haptic.medium();
        onPress?.(e);
      }}
      style={[style, aStyle, disabled ? { opacity: 0.4 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------
// CountUp: numbers never jump; 250–400ms eased tween
// ---------------------------------------------------------------------------

export function CountUp({
  value,
  from,
  format = (v: number) => v.toFixed(0),
  style,
  testID,
}: {
  value: number;
  /** optional start value for the first render (e.g. 0 or 100) */
  from?: number;
  format?: (v: number) => string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const motion = useMotionEnabled();
  const start = motion && from != null ? from : value;
  const sv = useSharedValue(start);
  const [display, setDisplay] = useState(start);
  const prev = useRef(start);

  useEffect(() => {
    if (!motion) {
      sv.value = value;
      prev.current = value;
      setDisplay(value);
      return;
    }
    const dist = Math.abs(value - prev.current);
    prev.current = value;
    if (dist === 0) return;
    const duration = Math.min(400, 250 + Math.min(dist, 50) * 3);
    sv.value = withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, motion]);

  useAnimatedReaction(
    () => sv.value,
    (v, p) => {
      if (v !== p) runOnJS(setDisplay)(v);
    },
    [],
  );

  return (
    <Text style={style} testID={testID}>
      {format(display)}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// FlashView: short colour flash (150–300ms) on outcome events
// ---------------------------------------------------------------------------

export function FlashView({
  trigger,
  color,
  children,
  style,
  radius = 12,
  duration = 240,
  flashOnMount = false,
}: {
  /** any value: a change triggers a flash */
  trigger: unknown;
  color: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  duration?: number;
  flashOnMount?: boolean;
}) {
  const op = useSharedValue(0);
  const motion = useMotionEnabled();
  const first = useRef(true);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (!motion) return;
    if (isFirst && !flashOnMount) return;
    const d = Math.max(150, Math.min(300, duration));
    op.value = withSequence(withTiming(0.35, { duration: d * 0.3 }), withTiming(0, { duration: d * 0.7, easing: Easing.out(Easing.quad) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, motion]);

  const aStyle = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <View style={style}>
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: radius }, aStyle]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// usePressDepth: shared value 0..1 driven by press state (for the button lip)
// ---------------------------------------------------------------------------

export function usePressDepth() {
  const depth = useSharedValue(0);
  const motion = useMotionEnabled();
  const press = () => {
    depth.value = motion ? withTiming(1, { duration: 80, easing: Easing.out(Easing.quad) }) : 1;
  };
  const release = () => {
    depth.value = motion ? withSpring(0, { damping: 9, stiffness: 420, mass: 0.5 }) : 0;
  };
  return { depth, press, release };
}
