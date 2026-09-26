// Interactive lesson blocks: "pretest" (micro-decision before the explanation)
// and "exercise" (2–3 numeric exercises with answer-specific feedback).
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { ExerciseItem } from "@/src/content/curriculum";
import { PrimaryButton, SecondaryButton } from "@/src/ui/components";
import { PressableScale } from "@/src/ui/motion";
import { RichText } from "@/src/ui/RichText";
import { haptic } from "@/src/ui/haptics";

export function PretestBlock({ prompt, options, correctIndex, feedback, onAnswered }: { prompt: string; options: string[]; correctIndex: number; feedback: string[]; onAnswered?: (correct: boolean) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <View style={{ gap: spacing.md }}>
      <RichText text={prompt} style={s.prompt} />
      <View style={{ gap: spacing.sm }}>
        {options.map((o, i) => {
          const on = picked === i;
          return (
            <PressableScale
              key={i}
              testID={`pretest-option-${i}`}
              disabled={picked != null}
              onPress={() => {
                setPicked(i);
                if (i === correctIndex) haptic.success();
                else haptic.medium();
                onAnswered?.(i === correctIndex);
              }}
              style={[s.option, on && { borderColor: colors.interactive, backgroundColor: colors.interactive + "18" }, picked != null && !on && { opacity: 0.5 }]}
            >
              <Text style={s.optionText}>{on ? "● " : "○ "}{o}</Text>
            </PressableScale>
          );
        })}
      </View>
      {picked == null ? (
        <Text style={s.hint}>{it.study.pretestHint}</Text>
      ) : (
        <View style={s.feedback} testID="pretest-feedback">
          <Text style={s.feedbackText}>{feedback[picked]}</Text>
        </View>
      )}
    </View>
  );
}

function matchFeedback(item: ExerciseItem, v: number): { ok: boolean; text: string } {
  if (Math.abs(v - item.answer) <= item.tolerance) return { ok: true, text: item.correct };
  for (const w of item.wrong) {
    if (w.value != null && Math.abs(v - w.value) <= item.tolerance * 2) return { ok: false, text: w.text };
    if (w.below && v < item.answer) return { ok: false, text: w.text };
    if (w.above && v > item.answer) return { ok: false, text: w.text };
  }
  return { ok: false, text: item.fallback };
}

export function ExerciseBlock({ items, onResult, onAllDone }: { items: ExerciseItem[]; onResult?: (concept: string, correct: boolean) => void; onAllDone?: () => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [idx, setIdx] = useState(0);
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(0);
  const item = items[idx];
  const finished = idx >= items.length;

  const check = () => {
    const v = parseFloat(raw.replace(",", "."));
    if (isNaN(v)) return;
    const r = matchFeedback(item, v);
    setResult(r);
    if (r.ok) {
      haptic.success();
      setDone((d) => d + 1);
    } else haptic.error();
    onResult?.(item.concept, r.ok);
  };

  const next = () => {
    setRaw("");
    setResult(null);
    if (idx + 1 >= items.length) {
      setIdx(items.length);
      onAllDone?.();
    } else setIdx(idx + 1);
  };

  if (finished) {
    return (
      <View style={[s.feedback, { borderColor: colors.positive }]} testID="exercise-done">
        <Text style={[s.feedbackText, { color: colors.positive, fontWeight: "700" }]}>✓ {it.study.exercisesDone} · {done}/{items.length}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }} testID={`exercise-${idx}`}>
      <Text style={s.counter}>{idx + 1}/{items.length}</Text>
      <RichText text={item.prompt} style={s.prompt} />
      <View style={s.inputRow}>
        <TextInput
          testID="exercise-input"
          value={raw}
          onChangeText={setRaw}
          editable={!result}
          keyboardType="decimal-pad"
          placeholder={it.quiz.numericPlaceholder}
          placeholderTextColor={colors.muted}
          style={[s.input, result && { borderColor: result.ok ? colors.positive : colors.negative }]}
          onSubmitEditing={check}
          returnKeyType="done"
        />
        {item.unit ? <Text style={s.unit}>{item.unit}</Text> : null}
      </View>
      {result ? (
        <View style={[s.feedback, { borderColor: result.ok ? colors.positive : colors.negative }]} testID="exercise-feedback">
          <Text style={[s.feedbackText, { color: result.ok ? colors.positive : colors.negative, fontWeight: "700" }]}>{result.ok ? "✓ " : "✕ "}{result.text}</Text>
        </View>
      ) : null}
      {!result ? (
        <PrimaryButton title={it.study.check} onPress={check} disabled={raw.trim().length === 0} testID="exercise-check" />
      ) : result.ok ? (
        <PrimaryButton title={idx + 1 >= items.length ? it.common.done : it.study.nextExercise} onPress={next} testID="exercise-next" />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <PrimaryButton title={it.study.tryAgain} onPress={() => { setRaw(""); setResult(null); }} testID="exercise-retry" />
          <SecondaryButton title={idx + 1 >= items.length ? it.common.done : it.study.nextExercise} onPress={next} testID="exercise-skip" />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  prompt: { color: c.onSurface, fontSize: 17, lineHeight: 24, fontWeight: "600" },
  option: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.lg, backgroundColor: c.surfaceSecondary, minHeight: 52 },
  optionText: { color: c.onSurface, fontSize: 16, fontWeight: "600" },
  hint: { color: c.muted, fontSize: 13 },
  feedback: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: c.surfaceTertiary },
  feedbackText: { color: c.onSurface, fontSize: 15, lineHeight: 22 },
  counter: { color: c.muted, fontSize: 12, fontWeight: "700", ...tabular },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  input: { flex: 1, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.lg, color: c.onSurface, fontSize: 22, fontWeight: "700", ...tabular },
  unit: { color: c.muted, fontSize: 18, fontWeight: "600" },
}));
