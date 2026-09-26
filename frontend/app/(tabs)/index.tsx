import React from "react";
import { Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Body, Card, Heading, PrimaryButton, ProgressBar, ScreenContainer, SectionLabel, StatValue } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { averageScore, conceptsDue, moduleProgress, useApp } from "@/src/store/appStore";
import { getLesson, lessonsForModule, MODULES } from "@/src/content/curriculum";
import { IconChevron, IconLock } from "@/src/ui/icons";

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
                    <Pressable
                      key={l.id}
                      testID={`lesson-row-${l.id}`}
                      disabled={locked}
                      onPress={() => router.push(`/lesson/${l.id}`)}
                      style={({ pressed }) => [s.lessonRow, { opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View style={[s.lessonDot, { backgroundColor: lp?.status === "passed" ? colors.positive : lp?.status === "read" ? colors.warning : locked ? colors.surfaceTertiary : colors.brandPrimary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.lessonTitle, { color: locked ? colors.muted : colors.onSurface }]}>{l.id} · {l.title}</Text>
                      </View>
                      {locked ? <IconLock color={colors.muted} /> : <IconChevron color={colors.muted} />}
                    </Pressable>
                  );
                })}
              </>
            ) : (
              <View style={{ marginTop: spacing.sm }}>
                {m.lessonTitles.map((t, i) => (
                  <View key={i} style={s.lessonRow}>
                    <View style={[s.lessonDot, { backgroundColor: colors.surfaceTertiary }]} />
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

const useStyles = makeStyles((c) => ({
  moduleHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  moduleTitle: { color: c.onSurface, fontSize: 17, fontWeight: "700" },
  moduleSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  moduleCount: { color: c.highlight, fontSize: 15, fontWeight: "700" },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 9 },
  lessonDot: { width: 8, height: 8, borderRadius: 4 },
  lessonTitle: { fontSize: 14, fontWeight: "500" },
}));
