import React, { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeIn } from "react-native-reanimated";
import { Heading, PrimaryButton, SecondaryButton, SectionLabel } from "@/src/ui/components";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { Block, getLesson } from "@/src/content/curriculum";
import { VIZ_REGISTRY } from "@/src/viz/charts";
import { useApp } from "@/src/store/appStore";
import { PressableScale, useMotionEnabled } from "@/src/ui/motion";
import { RichText } from "@/src/ui/RichText";
import { ExerciseBlock, PretestBlock } from "@/src/features/lesson/blocks";
import { haptic } from "@/src/ui/haptics";

// A lesson is a sequence of sub-screens (one concept each), never a single scroll.
export default function LessonScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const markRead = useApp((st) => st.markLessonRead);
  const recordConcept = useApp((st) => st.recordConceptResult);
  const saved = useApp((st) => st.savedTakeaways);
  const toggleTakeaway = useApp((st) => st.toggleTakeaway);
  const motion = useMotionEnabled();
  const lesson = getLesson(String(id));
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lesson) markRead(lesson.id);
  }, [lesson, markRead]);

  if (!lesson) return null;
  const total = lesson.slides.length;
  const slide = lesson.slides[index];
  const isLast = index === total - 1;
  const vizWidth = width - spacing.xl * 2;
  const isSaved = saved.includes(lesson.id);

  const go = (dir: 1 | -1) => {
    haptic.light();
    setIndex((i) => Math.max(0, Math.min(total - 1, i + dir)));
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]} testID="lesson-screen">
      {/* Top bar: exit · position · progress */}
      <View style={s.topBar}>
        <PressableScale onPress={() => router.back()} style={s.exitBtn} testID="lesson-exit" accessibilityRole="button" accessibilityLabel={it.study.exit}>
          <Text style={s.exitText}>✕</Text>
        </PressableScale>
        <View style={s.segments}>
          {lesson.slides.map((_, i) => (
            <View key={i} style={[s.segment, { backgroundColor: i <= index ? colors.progress : colors.surfaceTertiary }]} />
          ))}
        </View>
        <Text style={s.position} testID="lesson-position">{index + 1}/{total}</Text>
      </View>

      <KeyboardAwareScrollView key={index} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bottomOffset={24}>
        <Animated.View entering={motion ? FadeIn.duration(180) : undefined} style={{ gap: spacing.lg }}>
          <View>
            <SectionLabel>{slide.kicker}</SectionLabel>
            <Heading size="h1" style={{ marginTop: 2 }}>{slide.heading}</Heading>
          </View>
          {slide.blocks.map((b, bi) => (
            <BlockView key={`${index}-${bi}`} block={b} vizWidth={vizWidth} onConcept={recordConcept} />
          ))}
          {slide.role === "takeaway" ? (
            <SecondaryButton title={isSaved ? `✓ ${it.study.savedTakeaway}` : it.study.saveTakeaway} onPress={() => toggleTakeaway(lesson.id)} testID="save-takeaway" />
          ) : null}
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Footer navigation */}
      <View style={[s.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ width: 96 }}>
          {index > 0 ? <SecondaryButton title={it.common.back} onPress={() => go(-1)} testID="lesson-prev" /> : null}
        </View>
        <View style={{ flex: 1 }}>
          {isLast ? (
            <PrimaryButton title={it.study.goToQuiz} onPress={() => router.replace(`/quiz/${lesson.id}`)} testID="go-to-quiz" />
          ) : (
            <PrimaryButton title={it.common.next} onPress={() => go(1)} testID="lesson-next" />
          )}
        </View>
      </View>
    </View>
  );
}

function BlockView({ block, vizWidth, onConcept }: { block: Block; vizWidth: number; onConcept: (concept: string, ok: boolean) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  switch (block.kind) {
    case "text":
      return <RichText text={block.text} style={s.text} />;
    case "formula":
      return (
        <View style={s.formula} testID="block-formula">
          {block.lines.map((l, i) => (
            <Text key={i} style={s.formulaText}>{l}</Text>
          ))}
        </View>
      );
    case "example":
      return (
        <View style={s.example}>
          <Text style={s.exampleGiven}>{block.given}</Text>
          {block.steps.map((st, i) => (
            <Text key={i} style={s.exampleStep}>· {st}</Text>
          ))}
          <Text style={s.exampleResult}>→ {block.result}</Text>
        </View>
      );
    case "table":
      return (
        <View style={s.table}>
          <View style={[s.tableRow, { backgroundColor: colors.surfaceTertiary }]}>
            {block.headers.map((h, i) => (
              <Text key={i} style={[s.tableCell, s.tableHead]}>{h}</Text>
            ))}
          </View>
          {block.rows.map((row, ri) => (
            <View key={ri} style={s.tableRow}>
              {row.map((cell, ci) => (
                <Text key={ci} style={[s.tableCell, ci > 0 && { textAlign: "right", ...tabular }]}>{cell}</Text>
              ))}
            </View>
          ))}
        </View>
      );
    case "viz": {
      const Comp = VIZ_REGISTRY[block.component];
      if (!Comp) return null;
      return (
        <View style={s.vizBox} testID={`viz-${block.component}`}>
          <Comp width={vizWidth - spacing.lg * 2} {...(block.props ?? {})} />
        </View>
      );
    }
    case "warning":
      return (
        <View style={[s.callout, { borderColor: colors.warning, backgroundColor: colors.warning + "18" }]}>
          <Text style={[s.calloutGlyph, { color: colors.warning }]}>⚠</Text>
          <RichText text={block.text} style={s.calloutText} />
        </View>
      );
    case "takeaway":
      return (
        <View style={[s.takeaway, { borderColor: colors.positive }]} testID="block-takeaway">
          <Text style={[s.calloutGlyph, { color: colors.positive }]}>✓</Text>
          <RichText text={block.text} style={s.takeawayText} />
        </View>
      );
    case "pretest":
      return <PretestBlock prompt={block.prompt} options={block.options} correctIndex={block.correctIndex} feedback={block.feedback} />;
    case "exercise":
      return <ExerciseBlock items={block.items} onResult={onConcept} />;
    default:
      return null;
  }
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, minHeight: 52 },
  exitBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  exitText: { color: c.onSurface, fontSize: 20, fontWeight: "700" },
  segments: { flex: 1, flexDirection: "row", gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  position: { color: c.muted, fontSize: 13, fontWeight: "700", minWidth: 36, textAlign: "right", ...tabular },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  footer: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
  text: { color: c.onSurface, fontSize: 17, lineHeight: 26 },
  formula: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.lg, borderLeftWidth: 4, borderLeftColor: c.highlight },
  formulaText: { color: c.highlight, fontSize: 18, fontWeight: "700", ...tabular, lineHeight: 26 },
  example: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.lg, gap: 4 },
  exampleGiven: { color: c.onSurfaceSecondary, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  exampleStep: { color: c.onSurface, fontSize: 16, lineHeight: 24, ...tabular },
  exampleResult: { color: c.positive, fontSize: 16, fontWeight: "700", marginTop: 6, lineHeight: 24 },
  table: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border },
  tableCell: { flex: 1, padding: 10, color: c.onSurface, fontSize: 14 },
  tableHead: { color: c.muted, fontWeight: "700", fontSize: 11 },
  vizBox: { backgroundColor: c.surfaceSecondary, borderRadius: radius.card, padding: spacing.lg, borderWidth: 1, borderColor: c.border },
  callout: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  calloutGlyph: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
  calloutText: { color: c.onSurface, fontSize: 15, lineHeight: 22, flex: 1 },
  takeaway: { borderRadius: radius.card, borderWidth: 2, padding: spacing.xl, flexDirection: "row", gap: spacing.md, alignItems: "flex-start", backgroundColor: c.surfaceSecondary },
  takeawayText: { color: c.onSurface, fontSize: 18, lineHeight: 27, fontWeight: "600", flex: 1 },
}));
