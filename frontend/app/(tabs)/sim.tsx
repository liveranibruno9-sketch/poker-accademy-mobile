import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Card, Heading, Pill, PrimaryButton, ScreenContainer, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { useApp, VerdictMode } from "@/src/store/appStore";
import { COMPOSITIONS, useSim } from "@/src/features/sim/simStore";

export default function SimSetup() {
  const s = useStyles();
  const router = useRouter();
  const profile = useApp((st) => st.profile);
  const start = useSim((st) => st.start);

  const [hands, setHands] = useState(20);
  const [comp, setComp] = useState<keyof typeof COMPOSITIONS>("realistic");
  const [stack, setStack] = useState(100);
  const [mode, setMode] = useState<"rated" | "training">("rated");
  const [hud, setHud] = useState(profile.hudEnabled);

  const [feedback, setFeedback] = useState<VerdictMode>(["coach", "scoreOnly", "silent"].includes(profile.verdictMode) ? profile.verdictMode : "coach");
  const onStart = () => {
    start({
      handsPlanned: hands,
      villainProfiles: COMPOSITIONS[comp].profiles,
      stackBb: stack,
      mode,
      hudEnabled: hud,
      timerSec: profile.timerSec,
      verdictMode: feedback,
      seed: `sess-${Date.now()}`,
      live: true,
    });
    router.push("/table");
  };

  return (
    <ScreenContainer testID="sim-setup-screen">
      <SectionLabel>{it.tabs.sim}</SectionLabel>
      <Heading size="display">{it.sim.setupTitle}</Heading>
      <Body muted style={{ marginTop: spacing.sm }}>{it.sim.setupHint}</Body>

      <Card style={{ marginTop: spacing.lg }}>
        <SectionLabel>{it.sim.mode}</SectionLabel>
        <View style={s.row}>
          <Pill label={it.sim.rated} active={mode === "rated"} onPress={() => setMode("rated")} testID="mode-rated" />
          <Pill label={it.sim.training} active={mode === "training"} onPress={() => setMode("training")} testID="mode-training" />
        </View>
        <Body muted style={{ marginTop: spacing.sm, fontSize: 13 }}>
          {mode === "rated" ? "Parti da 100 punti. Conta la decisione, non il piatto vinto." : "Nessun punteggio, equity visibile, timer spento."}
        </Body>
      </Card>

      {mode === "rated" ? (
        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>{it.sim.feedbackMode}</SectionLabel>
          <View style={s.row}>
            {([["coach", it.profile.verdictImmediate], ["scoreOnly", it.profile.verdictScoreOnly], ["silent", it.profile.verdictDeferred]] as [VerdictMode, string][]).map(([id, label]) => (
              <Pill key={id} label={label} active={feedback === id} onPress={() => setFeedback(id)} testID={`feedback-${id}`} />
            ))}
          </View>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.sim.hands}</SectionLabel>
        <View style={s.row}>
          {[10, 20, 50].map((n) => (
            <Pill key={n} label={String(n)} active={hands === n} onPress={() => setHands(n)} testID={`hands-${n}`} />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.sim.composition}</SectionLabel>
        <View style={s.row}>
          {(Object.keys(COMPOSITIONS) as (keyof typeof COMPOSITIONS)[]).map((k) => (
            <Pill key={k} label={COMPOSITIONS[k].label} active={comp === k} onPress={() => setComp(k)} testID={`comp-${k}`} />
          ))}
        </View>
        <Text style={s.compProfiles}>{COMPOSITIONS[comp].profiles.join(" · ")}</Text>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.sim.stack} (bb)</SectionLabel>
        <View style={s.row}>
          {[40, 100, 200].map((n) => (
            <Pill key={n} label={String(n)} active={stack === n} onPress={() => setStack(n)} testID={`stack-${n}`} />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.sim.hud}</SectionLabel>
        <View style={s.row}>
          <Pill label="On" active={hud} onPress={() => setHud(true)} testID="hud-on" />
          <Pill label="Off" active={!hud} onPress={() => setHud(false)} testID="hud-off" />
        </View>
      </Card>

      <View style={{ height: spacing.xl }} />
      <PrimaryButton title={it.sim.startSession} onPress={onStart} testID="start-session" />
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" },
  compProfiles: { color: c.muted, fontSize: 13, marginTop: spacing.sm, fontWeight: "600" },
}));
