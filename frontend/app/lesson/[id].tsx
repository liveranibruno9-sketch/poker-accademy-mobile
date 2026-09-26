import React, { useEffect } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Card, Heading, PrimaryButton, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { Block, getLesson } from "@/src/content/curriculum";
import { VIZ_REGISTRY } from "@/src/viz/charts";
import { useApp } from "@/src/store/appStore";
import { ScrollView } from "react-native-gesture-handler";
import { HeaderBar } from "@/src/ui/header";

export default function LessonScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const markRead = useApp((st) => st.markLessonRead);
  const lesson = getLesson(String(id));

  useEffect(() => {
    if (lesson) markRead(lesson.id);
  }, [lesson, markRead]);

  if (!lesson) return null;
  const vizWidth = width - spacing.xl * 2 - spacing.lg * 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <HeaderBar title={lesson.id} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        <SectionLabel>{lesson.subtitle}</SectionLabel>
        <Heading size="h1" style={{ marginBottom: spacing.lg }}>{lesson.title}</Heading>

        {lesson.slides.map((slide, si) => (
          <Card key={si} style={{ marginBottom: spacing.lg }}>
            <SectionLabel>{slide.kicker}</SectionLabel>
            <Heading size="h3" style={{ marginTop: 2, marginBottom: spacing.md }}>{slide.heading}</Heading>
            {slide.blocks.map((b, bi) => (
              <BlockView key={bi} block={b} vizWidth={vizWidth} />
            ))}
          </Card>
        ))}

        <PrimaryButton title={it.study.goToQuiz} onPress={() => router.replace(`/quiz/${lesson.id}`)} testID="go-to-quiz" />
      </ScrollView>
    </View>
  );
}

function BlockView({ block, vizWidth }: { block: Block; vizWidth: number }) {
  const s = useStyles();
  const { colors } = useTheme();
  switch (block.kind) {
    case "text":
      return <Text style={s.text}>{block.text}</Text>;
    case "formula":
      return (
        <View style={s.formula}>
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
        <View style={{ marginVertical: spacing.md }}>
          <Comp width={vizWidth} {...(block.props ?? {})} />
        </View>
      );
    }
    case "warning":
      return (
        <View style={[s.callout, { borderColor: colors.warning, backgroundColor: colors.warning + "18" }]}>
          <Text style={[s.calloutGlyph, { color: colors.warning }]}>⚠</Text>
          <Text style={s.calloutText}>{block.text}</Text>
        </View>
      );
    case "takeaway":
      return (
        <View style={[s.callout, { borderColor: colors.positive, backgroundColor: colors.positive + "18" }]}>
          <Text style={[s.calloutGlyph, { color: colors.positive }]}>✓</Text>
          <Text style={s.calloutText}>{block.text}</Text>
        </View>
      );
    default:
      return null;
  }
}

const useStyles = makeStyles((c) => ({
  text: { color: c.onSurface, fontSize: 15, lineHeight: 23, marginBottom: spacing.md },
  formula: { backgroundColor: c.surfaceTertiary, borderRadius: 10, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 3, borderLeftColor: c.highlight },
  formulaText: { color: c.highlight, fontSize: 15, fontWeight: "600", ...tabular, lineHeight: 22 },
  example: { backgroundColor: c.surfaceTertiary, borderRadius: 10, padding: spacing.md, marginBottom: spacing.md, gap: 2 },
  exampleGiven: { color: c.onSurfaceSecondary, fontSize: 14, fontWeight: "600", marginBottom: 4 },
  exampleStep: { color: c.muted, fontSize: 14, ...tabular },
  exampleResult: { color: c.positive, fontSize: 14, fontWeight: "700", marginTop: 4 },
  table: { borderRadius: 10, overflow: "hidden", marginBottom: spacing.md, borderWidth: 1, borderColor: c.border },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border },
  tableCell: { flex: 1, padding: 8, color: c.onSurface, fontSize: 13 },
  tableHead: { color: c.muted, fontWeight: "700", fontSize: 11 },
  callout: { borderRadius: 10, borderWidth: 1, padding: spacing.md, marginBottom: spacing.md, flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  calloutGlyph: { fontSize: 15, lineHeight: 20, fontWeight: "800" },
  calloutText: { color: c.onSurface, fontSize: 14, lineHeight: 20, fontWeight: "500", flex: 1 },
}));
