import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Body, Card, Heading, PrimaryButton, SecondaryButton, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { getLesson, QuizItem } from "@/src/content/curriculum";
import { useApp } from "@/src/store/appStore";
import { HeaderBar } from "@/src/ui/header";
import { EquityWheel } from "@/src/viz/charts";

export default function QuizScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lesson = getLesson(String(id));
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
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (ok) setCorrectCount((x) => x + 1);
    else setWrongConcepts((w) => [...w, q.concept]);
    recordConcept(q.concept, ok);
  };

  const onNext = () => {
    if (index + 1 >= total) {
      const score = (correctCount + (isCorrect() && !revealed ? 0 : 0)) / total;
      const finalScore = (correctCount) / total;
      setQuizScore(lesson.id, finalScore, lesson.concepts);
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
        <HeaderBar title={it.study.quizResult} onBack={() => router.replace("/(tabs)")} />
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
            <SecondaryButton title={it.common.done} onPress={() => router.replace("/(tabs)")} testID="quiz-done" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <HeaderBar title={`Quiz · ${index + 1}/${total}`} onBack={() => router.back()} />
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
                <Pressable
                  key={i}
                  testID={`quiz-option-${i}`}
                  disabled={revealed}
                  onPress={() => setSelected(i)}
                  style={[
                    s.option,
                    { borderColor: showCorrect ? colors.positive : showWrong ? colors.negative : isSel ? colors.brandPrimary : colors.border, backgroundColor: isSel ? colors.brandPrimary + "18" : colors.surfaceSecondary },
                  ]}
                >
                  <Text style={s.optionText}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {revealed ? (
          <Card style={{ marginTop: spacing.xl, borderColor: isCorrect() ? colors.positive : colors.negative, borderWidth: 1 }}>
            <Text style={{ color: isCorrect() ? colors.positive : colors.negative, fontWeight: "700", marginBottom: 6 }}>
              {isCorrect() ? it.quiz.correct : it.quiz.wrong}
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

const useStyles = makeStyles((c) => ({
  numericRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  numericInput: { flex: 1, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: spacing.lg, color: c.onSurface, fontSize: 22, fontWeight: "700" },
  unit: { color: c.muted, fontSize: 18, fontWeight: "600" },
  option: { borderWidth: 1, borderRadius: 12, padding: spacing.lg },
  optionText: { color: c.onSurface, fontSize: 15, fontWeight: "500" },
}));
