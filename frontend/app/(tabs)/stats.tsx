import React, { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { Body, Card, Heading, Pill, ScreenContainer, SectionLabel, StatValue } from "@/src/ui/components";
import { makeStyles, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { averageScore, useApp } from "@/src/store/appStore";
import { ScoreTimeline } from "@/src/viz/charts";
import { ERROR_META } from "@/src/engine/grading";
import { ALL_CONCEPTS } from "@/src/content/curriculum";

const REF_BANDS: Record<string, [number, number]> = { VPIP: [20, 26], PFR: [16, 22], "3bet": [6, 10], "Fold to c-bet": [40, 55] };

export default function StatsScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const sessions = useApp((st) => st.sessions);
  const conceptMastery = useApp((st) => st.conceptMastery);
  const [tab, setTab] = useState<"dash" | "leaks" | "stats" | "concepts" | "position">("dash");

  const allDecisions = useMemo(() => sessions.flatMap((x) => x.decisions), [sessions]);
  const timelineW = width - spacing.xl * 2 - spacing.lg * 2;

  if (sessions.length === 0) {
    return (
      <ScreenContainer testID="stats-screen">
        <SectionLabel>{it.tabs.stats}</SectionLabel>
        <Heading size="display">{it.stats.title}</Heading>
        <Card style={{ marginTop: spacing.xl }}>
          <Body muted>{it.stats.noData}</Body>
        </Card>
      </ScreenContainer>
    );
  }

  const avg = averageScore(sessions, 10);
  const totalHands = sessions.reduce((a, x) => a + x.handsPlayed, 0);
  const evLostTotal = allDecisions.reduce((a, d) => a + d.deltaEvBb, 0);

  // leaks
  const byClass: Record<string, { points: number; count: number }> = {};
  for (const d of allDecisions) if (d.errorCode) {
    byClass[d.errorCode] = byClass[d.errorCode] ?? { points: 0, count: 0 };
    byClass[d.errorCode].points += d.pointsLost;
    byClass[d.errorCode].count += 1;
  }
  const leaks = Object.entries(byClass).sort((a, b) => b[1].points - a[1].points);
  const maxLeak = Math.max(...leaks.map(([, v]) => v.points), 1);

  // hero stats (approx from preflop decisions)
  const preflop = allDecisions.filter((d) => d.street === "preflop");
  const handsPf = new Set(preflop.map((d) => d.handSeed)).size || 1;
  const vpipN = preflop.filter((d) => /Call|Raise|Bet/.test(d.chosenLabel)).length;
  const pfrN = preflop.filter((d) => /Raise|Bet/.test(d.chosenLabel)).length;
  const heroStats = { VPIP: Math.round((vpipN / handsPf) * 100), PFR: Math.round((pfrN / handsPf) * 100) };

  // position
  const byPos: Record<string, { pts: number; n: number }> = {};
  for (const d of allDecisions) {
    byPos[d.heroPosition] = byPos[d.heroPosition] ?? { pts: 0, n: 0 };
    byPos[d.heroPosition].pts += d.pointsLost;
    byPos[d.heroPosition].n += 1;
  }

  return (
    <ScreenContainer testID="stats-screen">
      <SectionLabel>{it.tabs.stats}</SectionLabel>
      <Heading size="display">{it.stats.title}</Heading>

      <View style={s.tabRow}>
        <Pill label={it.stats.tabDashboard} active={tab === "dash"} onPress={() => setTab("dash")} />
        <Pill label={it.stats.tabLeaks} active={tab === "leaks"} onPress={() => setTab("leaks")} />
        <Pill label={it.stats.tabStats} active={tab === "stats"} onPress={() => setTab("stats")} />
        <Pill label={it.stats.tabConcepts} active={tab === "concepts"} onPress={() => setTab("concepts")} />
        <Pill label={it.stats.tabPosition} active={tab === "position"} onPress={() => setTab("position")} />
      </View>

      {tab === "dash" ? (
        <>
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}><StatValue label={it.stats.avgLast10} value={avg != null ? avg.toFixed(1) : "—"} accent /></View>
            <View style={{ flex: 1 }}><StatValue label={it.stats.totalHands} value={String(totalHands)} /></View>
          </View>
          <Card style={{ marginTop: spacing.md }}>
            <SectionLabel>Punteggio per sessione</SectionLabel>
            <ScoreTimeline timeline={sessions.map((x) => x.scoreFinal).reverse()} width={timelineW} />
          </Card>
          <View style={{ marginTop: spacing.md }}>
            <StatValue label={it.report.evPer100} value={(evLostTotal / totalHands * 100).toFixed(0)} />
          </View>
        </>
      ) : null}

      {tab === "leaks" ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>{it.stats.leakRanking}</SectionLabel>
          {leaks.length === 0 ? <Body muted style={{ marginTop: 8 }}>Nessun leak registrato.</Body> : leaks.map(([code, v]) => {
            const meta = ERROR_META[code as keyof typeof ERROR_META];
            return (
              <View key={code} style={{ marginTop: spacing.md }}>
                <View style={s.leakRow}>
                  <Text style={s.leakLabel}>{meta.labelIt}</Text>
                  <Text style={s.leakPts}>−{v.points.toFixed(1)} · {v.count} {it.stats.occurrences}</Text>
                </View>
                <View style={s.barTrack}><View style={[s.barFill, { width: `${(v.points / maxLeak) * 100}%` }]} /></View>
                <Text style={s.leakLesson}>Lezione: {meta.lesson}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {tab === "stats" ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>Le tue stat (osservate)</SectionLabel>
          {Object.entries(heroStats).map(([k, v]) => {
            const band = REF_BANDS[k];
            const inBand = band ? v >= band[0] && v <= band[1] : true;
            return (
              <View key={k} style={s.statRow}>
                <Text style={s.statLabel}>{k}</Text>
                <Text style={s.statVal}><Text style={{ color: inBand ? colors.positive : colors.warning, fontWeight: "800" }}>{inBand ? "✓ " : "! "}</Text>{v}% {band ? `(rif. ${band[0]}–${band[1]}%)` : ""}</Text>
              </View>
            );
          })}
          <Body muted style={{ marginTop: spacing.sm, fontSize: 12 }}>Stat stimate sulle mani giocate: con pochi campioni non sono affidabili.</Body>
        </Card>
      ) : null}

      {tab === "concepts" ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>{it.stats.tabConcepts}</SectionLabel>
          <View style={s.heatWrap}>
            {ALL_CONCEPTS.map((cpt) => {
              const m = conceptMastery[cpt];
              const score = m?.score ?? 0;
              const bg = score >= 60 ? colors.positive : score >= 30 ? colors.warning : colors.surfaceTertiary;
              const glyph = score >= 60 ? "✓" : score >= 30 ? "!" : "–";
              return (
                <View key={cpt} style={[s.heatCell, { backgroundColor: bg + "44", borderColor: bg }]}>
                  <Text style={s.heatLabel}>{cpt}</Text>
                  <Text style={s.heatScore}>{glyph} {score}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {tab === "position" ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>{it.stats.tabPosition}</SectionLabel>
          {["UTG", "HJ", "CO", "BTN", "SB", "BB"].map((pos) => {
            const v = byPos[pos];
            return (
              <View key={pos} style={s.statRow}>
                <Text style={s.statLabel}>{pos}</Text>
                <Text style={s.statVal}>{v ? `−${v.pts.toFixed(1)} pt · ${v.n} dec.` : "—"}</Text>
              </View>
            );
          })}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  leakRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  leakLabel: { color: c.onSurface, fontSize: 14, fontWeight: "600", flex: 1 },
  leakPts: { color: c.negative, fontSize: 13, fontWeight: "700", ...tabular },
  leakLesson: { color: c.muted, fontSize: 12, marginTop: 3 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, backgroundColor: c.negative },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  statLabel: { color: c.onSurface, fontSize: 14, fontWeight: "600" },
  statVal: { color: c.onSurface, fontSize: 14, ...tabular },
  heatWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  heatCell: { borderWidth: 1, borderRadius: 8, padding: spacing.sm, minWidth: 90 },
  heatLabel: { color: c.onSurface, fontSize: 11, fontWeight: "600" },
  heatScore: { color: c.onSurface, fontSize: 18, fontWeight: "700", ...tabular },
}));
