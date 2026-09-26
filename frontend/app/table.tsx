import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { useSim } from "@/src/features/sim/simStore";
import { heroSeat, legalActions, pot, toCall } from "@/src/engine/gameState";
import { Action } from "@/src/engine/types";
import { CardRow } from "@/src/viz/PlayingCard";
import { VerdictSheet } from "@/src/features/sim/VerdictSheet";
import { RangeReadModal } from "@/src/features/sim/RangeReadModal";
import { HeaderBar } from "@/src/ui/header";
import { PrimaryButton } from "@/src/ui/components";
import { CountUp, FlashView, PressableScale } from "@/src/ui/motion";
import { haptic } from "@/src/ui/haptics";

// Radial felt: `feltCenter` in the middle fading to `felt` at the edges.
function FeltBackground() {
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <RadialGradient id="feltGrad" cx="50%" cy="42%" rx="62%" ry="48%" fx="50%" fy="42%" gradientUnits="objectBoundingBox">
              <Stop offset="0" stopColor={colors.feltCenter} />
              <Stop offset="1" stopColor={colors.felt} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill="url(#feltGrad)" />
        </Svg>
      ) : null}
    </View>
  );
}

const fmtBb1 = (v: number) => `${v.toFixed(1)} bb`;
const fmtBb0 = (v: number) => `${v.toFixed(0)} bb`;
const fmt1 = (v: number) => v.toFixed(1);

export default function TableScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const controller = useSim((st) => st.controller);
  const bump = useSim((st) => st.bump);
  const tick = useSim((st) => st.tick);
  const finalize = useSim((st) => st.finalize);

  const [showVerdict, setShowVerdict] = useState(false);
  const [betTo, setBetTo] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);

  const st = controller?.state;
  const hero = st ? heroSeat(st) : null;
  const heroToAct = !!(controller && st && !st.finished && hero && st.toAct === hero.index && controller.pendingRangeReadSeat == null && !showVerdict);
  const la = heroToAct && st ? legalActions(st) : null;
  const rated = controller?.cfg.mode === "rated";

  const nodeKey = st ? `${st.handSeed}-${st.street}-${st.log.length}-${st.toAct}` : "none";

  // reset bet selection on new node
  useEffect(() => {
    setBetTo(null);
  }, [nodeKey]);

  // decision timer (rated only)
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!heroToAct || !rated || !controller) return;
    setTimeLeft(controller.cfg.timerSec);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          doAct({ type: "fold" }, true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, heroToAct, rated]);

  if (!controller || !st || !hero) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
        <HeaderBar title={it.tabs.sim} onBack={() => router.back()} />
      </View>
    );
  }

  const potBb = pot(st);
  const callChips = heroToAct ? toCall(st, hero.index) : 0;
  const potBefore = Math.max(0, potBb - callChips);

  function doAct(action: Action, timedOut = false) {
    if (!controller) return;
    controller.act(action, timedOut);
    bump();
    if (controller.cfg.mode === "rated" && controller.cfg.verdictMode === "immediate") setShowVerdict(true);
    else if (controller.finished) goReport();
  }

  function goReport() {
    finalize();
    router.replace("/report");
  }

  function onVerdictContinue() {
    setShowVerdict(false);
    if (controller?.finished) goReport();
  }

  function nextHand() {
    controller?.nextHand();
    bump();
  }

  function presetAmount(frac: number): number {
    if (!la) return 0;
    const raw = hero!.committed + Math.round(potBefore * frac) + callChips;
    return Math.max(la.minRaiseTo, Math.min(raw, la.maxRaiseTo));
  }

  const currentBetTo = betTo ?? (la ? la.minRaiseTo : 0);
  const betAddChips = currentBetTo - hero.committed;
  const betPctPot = potBefore > 0 ? Math.round(((currentBetTo - hero.committed) / potBefore) * 100) : 0;

  const villains = st.seats.filter((x) => !x.isHero);
  const showdown = st.finished;
  const heroWon = (hero as any).won as number | undefined;

  return (
    <View style={[s.root, { paddingTop: insets.top }]} testID="table-screen">
      <FeltBackground />
      <HeaderBar
        title={it.sim.handOf(controller.handIndex + 1, controller.cfg.handsPlanned)}
        onBack={() => router.back()}
        tint={colors.onFelt}
        right={rated ? <CountUp value={controller.score} format={fmt1} style={s.scorePill} testID="table-score" /> : undefined}
      />

      {/* Villains */}
      <View style={s.villains}>
        {villains.map((v) => {
          const stat = controller.observedStats(v.index);
          const isToAct = st.toAct === v.index && !st.finished;
          return (
            <View key={v.index} style={[s.pod, v.folded && { opacity: 0.35 }, isToAct && { borderColor: colors.interactive, borderWidth: 2 }]} testID={`villain-${v.index}`}>
              <View style={s.podHead}>
                <Text style={s.podPos}>{isToAct ? "▸ " : ""}{v.position}</Text>
                {controller.cfg.hudEnabled ? (
                  <Text style={[s.podStat, { opacity: stat.reliable ? 1 : 0.5 }]}>
                    {stat.vpip}/{stat.pfr} · n{stat.n}
                  </Text>
                ) : null}
              </View>
              <CardRow cards={showdown && !v.folded ? [fmt(v.hole?.[0]), fmt(v.hole?.[1])] : [undefined, undefined]} size="villain" gap={3} />
              <CountUp value={v.stack} format={fmtBb0} style={s.podStack} />
              {(v as any).won ? <Text style={s.podWon}>▲ +{(v as any).won.toFixed(1)}</Text> : null}
            </View>
          );
        })}
      </View>

      {/* Board + pot */}
      <View style={s.center}>
        <Text style={s.potLabel}>{it.sim.pot.toUpperCase()}</Text>
        <CountUp value={potBb} format={fmtBb1} style={s.potValue} testID="table-pot" />
        <View style={{ marginTop: spacing.md }}>
          <CardRow cards={[0, 1, 2, 3, 4].map((i) => fmt(st.board[i]))} size="board" gap={5} />
        </View>
        {!rated && heroToAct ? <Text style={s.equityHint}>{it.sim.equityHint}: {(controller.getEv().equity * 100).toFixed(0)}%</Text> : null}
      </View>

      {/* Hero */}
      <FlashView trigger={heroWon ? `${st.handSeed}-won` : null} color={colors.positive} radius={radius.md} style={s.heroWrap}>
        <View style={[s.hero, heroToAct && { borderColor: colors.interactive }]}>
          <CardRow cards={[fmt(hero.hole?.[0]), fmt(hero.hole?.[1])]} size="hero" gap={6} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={s.heroPos}>{heroToAct ? "▸ " : ""}{hero.position} · TU</Text>
            <CountUp value={hero.stack} format={fmtBb1} style={s.heroStack} testID="hero-stack" />
            {heroWon ? <Text style={s.podWon}>▲ +{heroWon.toFixed(1)} bb</Text> : null}
          </View>
          {rated && heroToAct ? (
            <View style={s.timerWrap}>
              <Text style={[s.timer, { color: timeLeft <= 5 ? colors.negative : colors.muted }]}>{timeLeft <= 5 ? "⏱ " : ""}{timeLeft}s</Text>
            </View>
          ) : null}
        </View>
      </FlashView>

      {/* Action log */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.log} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md, alignItems: "center" }}>
        {st.log.slice(-8).map((l, i) => (
          <Text key={i} style={s.logText}>{l.text}</Text>
        ))}
        {st.log.length === 0 ? <Text style={s.logText}>Preflop</Text> : null}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[s.controls, { paddingBottom: insets.bottom + spacing.md }]}>
        {heroToAct && la ? (
          <>
            {la.canBet || la.canRaise ? (
              <View style={s.sizeRow}>
                {[["33%", 1 / 3], ["50%", 0.5], ["75%", 0.75], ["100%", 1]].map(([label, frac]) => {
                  const sel = betTo === presetAmount(frac as number);
                  return (
                    <PressableScale key={String(label)} testID={`size-${label}`} onPress={() => setBetTo(presetAmount(frac as number))} style={[s.sizePill, sel && { backgroundColor: colors.interactive }]}>
                      <Text style={[s.sizePillText, sel && { color: colors.onInteractive }]}>{label}</Text>
                    </PressableScale>
                  );
                })}
                <PressableScale testID="size-allin" onPress={() => setBetTo(la.maxRaiseTo)} style={[s.sizePill, betTo === la.maxRaiseTo && { backgroundColor: colors.interactive }]}>
                  <Text style={[s.sizePillText, betTo === la.maxRaiseTo && { color: colors.onInteractive }]}>{it.sim.allIn}</Text>
                </PressableScale>
              </View>
            ) : null}
            <View style={s.actionRow}>
              {la.canFold ? (
                <PressableScale testID="action-fold" onPress={() => doAct({ type: "fold" })} style={[s.actionBtn, { backgroundColor: colors.error + "22", borderColor: colors.error }]}>
                  <Text style={[s.actionText, { color: colors.negative }]}>✕ {it.sim.fold}</Text>
                </PressableScale>
              ) : null}
              {la.canCheck ? (
                <PressableScale testID="action-check" onPress={() => doAct({ type: "check" })} style={[s.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.interactive }]}>
                  <Text style={[s.actionText, { color: colors.onSurface }]}>{it.sim.check}</Text>
                </PressableScale>
              ) : null}
              {la.canCall ? (
                <PressableScale testID="action-call" onPress={() => doAct({ type: "call", amount: la.callAmount })} style={[s.actionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.interactive }]}>
                  <Text style={[s.actionText, { color: colors.onSurface }]}>{it.sim.call} {(la.callAmount).toFixed(1)}</Text>
                </PressableScale>
              ) : null}
              {la.canBet || la.canRaise ? (
                <PressableScale
                  testID="action-bet"
                  haptics="medium"
                  onPress={() => doAct({ type: la.canRaise ? "raise" : "bet", amount: currentBetTo })}
                  style={[s.actionBtn, { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}
                >
                  <Text style={[s.actionText, { color: colors.onBrandPrimary }]}>
                    {la.canRaise ? it.sim.raise : it.sim.bet} {(currentBetTo).toFixed(1)}
                  </Text>
                  <Text style={[s.actionSub, { color: colors.onBrandPrimary }]}>{betPctPot}% · {betAddChips.toFixed(1)}bb</Text>
                </PressableScale>
              ) : null}
            </View>
          </>
        ) : showdown && controller.finished ? (
          <PrimaryButton title={it.report.title} onPress={goReport} testID="go-report" />
        ) : showdown ? (
          <PrimaryButton title="Prossima mano" onPress={nextHand} testID="next-hand" />
        ) : null}
      </View>

      <VerdictSheet
        visible={showVerdict}
        grade={controller.lastGrade}
        decision={controller.lastDecision}
        score={controller.score}
        villainPct={controller.lastDecision ? controller.villainRangePercent(villains.find((v) => !v.folded)?.index ?? 1) : 0}
        onReview={(lesson) => {
          setShowVerdict(false);
          router.push(`/lesson/${lesson}`);
        }}
        onContinue={onVerdictContinue}
      />

      <RangeReadModal
        visible={controller.pendingRangeReadSeat != null && !showVerdict}
        onSubmit={(w) => {
          controller.submitRangeRead(w);
          bump();
        }}
        onSkip={() => {
          controller.skipRangeRead();
          bump();
        }}
      />
    </View>
  );
}

function fmt(c: any): string | undefined {
  if (!c) return undefined;
  return "23456789TJQKA"[c.rank - 2] + "cdhs"[c.suit];
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.felt },
  scorePill: { color: c.reward, fontSize: 16, fontWeight: "700", ...tabular },
  villains: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  pod: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.sm, alignItems: "center", borderWidth: 1, borderColor: c.border, width: 104, gap: 3 },
  podHead: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  podPos: { color: c.muted, fontSize: 12, fontWeight: "700" },
  podStat: { color: c.muted, fontSize: 9, ...tabular },
  podStack: { color: c.onSurface, fontSize: 12, fontWeight: "600", ...tabular },
  podWon: { color: c.positive, fontSize: 11, fontWeight: "700", ...tabular },
  center: { alignItems: "center", paddingVertical: spacing.md, flex: 1, justifyContent: "center" },
  potLabel: { color: c.onFelt, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, opacity: 0.8 },
  potValue: { color: c.onFelt, fontSize: 24, fontWeight: "700", ...tabular },
  equityHint: { color: c.onFelt, fontSize: 13, marginTop: spacing.sm, fontWeight: "600", ...tabular },
  heroWrap: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  hero: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 2, borderColor: c.border },
  heroPos: { color: c.muted, fontSize: 13, fontWeight: "700" },
  heroStack: { color: c.onSurface, fontSize: 16, fontWeight: "700", ...tabular },
  timerWrap: { marginLeft: "auto" },
  timer: { fontSize: 20, fontWeight: "700", ...tabular },
  log: { maxHeight: 30, marginBottom: spacing.sm },
  logText: { color: c.onFelt, fontSize: 12, opacity: 0.75, ...tabular },
  controls: { backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  sizeRow: { flexDirection: "row", gap: spacing.sm, justifyContent: "center" },
  sizePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, minWidth: 52, alignItems: "center" },
  sizePillText: { color: c.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actionBtn: { flex: 1, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, minHeight: 54 },
  actionText: { fontSize: 15, fontWeight: "700", ...tabular },
  actionSub: { fontSize: 10, fontWeight: "600", marginTop: 2, ...tabular },
}));
