import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Card, Heading, PrimaryButton } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { useApp, Level } from "@/src/store/appStore";
import { ScoreTimeline } from "@/src/viz/charts";
import { CardRow } from "@/src/viz/PlayingCard";

// 3 screens · ≤ 8 words of copy each · one graphic · always skippable.
const STEPS = [it.onboarding.s1Title, it.onboarding.s2Title, it.onboarding.s3Title];
const SAMPLE_TIMELINE = [100, 97.5, 97.5, 92, 92, 90.5, 88];

export default function Onboarding() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const complete = useApp((st) => st.completeOnboarding);
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level>("intuitive");

  const isLast = step === STEPS.length - 1;

  const finish = (lvl: Level) => {
    complete(lvl);
    router.replace("/(tabs)");
  };

  const onNext = () => {
    if (isLast) finish(level);
    else setStep((x) => x + 1);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]} testID="onboarding-screen">
      <View style={s.topRow}>
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[s.dot, { backgroundColor: i <= step ? colors.progress : colors.surfaceTertiary }]} />
          ))}
        </View>
        <Pressable onPress={() => finish("intuitive")} hitSlop={12} testID="onboarding-skip" accessibilityRole="button" style={s.skip}>
          <Text style={s.skipText}>{it.onboarding.skip}</Text>
        </Pressable>
      </View>

      <View style={s.content}>
        <View style={s.graphic}>
          {step === 0 ? <CardRow cards={["As", "Kh"]} size="hero" gap={10} /> : null}
          {step === 1 ? <ScoreTimeline timeline={SAMPLE_TIMELINE} width={280} /> : null}
        </View>

        <Heading size="display" style={{ marginTop: spacing.xl, textAlign: "center" }}>{STEPS[step]}</Heading>

        {step === 2 ? (
          <View style={{ gap: spacing.md, marginTop: spacing.xl, alignSelf: "stretch" }}>
            {([
              ["novice", it.onboarding.levelNovice],
              ["intuitive", it.onboarding.levelIntuitive],
              ["basics", it.onboarding.levelBasics],
            ] as [Level, string][]).map(([id, label]) => (
              <Card key={id} onPress={() => setLevel(id)} testID={`level-${id}`} style={level === id ? { borderColor: colors.interactive, borderWidth: 2 } : undefined}>
                <Body style={{ fontWeight: level === id ? "700" : "500", textAlign: "center" }}>{level === id ? "● " : "○ "}{label}</Body>
              </Card>
            ))}
          </View>
        ) : null}
      </View>

      <PrimaryButton title={isLast ? it.common.start : it.common.continue} onPress={onNext} testID="onboarding-next" />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface, paddingHorizontal: spacing.xl },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, minHeight: 44 },
  dots: { flex: 1, flexDirection: "row", gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
  skip: { minHeight: 44, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  skipText: { color: c.interactive, fontSize: 15, fontWeight: "600" },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  graphic: { minHeight: 120, alignItems: "center", justifyContent: "center" },
}));
