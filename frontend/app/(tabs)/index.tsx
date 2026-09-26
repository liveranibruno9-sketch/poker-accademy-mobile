import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, ProgressBar } from "@/src/ui/components";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { averageScore, conceptsDue, currentLesson, streakDays, useApp } from "@/src/store/appStore";
import { MODULES } from "@/src/content/curriculum";
import { IconFlame, IconStats, IconStudy } from "@/src/ui/icons";
import { CountUp, PressableScale } from "@/src/ui/motion";

// Home: status row · one progress card · one dominant CTA · two quiet pills. Nothing else.
export default function HomeScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lessonProgress = useApp((st) => st.lessonProgress);
  const conceptMastery = useApp((st) => st.conceptMastery);
  const sessions = useApp((st) => st.sessions);
  const activityDays = useApp((st) => st.activityDays);

  const streak = streakDays(activityDays);
  const avg = averageScore(sessions);
  const due = conceptsDue(conceptMastery);
  const cur = currentLesson(lessonProgress);
  const firstModule = MODULES[0];
  const progressValue = cur ? cur.index / cur.total : 0;

  const onContinue = () => {
    if (cur) router.push(`/lesson/${cur.lesson.id}`);
    else router.push(`/module/${firstModule.id}`);
  };

  const onReview = () => {
    if (due.length) router.push("/quiz/review");
    else router.push("/(tabs)/study");
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]} testID="home-screen">
      {/* 1. Status row */}
      <View style={s.statusRow}>
        <View style={s.streak} testID="home-streak">
          <IconFlame color={colors.streak} size={22} />
          <Text style={s.streakText}>{it.home.days(streak)}</Text>
        </View>
        <View style={s.avg} testID="home-avg">
          <Text style={s.avgLabel}>{it.home.avg.toUpperCase()}</Text>
          {avg != null ? <CountUp value={avg} from={0} format={(v) => v.toFixed(1)} style={s.avgValue} /> : <Text style={s.avgValue}>—</Text>}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      {/* 2. Progress card */}
      <PressableScale onPress={onContinue} style={s.progressCard} testID="home-progress-card" accessibilityRole="button">
        <Text style={s.cardTitle} numberOfLines={1}>{cur ? cur.module.title : firstModule.title}</Text>
        <View style={{ marginVertical: spacing.md }}>
          <ProgressBar value={progressValue} />
        </View>
        <Text style={s.cardStatus} numberOfLines={1}>
          {cur ? it.home.moduleLessonOf(cur.module.order, cur.index + 1, cur.total) : it.home.startHere}
        </Text>
      </PressableScale>

      {/* 3. Dominant CTA (thumb zone) */}
      <View style={{ marginTop: spacing.lg }}>
        <PrimaryButton title={it.home.play} tone="reward" size="hero" onPress={() => router.push("/(tabs)/sim")} testID="home-play" />
      </View>

      {/* 4. Two quiet pills */}
      <View style={s.pillRow}>
        <PressableScale onPress={onReview} style={s.pill} testID="home-review" accessibilityRole="button">
          <IconStudy color={colors.onSurfaceTertiary} size={18} />
          <Text style={s.pillText}>{it.home.review}</Text>
          {due.length > 0 ? (
            <View style={s.badge} testID="home-review-badge">
              <Text style={s.badgeText}>{due.length}</Text>
            </View>
          ) : null}
        </PressableScale>
        <PressableScale onPress={() => router.push("/(tabs)/stats")} style={s.pill} testID="home-stats" accessibilityRole="button">
          <IconStats color={colors.onSurfaceTertiary} size={18} />
          <Text style={s.pillText}>{it.tabs.stats}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, paddingHorizontal: spacing.xl },
  statusRow: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  streak: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  streakText: { color: c.onSurface, fontSize: 16, fontWeight: "700", ...tabular },
  avg: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  avgLabel: { color: c.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.9 },
  avgValue: { color: c.reward, fontSize: 22, fontWeight: "800", ...tabular },
  progressCard: { minHeight: 140, justifyContent: "center", backgroundColor: c.surfaceSecondary, borderRadius: radius.card, padding: spacing.xl, borderWidth: 1, borderColor: c.border },
  cardTitle: { color: c.onSurface, fontSize: 22, fontWeight: "700" },
  cardStatus: { color: c.muted, fontSize: 14, fontWeight: "600", ...tabular },
  pillRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  pill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg },
  pillText: { color: c.onSurfaceTertiary, fontSize: 14, fontWeight: "600" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.interactive, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: c.onInteractive, fontSize: 12, fontWeight: "800", ...tabular },
}));
