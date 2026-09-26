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
import { CountUp, FlashView, PressableScale } from "@/src/ui/motion";
import { FeedbackPill, ReviewQueueSheet } from "@/src/features/sim/FeedbackPill";
import { ShortFeedback, shortFeedback } from "@/src/features/sim/causes";

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
const fmt2 = (v: number) => v.toFixed(2);

export default function TableScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const controller = useSim((st) => st.controller);
  const bump = useSim((st) => st.bump);
  const tick = useSim((st) => st.tick);
  const finalize = useSim((st) => st.finalize);

  // Live-game UI state: deep dive / queue pause the game; the pill never does.
  const [deepDive, setDeepDive] = useState<number | null>(null); // index into controller.decisions
  const [queueOpen, setQueueOpen] = useState(false);
  const [pill, setPill] = useState<{ key: string; fb: ShortFeedback; index: number | null } | null>(null);
  const [scoreFlash, setScoreFlash] = useState<{ key: number; color: string } | null>(null);
  const [betTo, setBetTo] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);

  const st = controller?.state;
  const hero = st ? heroSeat(st) : null;
  const rated = controller?.cfg.mode === "rated";
  const feedbackMode = controller?.cfg.verdictMode ?? "coach";
  const showScore = rated && feedbackMode !== "silent";
  const showPills = rated && feedbackMode === "coach";
  const paused = deepDive != null || queueOpen || (controller?.pendingRangeReadSeat != null);
  const heroToAct = !!(controller && controller.heroToAct() && !paused);
  const la = heroToAct && st ? legalActions(st) : null;

  const nodeKey = st ? `${st.handSeed}-${st.street}-${st.log.length}-${st.toAct}` : "none";

  // Live runner: bots act one at a time with 400–900 ms delays; showdown is shown ~1.5 s,
  // then the next hand starts by itself. Pausing simply cancels the pending timer, so
  // resuming continues from the exact same state.
  useEffect(() => {
    if (!controller || paused) return;
    if (controller.finished) {
      const t = setTimeout(goReport, 1600);
      return () => clearTimeout(t);
    }
    if (controller.state.finished) {
      const t = setTimeout(() => {
        controller.nextHand();
        bump();
      }, 1500);
      return () => clearTimeout(t);
    }
    if (!controller.botToAct()) return;
    const t = setTimeout(() => {
      controller.botStep();
      bump();
    }, 400 + Math.floor(Math.random() * 500));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, paused, tick]);

  // reset bet selection on new node; start the EV computation in background while the player thinks
  useEffect(() => {
    setBetTo(null);
    if (heroToAct) controller?.precomputeEv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, heroToAct]);

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
    if (!rated) return;
    const idx = controller.decisions.length - 1;
    const grade = controller.grades[idx];
    const dec = controller.decisions[idx];
    const fb = shortFeedback(grade, dec);
    const tone = fb.verdict === "correct" ? colors.progress : fb.verdict === "imprecise" ? colors.warning : colors.error;
    if (feedbackMode !== "silent") setScoreFlash({ key: idx, color: tone });
    if (showPills) setPill({ key: `d${idx}`, fb, index: idx });
    if (feedbackMode !== "silent" && controller.score < 60 && !controller.scoreWarningShown) {
      controller.scoreWarningShown = true;
      setTimeout(() => setPill({ key: "warn60", fb: { verdict: "imprecise", points: 0, cause: it.sim.scoreWarning }, index: null }), 4200);
    }
  }

  function goReport() {
    finalize();
    router.replace("/report");
  }

  const stack = hero?.stack ?? 0;
  const queue = controller ? controller.reviewQueue() : [];

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
        title={paused ? it.sim.paused : it.tabs.sim}
        onBack={() => router.back()}
        tint={colors.onFelt}
        right={
          queue.length > 0 && feedbackMode !== "silent" ? (
            <PressableScale testID="review-queue-badge" onPress={() => setQueueOpen(true)} style={s.queueBadge}>
              <Text style={s.queueBadgeText}>{it.sim.toReview(queue.length)}</Text>
            </PressableScale>
          ) : undefined
        }
      />

      {/* Persistent score bar */}
      <FlashView trigger={scoreFlash?.key ?? null} color={scoreFlash?.color ?? colors.progress} radius={radius.md} style={s.scoreBarWrap}>
        <View style={s.scoreBar} testID="score-bar">
          {showScore ? (
            <View style={s.scoreCell}>
              <Text style={s.scoreLabel}>{it.sim.score.toUpperCase()}</Text>
              <CountUp value={controller.score} format={fmt2} style={s.scoreValue} testID="table-score" />
            </View>
          ) : null}
          <View style={s.scoreCell}>
            <Text style={s.scoreLabel}>{it.sim.hands.toUpperCase()}</Text>
            <Text style={s.scoreMeta} testID="table-hands">{Math.min(controller.handIndex + 1, controller.cfg.handsPlanned)}/{controller.cfg.handsPlanned}</Text>
          </View>
          <View style={s.scoreCell}>
            <Text style={s.scoreLabel}>STACK</Text>
            <CountUp value={stack} format={fmtBb1} style={s.scoreMeta} />
          </View>
        </View>
      </FlashView>

      {/* Non-blocking feedback pill (auto-dismiss 4 s, tap = deep dive) */}
      {pill ? (
        <FeedbackPill
          key={pill.key}
          feedback={pill.fb}
          onPress={pill.index != null ? () => { setPill(null); setDeepDive(pill.index); } : undefined}
          onExpire={() => setPill((p) => (p?.key === pill.key ? null : p))}
        />
      ) : null}

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
        ) : (
          <Text style={s.waiting} testID="table-waiting">{showdown ? "Showdown…" : paused ? it.sim.paused : "…"}</Text>
        )}
      </View>

      <VerdictSheet
        visible={deepDive != null}
        grade={deepDive != null ? controller.grades[deepDive] : null}
        decision={deepDive != null ? controller.decisions[deepDive] : null}
        score={controller.score}
        villainPct={0}
        onReview={(lesson) => {
          setDeepDive(null);
          router.push(`/lesson/${lesson}`);
        }}
        onContinue={() => setDeepDive(null)}
      />
      <ReviewQueueSheet
        visible={queueOpen}
        items={queue.map((d) => ({ index: controller.decisions.indexOf(d), decision: d, feedback: shortFeedback(controller.grades[controller.decisions.indexOf(d)], d) }))}
        onClose={() => setQueueOpen(false)}
        onOpen={(i) => {
          setQueueOpen(false);
          setDeepDive(i);
        }}
      />
      <RangeReadModal
        visible={controller.pendingRangeReadSeat != null && deepDive == null}
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
  scoreBarWrap: { marginHorizontal: spacing.md, marginTop: spacing.xs },
  scoreBar: { flexDirection: "row", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.md, alignItems: "center" },
  scoreCell: { flex: 1 },
  scoreLabel: { color: c.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  scoreValue: { color: c.reward, fontSize: 22, fontWeight: "800", ...tabular },
  scoreMeta: { color: c.onSurface, fontSize: 16, fontWeight: "700", ...tabular },
  queueBadge: { backgroundColor: c.warning, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  queueBadgeText: { color: c.onWarning, fontSize: 12, fontWeight: "800" },
  waiting: { color: c.muted, textAlign: "center", fontSize: 13, paddingVertical: spacing.md },
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
