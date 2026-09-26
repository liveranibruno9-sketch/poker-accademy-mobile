import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Body, Card, Heading, PrimaryButton, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { useApp, Level } from "@/src/store/appStore";
import { EquityWheel } from "@/src/viz/charts";

const STEPS = [
  { kicker: "POKER ACADEMY", title: it.onboarding.s1Title, body: it.onboarding.s1Body },
  { kicker: "IL SISTEMA", title: it.onboarding.s2Title, body: it.onboarding.s2Body },
  { kicker: "IL TUO LIVELLO", title: it.onboarding.s3Title, body: "" },
];

export default function Onboarding() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const complete = useApp((st) => st.completeOnboarding);
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level>("intuitive");

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const onNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isLast) {
      complete(level);
      router.replace("/(tabs)");
    } else setStep((x) => x + 1);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={s.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.dot, { backgroundColor: i <= step ? colors.brandPrimary : colors.surfaceTertiary }]} />
        ))}
      </View>

      <View style={s.content}>
        <SectionLabel>{cur.kicker}</SectionLabel>
        <Heading size="display" style={{ marginTop: spacing.sm }}>{cur.title}</Heading>
        {cur.body ? <Body muted style={{ marginTop: spacing.lg }}>{cur.body}</Body> : null}

        {step === 1 ? (
          <View style={{ alignItems: "center", marginTop: spacing.xxl }}>
            <EquityWheel equity={1} labelHero="Decisione corretta" labelVillain="Esito del piatto" />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
            {([
              ["novice", it.onboarding.levelNovice],
              ["intuitive", it.onboarding.levelIntuitive],
              ["basics", it.onboarding.levelBasics],
            ] as [Level, string][]).map(([id, label]) => (
              <Card key={id} onPress={() => setLevel(id)} testID={`level-${id}`} style={level === id ? { borderColor: colors.brandPrimary, borderWidth: 2 } : undefined}>
                <Body style={{ fontWeight: level === id ? "700" : "500" }}>{label}</Body>
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
  content: { flex: 1, justifyContent: "center" },
  dots: { flexDirection: "row", gap: 6 },
  dot: { flex: 1, height: 4, borderRadius: 2 },
}));
