import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";

export function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  topInset = true,
  testID,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  topInset?: boolean;
  testID?: string;
  contentStyle?: ViewStyle;
}) {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: topInset ? insets.top + spacing.md : spacing.md,
    paddingHorizontal: padded ? spacing.xl : 0,
    paddingBottom: spacing.xxxl,
  };
  if (scroll) {
    return (
      <View style={s.root} testID={testID}>
        <ScrollView contentContainerStyle={[pad, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={[s.root, pad, contentStyle]} testID={testID}>
      {children}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: any }) {
  const s = useStyles();
  const text = React.Children.toArray(children)
    .map((c) => (c == null || c === false ? "" : String(c)))
    .join("");
  return <Text style={[s.sectionLabel, style]}>{text.toUpperCase()}</Text>;
}

export function Heading({ children, size = "h1", style }: { children: React.ReactNode; size?: "display" | "h1" | "h2" | "h3"; style?: any }) {
  const s = useStyles();
  return <Text style={[s[size], style]}>{children}</Text>;
}

export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: any }) {
  const s = useStyles();
  return <Text style={[muted ? s.bodyMuted : s.body, style]}>{children}</Text>;
}

export function StatValue({ label, value, delta, accent, testID }: { label: string; value: string; delta?: { up: boolean; text: string }; accent?: boolean; testID?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.kpi} testID={testID}>
      <View style={[s.kpiBar, accent && { backgroundColor: colors.brandPrimary }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.sectionLabel}>{label.toUpperCase()}</Text>
        <Text style={s.kpiValue}>{value}</Text>
        {delta ? (
          <Text style={[s.kpiDelta, { color: delta.up ? colors.positive : colors.negative }]}>
            {delta.up ? "▲" : "▼"} {delta.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, testID, tone = "primary" }: { title: string; onPress: () => void; disabled?: boolean; testID?: string; tone?: "primary" | "success" | "danger" }) {
  const s = useStyles();
  const { colors } = useTheme();
  const bg = tone === "success" ? colors.success : tone === "danger" ? colors.error : colors.brandPrimary;
  const fg = tone === "primary" ? colors.onBrandPrimary : "#FFFFFF";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, testID }: { title: string; onPress: () => void; testID?: string }) {
  const s = useStyles();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.btnSecondary, { opacity: pressed ? 0.8 : 1 }]}>
      <Text style={s.btnSecondaryText}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style, testID, onPress }: { children: React.ReactNode; style?: ViewStyle; testID?: string; onPress?: () => void }) {
  const s = useStyles();
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [s.card, style, { opacity: pressed ? 0.9 : 1 }]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[s.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function Pill({ label, active, onPress, testID, tone }: { label: string; active?: boolean; onPress?: () => void; testID?: string; tone?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[s.pill, { backgroundColor: active ? colors.brandPrimary : colors.surfaceTertiary, borderColor: active ? colors.brandPrimary : colors.border }]}
    >
      <Text style={[s.pillText, { color: active ? colors.onBrandPrimary : colors.onSurfaceTertiary }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "info" }: { label: string; tone?: "success" | "warning" | "error" | "info" | "muted" }) {
  const s = useStyles();
  const { colors } = useTheme();
  const map = { success: colors.success, warning: colors.warning, error: colors.error, info: colors.brandPrimary, muted: colors.muted };
  return (
    <View style={[s.badge, { backgroundColor: map[tone] + "22", borderColor: map[tone] }]}>
      <Text style={[s.badgeText, { color: map[tone] }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, tone }: { value: number; tone?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: tone ?? colors.brandPrimary }]} />
    </View>
  );
}

export function Divider() {
  const s = useStyles();
  return <View style={s.divider} />;
}

export function Spinner({ label }: { label?: string }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.spinner}>
      <ActivityIndicator color={colors.brandPrimary} />
      {label ? <Text style={s.bodyMuted}>{label}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  sectionLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.9, marginBottom: 2 },
  display: { color: c.onSurface, fontSize: 32, lineHeight: 38, fontWeight: "700" },
  h1: { color: c.onSurface, fontSize: 24, lineHeight: 30, fontWeight: "700" },
  h2: { color: c.onSurface, fontSize: 20, lineHeight: 26, fontWeight: "700" },
  h3: { color: c.onSurface, fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { color: c.onSurface, fontSize: 15, lineHeight: 22 },
  bodyMuted: { color: c.muted, fontSize: 15, lineHeight: 22 },
  kpi: { flexDirection: "row", backgroundColor: c.surfaceSecondary, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: c.border, gap: spacing.md },
  kpiBar: { width: 3, borderRadius: 2, backgroundColor: c.highlight },
  kpiValue: { color: c.onSurface, fontSize: 26, fontWeight: "700", ...tabular },
  kpiDelta: { fontSize: 13, fontWeight: "600", marginTop: 2, ...tabular },
  btn: { borderRadius: radius.md, paddingVertical: 15, alignItems: "center", justifyContent: "center", minHeight: 50 },
  btnText: { fontSize: 16, fontWeight: "700" },
  btnSecondary: { borderRadius: radius.md, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceSecondary, minHeight: 48 },
  btnSecondaryText: { color: c.onSurface, fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: c.border },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, flexShrink: 0 },
  pillText: { fontSize: 13, fontWeight: "600" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  divider: { height: 1, backgroundColor: c.divider, marginVertical: spacing.md },
  spinner: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
}));
