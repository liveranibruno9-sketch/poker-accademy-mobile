import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heading, ProgressBar, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, tabular, useTheme } from "@/src/theme";
import { moduleProgress, useApp } from "@/src/store/appStore";
import { lessonsForModule, MODULES } from "@/src/content/curriculum";
import { HeaderBar } from "@/src/ui/header";
import { IconChevron, IconLock } from "@/src/ui/icons";
import { PressableScale } from "@/src/ui/motion";

// Module detail: the only place where a module's lessons are listed.
export default function ModuleScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonProgress = useApp((st) => st.lessonProgress);
  const mod = MODULES.find((m) => m.id === String(id));
  if (!mod) return null;

  const lessons = lessonsForModule(mod.id);
  const prog = moduleProgress(lessonProgress, mod.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }} testID="module-screen">
      <HeaderBar title={mod.id} onBack={() => router.back()} right={<Text style={s.count}>{prog.passed}/{prog.total}</Text>} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <SectionLabel>{mod.subtitle}</SectionLabel>
        <Heading size="h1">{mod.title}</Heading>
        <View style={{ marginVertical: spacing.lg }}>
          <ProgressBar value={prog.total ? prog.passed / prog.total : 0} />
        </View>

        {lessons.map((l) => {
          const lp = lessonProgress[l.id];
          const locked = !lp || lp.status === "locked";
          return (
            <PressableScale key={l.id} testID={`lesson-row-${l.id}`} disabled={locked} onPress={() => router.push(`/lesson/${l.id}`)} style={s.row} accessibilityRole="button">
              <LessonMark status={locked ? "locked" : (lp.status as "available" | "read" | "passed")} />
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { color: locked ? colors.muted : colors.onSurface }]}>{l.id} · {l.title}</Text>
                <Text style={s.meta}>{l.estMinutes} min</Text>
              </View>
              {locked ? <IconLock color={colors.muted} /> : <IconChevron color={colors.muted} />}
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
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
    <View style={[s.mark, { backgroundColor: map.bg }]}>
      {map.glyph ? <Text style={[s.markGlyph, { color: map.fg }]}>{map.glyph}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  count: { color: c.onSurface, fontSize: 15, fontWeight: "700", ...tabular },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider, minHeight: 56 },
  title: { fontSize: 15, fontWeight: "600" },
  meta: { color: c.muted, fontSize: 12, marginTop: 2, ...tabular },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  markGlyph: { fontSize: 10, fontWeight: "800" },
}));
