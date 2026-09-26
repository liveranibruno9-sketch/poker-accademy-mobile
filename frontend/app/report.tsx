import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Body, Card, Heading, PrimaryButton, ScreenContainer, SecondaryButton, SectionLabel, StatValue } from "@/src/ui/components";
import { CountUp } from "@/src/ui/motion";
import { makeStyles, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { useSim } from "@/src/features/sim/simStore";
import { averageScore, useApp } from "@/src/store/appStore";
import { EquityWheel, ScoreTimeline } from "@/src/viz/charts";
import { ERROR_META } from "@/src/engine/grading";

export default function ReportScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const controller = useSim((st) => st.controller);
  const sessions = useApp((st) => st.sessions);

  if (!controller) {
    return (
      <ScreenContainer>
        <Heading size="h1">{it.report.title}</Heading>
        <PrimaryButton title={it.common.done} onPress={() => router.replace("/(tabs)")} />
      </ScreenContainer>
    );
  }

  const decs = controller.decisions;
  const handsPlayed = controller.handIndex + 1;
  const errors = decs.filter((d) => d.verdict === "error");
  const evLost = decs.reduce((a, d) => a + d.deltaEvBb, 0);
  const correctPct = decs.length ? (decs.filter((d) => d.verdict === "correct").length / decs.length) * 100 : 0;
  const reads = decs.filter((d) => d.diceRead != null).map((d) => d.diceRead!) as number[];
  const avgRead = reads.length ? reads.reduce((a, b) => a + b, 0) / reads.length : null;

  const score = controller.score;
  const verdictWord = score >= 90 ? it.report.solid : score >= 75 ? it.report.growing : score >= 60 ? it.report.fragile : it.report.toReview;

  // errors by class
  const byClass: Record<string, { points: number; count: number }> = {};
  for (const e of errors) {
    const code = e.errorCode!;
    byClass[code] = byClass[code] ?? { points: 0, count: 0 };
    byClass[code].points += e.pointsLost;
    byClass[code].count += 1;
  }
  const classList = Object.entries(byClass).sort((a, b) => b[1].points - a[1].points);
  const maxPoints = Math.max(...classList.map(([, v]) => v.points), 1);

  // Full review queue: every non-correct decision, worst first (nothing is lost if pills were ignored)
  const costliest = [...errors].sort((a, b) => b.pointsLost - a.pointsLost);
  const wheelW = Math.min(width - spacing.xl * 4, 200);
  const timelineW = width - spacing.xl * 2 - spacing.lg * 2;

  const avg5 = averageScore(sessions, 5);

  const plan = classList.slice(0, 2).map(([code]) => ERROR_META[code as keyof typeof ERROR_META].lesson).filter((l) => l.startsWith("L"));

  return (
    <ScreenContainer testID="report-screen">
      <SectionLabel>{it.report.title}</SectionLabel>
      {controller.endedEarly ? (
        <Card style={{ marginBottom: spacing.md, borderColor: colors.warning }} testID="ended-early-card">
          <Body style={{ color: colors.onSurface }}>⚠ {it.report.endedEarly}</Body>
          <View style={{ marginTop: spacing.sm }}>
            <SecondaryButton title={it.home.review} onPress={() => router.push("/quiz/review")} testID="report-review" />
          </View>
        </Card>
      ) : null}

      <Card style={{ alignItems: "center" }}>
        <EquityWheel equity={score / 100} width={wheelW} labelHero={verdictWord} labelVillain="Persi" />
        <View style={s.scoreRow}>
          <CountUp value={score} from={100} format={(v) => v.toFixed(1)} style={s.scoreValue} testID="report-score" />
          <Text style={s.scoreOf}> / 100</Text>
        </View>
        <Text style={s.verdictWord}>{verdictWord}</Text>
        {avg5 != null ? <Text style={s.compare}>Media ultime 5: {avg5.toFixed(1)}</Text> : null}
      </Card>

      <View style={s.kpiGrid}>
        <View style={s.kpiCell}><StatValue label={it.report.handsPlayed} value={String(handsPlayed)} /></View>
        <View style={s.kpiCell}><StatValue label={it.report.totalErrors} value={String(errors.length)} /></View>
        <View style={s.kpiCell}><StatValue label={it.report.evLost} value={evLost.toFixed(1)} /></View>
        <View style={s.kpiCell}><StatValue label={it.report.correctPct} value={`${correctPct.toFixed(0)}%`} /></View>
        <View style={s.kpiCell}><StatValue label={it.report.evPer100} value={(evLost / handsPlayed * 100).toFixed(0)} /></View>
        <View style={s.kpiCell}><StatValue label={it.report.avgRead} value={avgRead != null ? avgRead.toFixed(2) : "—"} /></View>
      </View>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.report.timeline}</SectionLabel>
        <ScoreTimeline timeline={controller.scoreTimeline} width={timelineW} />
      </Card>

      {classList.length > 0 ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>{it.report.errorsByClass}</SectionLabel>
          {classList.map(([code, v]) => {
            const meta = ERROR_META[code as keyof typeof ERROR_META];
            return (
              <View key={code} style={{ marginTop: spacing.sm }}>
                <View style={s.leakRow}>
                  <Text style={s.leakLabel}>{meta.labelIt}</Text>
                  <Text style={s.leakPoints}>−{v.points.toFixed(1)} · {v.count}×</Text>
                </View>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${(v.points / maxPoints) * 100}%`, backgroundColor: colors.negative }]} />
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      {costliest.length > 0 ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>{it.report.costliest}</SectionLabel>
          {costliest.map((d, i) => (
            <View key={i} style={s.handRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.handCards}>{d.heroCards.join(" ")} · {d.heroPosition} · {d.street}</Text>
                <Text style={s.handSub}>{d.chosenLabel} → {d.bestLabel} · {d.errorLabel}</Text>
              </View>
              <Text style={s.handPoints}>−{d.pointsLost.toFixed(1)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.report.actionPlan}</SectionLabel>
        {plan.length > 0 ? (
          plan.map((l) => (
            <PrimaryButton key={l} title={`${it.report.reviewLesson} ${l}`} onPress={() => router.replace(`/lesson/${l}`)} testID={`plan-${l}`} />
          ))
        ) : (
          <Body muted>Nessun leak evidente in questa sessione. Continua così.</Body>
        )}
      </Card>

      <View style={{ height: spacing.lg }} />
      <PrimaryButton title={it.common.done} onPress={() => router.replace("/(tabs)")} testID="report-done" />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: spacing.sm },
  scoreValue: { color: c.reward, fontSize: 28, fontWeight: "700", ...tabular },
  scoreOf: { color: c.muted, fontSize: 16, fontWeight: "600" },
  verdictWord: { color: c.onSurface, fontSize: 15, fontWeight: "700", marginTop: 2 },
  compare: { color: c.muted, fontSize: 13, marginTop: 4, ...tabular },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  kpiCell: { width: "48%" },
  leakRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  leakLabel: { color: c.onSurface, fontSize: 13, fontWeight: "600", flex: 1 },
  leakPoints: { color: c.negative, fontSize: 13, fontWeight: "700", ...tabular },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  handRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  handCards: { color: c.onSurface, fontSize: 14, fontWeight: "700", ...tabular },
  handSub: { color: c.muted, fontSize: 12, marginTop: 2 },
  handPoints: { color: c.negative, fontSize: 16, fontWeight: "700", ...tabular },
}));
