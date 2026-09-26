import React, { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "@/src/ui/haptics";
import { PressableScale } from "@/src/ui/motion";
import { Body, Card, Heading, PrimaryButton, SecondaryButton, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { getLesson, LESSONS, QuizItem } from "@/src/content/curriculum";
import { conceptsDue, useApp } from "@/src/store/appStore";
import { HeaderBar } from "@/src/ui/header";
import { EquityWheel } from "@/src/viz/charts";

export default function QuizScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const conceptMastery = useApp((st) => st.conceptMastery);
  const isReview = String(id) === "review";
  const lesson = useMemo(() => (isReview ? buildReview(conceptsDue(conceptMastery)) : getLesson(String(id))), [id, isReview, conceptMastery]);
  const setQuizScore = useApp((st) => st.setQuizScore);
  const recordConcept = useApp((st) => st.recordConceptResult);

  const [index, setIndex] = useState(0);
  const [numeric, setNumeric] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongConcepts, setWrongConcepts] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  if (!lesson) return null;
  const q = lesson.quiz[index];
  const total = lesson.quiz.length;

  const isCorrect = (): boolean => {
    if (q.kind === "numeric") {
      const val = parseFloat(numeric.replace(",", "."));
      return !isNaN(val) && Math.abs(val - q.answer) <= q.tolerance;
    }
    return selected === q.correctIndex;
  };

  const onCheck = () => {
    const ok = isCorrect();
    setRevealed(true);
    if (ok) haptic.success();
    else haptic.error();
    if (ok) setCorrectCount((x) => x + 1);
    else setWrongConcepts((w) => [...w, q.concept]);
    recordConcept(q.concept, ok);
  };

  const onNext = () => {
    if (index + 1 >= total) {
      const score = (correctCount + (isCorrect() && !revealed ? 0 : 0)) / total;
      const finalScore = (correctCount) / total;
      if (!isReview) setQuizScore(lesson.id, finalScore, lesson.concepts);
      setDone(true);
    } else {
      setIndex((x) => x + 1);
      setNumeric("");
      setSelected(null);
      setRevealed(false);
    }
  };

  if (done) {
    const score = correctCount / total;
    const passed = score >= 0.7;
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
        <HeaderBar title={it.study.quizResult} onBack={() => router.replace("/(tabs)/study")} />
        <View style={{ padding: spacing.xl, alignItems: "center", flex: 1, justifyContent: "center" }}>
          <EquityWheel equity={score} labelHero="Corrette" labelVillain="Errate" />
          <Heading size="h1" style={{ marginTop: spacing.lg }}>{passed ? it.quiz.correct : "Riprova"}</Heading>
          <Body muted style={{ marginTop: spacing.sm, textAlign: "center" }}>
            {correctCount}/{total} · {(score * 100).toFixed(0)}%
          </Body>
          {wrongConcepts.length > 0 ? (
            <Card style={{ marginTop: spacing.xl, alignSelf: "stretch" }}>
              <SectionLabel>{it.study.weakConcepts}</SectionLabel>
              <Body style={{ marginTop: 4 }}>{[...new Set(wrongConcepts)].join(", ")}</Body>
            </Card>
          ) : null}
          <View style={{ height: spacing.xl }} />
          <View style={{ alignSelf: "stretch", gap: spacing.md }}>
            <PrimaryButton title={it.study.trainConcept} onPress={() => router.replace("/(tabs)/sim")} testID="quiz-train-concept" />
            <SecondaryButton title={it.common.done} onPress={() => router.replace("/(tabs)/study")} testID="quiz-done" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <HeaderBar title={`${isReview ? it.glossary.review : "Quiz"} · ${index + 1}/${total}`} onBack={() => router.back()} />
      <View style={{ padding: spacing.xl, flex: 1 }}>
        <SectionLabel>Domanda {index + 1}</SectionLabel>
        <Heading size="h2" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>{q.prompt}</Heading>

        {q.kind === "numeric" ? (
          <View style={s.numericRow}>
            <TextInput
              testID="quiz-numeric-input"
              value={numeric}
              onChangeText={setNumeric}
              editable={!revealed}
              keyboardType="numeric"
              placeholder={it.quiz.numericPlaceholder}
              placeholderTextColor={colors.muted}
              style={s.numericInput}
            />
            <Text style={s.unit}>{q.unit}</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            {q.options.map((opt, i) => {
              const isSel = selected === i;
              const showCorrect = revealed && i === q.correctIndex;
              const showWrong = revealed && isSel && i !== q.correctIndex;
              return (
                <PressableScale
                  key={i}
                  testID={`quiz-option-${i}`}
                  disabled={revealed}
                  onPress={() => setSelected(i)}
                  accessibilityState={{ selected: isSel }}
                  style={[
                    s.option,
                    { borderColor: showCorrect ? colors.positive : showWrong ? colors.negative : isSel ? colors.interactive : colors.border, backgroundColor: isSel ? colors.interactive + "18" : colors.surfaceSecondary },
                  ]}
                >
                  <Text style={s.optionText}>{opt}</Text>
                  {showCorrect ? <Text style={[s.optionMark, { color: colors.positive }]}>✓</Text> : showWrong ? <Text style={[s.optionMark, { color: colors.negative }]}>✕</Text> : isSel ? <Text style={[s.optionMark, { color: colors.interactive }]}>●</Text> : null}
                </PressableScale>
              );
            })}
          </View>
        )}

        {revealed ? (
          <Card style={{ marginTop: spacing.xl, borderColor: isCorrect() ? colors.positive : colors.negative, borderWidth: 1 }}>
            <Text style={{ color: isCorrect() ? colors.positive : colors.negative, fontWeight: "700", marginBottom: 6 }}>
              {isCorrect() ? "✓ " : "✕ "}{isCorrect() ? it.quiz.correct : it.quiz.wrong}
            </Text>
            <Body>{q.explain}</Body>
            {!isCorrect() && q.kind === "single" && selected != null ? (
              <View style={{ marginTop: spacing.sm }}>
                <SectionLabel>{it.quiz.whyWrong}</SectionLabel>
                <Body muted style={{ marginTop: 2 }}>{q.distractorRationale[selected]}</Body>
              </View>
            ) : null}
          </Card>
        ) : null}

        <View style={{ flex: 1 }} />
        {!revealed ? (
          <PrimaryButton title={it.common.confirm} onPress={onCheck} testID="quiz-check" disabled={q.kind === "numeric" ? numeric.length === 0 : selected === null} />
        ) : (
          <PrimaryButton title={index + 1 >= total ? it.common.done : it.common.next} onPress={onNext} testID="quiz-next" />
        )}
      </View>
    </View>
  );
}

// Mixed spaced-repetition session: one item per due concept, round-robin across
// concepts (never the same concept twice in a row), max 6 items.
function buildReview(due: string[]) {
  const pool = LESSONS.flatMap((l) => l.quiz.filter((q) => due.includes(q.concept)).map((q) => ({ ...q, id: `${l.id}-${q.id}` })));
  const byConcept = new Map<string, typeof pool>();
  for (const q of pool) byConcept.set(q.concept, [...(byConcept.get(q.concept) ?? []), q]);
  const items: typeof pool = [];
  let added = true;
  while (added && items.length < 6) {
    added = false;
    for (const list of byConcept.values()) {
      const q = list.shift();
      if (q && items.length < 6) { items.push(q); added = true; }
    }
  }
  if (items.length === 0) return undefined;
  return { id: "review", module: "M1", order: 0, title: it.glossary.review, subtitle: "", estMinutes: 3, concepts: Array.from(byConcept.keys()), slides: [], quiz: items } as NonNullable<ReturnType<typeof getLesson>>;
}

const useStyles = makeStyles((c) => ({
  numericRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  numericInput: { flex: 1, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: spacing.lg, color: c.onSurface, fontSize: 22, fontWeight: "700" },
  unit: { color: c.muted, fontSize: 18, fontWeight: "600" },
  option: { borderWidth: 1, borderRadius: 12, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  optionText: { color: c.onSurface, fontSize: 15, fontWeight: "500", flex: 1 },
  optionMark: { fontSize: 16, fontWeight: "800" },
}));
