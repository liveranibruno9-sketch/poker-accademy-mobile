import React, { useEffect } from "react";
import { Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { DecisionGrade } from "@/src/engine/grading";
import { DecisionRecord } from "@/src/store/appStore";
import { EvBarChart } from "@/src/viz/charts";
import { decisiveNumber, explainText } from "./explain";
import { PrimaryButton, SecondaryButton, SectionLabel } from "@/src/ui/components";
import { CountUp, FlashView } from "@/src/ui/motion";
import { haptic } from "@/src/ui/haptics";

export function VerdictSheet({
  visible,
  grade,
  decision,
  score,
  villainPct,
  onReview,
  onContinue,
}: {
  visible: boolean;
  grade: DecisionGrade | null;
  decision: DecisionRecord | null;
  score: number;
  villainPct: number;
  onReview: (lesson: string) => void;
  onContinue: () => void;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!grade || !decision) return null;

  const tone = grade.verdict === "correct" ? colors.positive : grade.verdict === "imprecise" ? colors.warning : colors.negative;
  const onTone = grade.verdict === "correct" ? colors.onSuccess : grade.verdict === "imprecise" ? colors.onWarning : colors.onError;
  const title = grade.verdict === "correct" ? it.verdict.correct : grade.verdict === "imprecise" ? it.verdict.imprecise : `${it.verdict.error}: ${grade.errorLabel}`;
  const icon = grade.verdict === "correct" ? "✓" : grade.verdict === "imprecise" ? "!" : "✕";
  const num = decisiveNumber(grade);
  const lesson = grade.errorCode ? mapLesson(grade.errorCode) : "L04";
  const key = `${decision.handSeed}-${decision.street}-${decision.chosenLabel}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onContinue}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="verdict-sheet">
          <View style={s.grabber} />
          <OutcomeHaptic verdict={grade.verdict} keyId={key} />
          <FlashView trigger={key} flashOnMount color={tone} radius={radius.md} style={s.headerFlash}>
            <View style={s.headerRow}>
              <View style={[s.iconCircle, { backgroundColor: tone }]}>
                <Text style={[s.iconText, { color: onTone }]}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, { color: tone }]}>{title}</Text>
                <View style={s.subtitleRow}>
                  <Text style={s.subtitle}>
                    {grade.pointsLost > 0 ? it.verdict.pointsLost(grade.pointsLost) : it.verdict.noPoints} · {it.verdict.newTotal}{" "}
                  </Text>
                  <CountUp value={score} from={score + grade.pointsLost} format={(v) => v.toFixed(1)} style={s.scoreValue} testID="verdict-score" />
                </View>
              </View>
            </View>
          </FlashView>

          {num ? (
            <View style={s.numberBox}>
              <SectionLabel>{it.verdict.theNumber}</SectionLabel>
              <Text style={s.numberValue}>{num.value}</Text>
            </View>
          ) : null}

          <SectionLabel style={{ marginTop: spacing.md }}>{it.verdict.evComparison}</SectionLabel>
          <EvBarChart actions={decision.evActions} />

          <Text style={s.explain}>{explainText(grade)}</Text>

          <Text style={s.rangeLine}>{it.verdict.villainRange}: ~{villainPct.toFixed(0)}% delle mani</Text>

          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {grade.verdict === "error" ? (
              <SecondaryButton title={`${it.verdict.review} ${lesson}`} onPress={() => onReview(lesson)} testID="verdict-review" />
            ) : null}
            <PrimaryButton title={it.verdict.keepPlaying} onPress={onContinue} testID="verdict-continue" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function mapLesson(code: string): string {
  if (code.startsWith("POT_ODDS") || code.includes("EQUITY") || code === "STACKOFF_DOMINATED") return "L02";
  if (code.startsWith("PREFLOP") || code === "LIMP") return "L02";
  if (code.startsWith("SIZING") || code === "MISSED_VALUE_BET") return "L07";
  if (code.startsWith("BLUFF")) return "L05";
  if (code.includes("MDF")) return "L08";
  return "L04";
}

// Medium haptic on the outcome event, once per decision.
function OutcomeHaptic({ verdict, keyId }: { verdict: string; keyId: string }) {
  useEffect(() => {
    if (verdict === "correct") haptic.success();
    else if (verdict === "imprecise") haptic.warning();
    else haptic.error();
  }, [keyId, verdict]);
  return null;
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.xl, maxHeight: "88%" },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.md },
  headerFlash: { marginHorizontal: -spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 20, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "700" },
  subtitleRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", marginTop: 2 },
  subtitle: { color: c.muted, fontSize: 13, ...tabular },
  scoreValue: { color: c.reward, fontSize: 14, fontWeight: "700", ...tabular },
  numberBox: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, borderLeftWidth: 3, borderLeftColor: c.highlight },
  numberValue: { color: c.highlight, fontSize: 22, fontWeight: "700", ...tabular, marginTop: 2 },
  explain: { color: c.onSurface, fontSize: 14, lineHeight: 21, marginTop: spacing.md },
  rangeLine: { color: c.muted, fontSize: 13, marginTop: spacing.sm, ...tabular },
}));
