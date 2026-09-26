import React from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Heading, ProgressBar, ScreenContainer, SectionLabel } from "@/src/ui/components";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { moduleProgress, useApp } from "@/src/store/appStore";
import { MODULES } from "@/src/content/curriculum";
import { IconChevron, IconLock } from "@/src/ui/icons";
import { PressableScale } from "@/src/ui/motion";

// Study path: one collapsed card per module. Lessons live in /module/[id].
export default function StudyPath() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const lessonProgress = useApp((st) => st.lessonProgress);

  return (
    <ScreenContainer testID="study-screen">
      <SectionLabel>{it.tabs.study}</SectionLabel>
      <Heading size="display">{it.study.title}</Heading>

      <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
        {MODULES.map((m) => {
          const published = m.status === "published";
          const prog = moduleProgress(lessonProgress, m.id);
          const total = published ? prog.total : m.lessonTitles.length;
          const row = (
            <>
              <View style={s.head}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, !published && { color: colors.muted }]}>{m.title}</Text>
                  <Text style={s.sub}>{m.subtitle}</Text>
                </View>
                {published ? (
                  <View style={s.right}>
                    <Text style={s.count}>{prog.passed}/{total}</Text>
                    <IconChevron color={colors.muted} />
                  </View>
                ) : (
                  <View style={s.right}>
                    <Badge label={it.common.comingSoon} tone="muted" />
                    <IconLock color={colors.muted} />
                  </View>
                )}
              </View>
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar value={published && total ? prog.passed / total : 0} />
              </View>
            </>
          );
          if (!published) {
            return (
              <View key={m.id} style={[s.card, { opacity: 0.7 }]} testID={`module-${m.id}`}>
                {row}
              </View>
            );
          }
          return (
            <PressableScale key={m.id} style={s.card} onPress={() => router.push(`/module/${m.id}`)} testID={`module-${m.id}`} accessibilityRole="button">
              {row}
            </PressableScale>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: c.border },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { color: c.onSurface, fontSize: 17, fontWeight: "700" },
  sub: { color: c.muted, fontSize: 13, marginTop: 2 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  count: { color: c.onSurface, fontSize: 15, fontWeight: "700", ...tabular },
}));
