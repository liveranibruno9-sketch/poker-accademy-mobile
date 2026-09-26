import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Body, Card, Heading, PrimaryButton, ProgressBar, ScreenContainer, SectionLabel, StatValue } from "@/src/ui/components";
import { makeStyles, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { averageScore, conceptsDue, moduleProgress, useApp } from "@/src/store/appStore";
import { getLesson, lessonsForModule, MODULES } from "@/src/content/curriculum";
import { IconChevron, IconLock } from "@/src/ui/icons";
import { PressableScale } from "@/src/ui/motion";

export default function StudyHome() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const lessonProgress = useApp((st) => st.lessonProgress);
  const conceptMastery = useApp((st) => st.conceptMastery);
  const sessions = useApp((st) => st.sessions);

  const avg = averageScore(sessions);
  const due = conceptsDue(conceptMastery);

  return (
    <ScreenContainer testID="study-screen">
      <SectionLabel>{it.appName}</SectionLabel>
      <Heading size="display">{it.study.title}</Heading>

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <StatValue label={it.home.avgScore} value={avg != null ? avg.toFixed(1) : "—"} accent testID="kpi-avg-score" />
        </View>
        <View style={{ flex: 1 }}>
          <StatValue label={it.home.reviewsDue} value={String(due.length)} />
        </View>
      </View>

      <Card style={{ marginTop: spacing.md }} testID="cta-rated-card">
        <SectionLabel>SIMULATORE</SectionLabel>
        <Body muted style={{ marginBottom: spacing.md }}>Applica la teoria al tavolo. Parti da 100 punti e scopri dove sbagli.</Body>
        <PrimaryButton title={it.home.startRated} onPress={() => router.push("/(tabs)/sim")} testID="home-start-rated" />
      </Card>

      <SectionLabel style={{ marginTop: spacing.xl }}>{it.home.keepStudying}</SectionLabel>

      {MODULES.map((m) => {
        const prog = moduleProgress(lessonProgress, m.id);
        const published = m.status === "published";
        const lessons = published ? lessonsForModule(m.id) : [];
        return (
          <Card key={m.id} style={{ marginTop: spacing.md }} testID={`module-${m.id}`}>
            <View style={s.moduleHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.moduleTitle}>{m.title}</Text>
                <Text style={s.moduleSub}>{m.subtitle}</Text>
              </View>
              {published ? (
                <Text style={s.moduleCount}>{prog.passed}/{prog.total}</Text>
              ) : (
                <Badge label={it.common.comingSoon} tone="muted" />
              )}
            </View>
            {published ? (
              <>
                <View style={{ marginVertical: spacing.md }}>
                  <ProgressBar value={prog.total ? prog.passed / prog.total : 0} />
                </View>
                {lessons.map((l) => {
                  const lp = lessonProgress[l.id];
                  const locked = !lp || lp.status === "locked";
                  return (
                    <PressableScale
                      key={l.id}
                      testID={`lesson-row-${l.id}`}
                      disabled={locked}
                      onPress={() => router.push(`/lesson/${l.id}`)}
                      style={s.lessonRow}
                    >
                      <LessonMark status={locked ? "locked" : (lp?.status as "available" | "read" | "passed")} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.lessonTitle, { color: locked ? colors.muted : colors.onSurface }]}>{l.id} · {l.title}</Text>
                      </View>
                      {locked ? <IconLock color={colors.muted} /> : <IconChevron color={colors.muted} />}
                    </PressableScale>
                  );
                })}
              </>
            ) : (
              <View style={{ marginTop: spacing.sm }}>
                {m.lessonTitles.map((t, i) => (
                  <View key={i} style={s.lessonRow}>
                    <LessonMark status="locked" />
                    <Text style={[s.lessonTitle, { color: colors.muted, flex: 1 }]}>{t}</Text>
                    <IconLock color={colors.muted} />
                  </View>
                ))}
              </View>
            )}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

// Lesson state = colour + glyph (deuteranopia-safe): ✓ passed, ! read, ▶ available, empty locked.
function LessonMark({ status }: { status: "locked" | "available" | "read" | "passed" }) {
  const s = useStyles();
  const { colors } = useTheme();
  const map = {
    passed: { bg: colors.positive, fg: colors.onSuccess, glyph: "✓" },
    read: { bg: colors.warning, fg: colors.onWarning, glyph: "!" },
    available: { bg: colors.interactive, fg: colors.onInteractive, glyph: "▶" },
    locked: { bg: colors.surfaceTertiary, fg: colors.muted, glyph: "" },
  }[status];
  return (
    <View style={[s.lessonDot, { backgroundColor: map.bg }]}>
      {map.glyph ? <Text style={[s.lessonGlyph, { color: map.fg }]}>{map.glyph}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  moduleHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  moduleTitle: { color: c.onSurface, fontSize: 17, fontWeight: "700" },
  moduleSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  moduleCount: { color: c.onSurface, fontSize: 15, fontWeight: "700", ...tabular },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 9 },
  lessonDot: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  lessonGlyph: { fontSize: 9, fontWeight: "800" },
  lessonTitle: { fontSize: 14, fontWeight: "500" },
}));
