import React, { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Body, Card, Heading, Pill, PrimaryButton, ScreenContainer, SecondaryButton, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { ReduceMotionPref, ThemePref, useApp, VerdictMode } from "@/src/store/appStore";

export default function ProfileScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const profile = useApp((st) => st.profile);
  const setProfile = useApp((st) => st.setProfile);
  const reset = useApp((st) => st.resetProgress);
  const state = useApp();

  const [confirmReset, setConfirmReset] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const exportJson = JSON.stringify({ profile: state.profile, lessonProgress: state.lessonProgress, conceptMastery: state.conceptMastery, sessions: state.sessions.map((x) => ({ ...x, decisions: `${x.decisions.length} decisioni` })) }, null, 2);

  return (
    <ScreenContainer testID="profile-screen">
      <SectionLabel>{it.tabs.profile}</SectionLabel>
      <Heading size="display">{it.profile.title}</Heading>

      <Card style={{ marginTop: spacing.lg }}>
        <SectionLabel>{it.profile.theme}</SectionLabel>
        <View style={s.row}>
          {([["system", it.profile.themeSystem], ["dark", it.profile.themeDark], ["light", it.profile.themeLight]] as [ThemePref, string][]).map(([id, label]) => (
            <Pill key={id} label={label} active={profile.theme === id} onPress={() => setProfile({ theme: id })} testID={`theme-${id}`} />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.profile.verdictMode}</SectionLabel>
        <View style={s.row}>
          {([["coach", it.profile.verdictImmediate], ["scoreOnly", it.profile.verdictScoreOnly], ["silent", it.profile.verdictDeferred]] as [VerdictMode, string][]).map(([id, label]) => (
            <Pill key={id} label={label} active={profile.verdictMode === id} onPress={() => setProfile({ verdictMode: id })} testID={`verdict-${id}`} />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>{it.profile.timer}</SectionLabel>
        <View style={s.row}>
          {[15, 25, 45].map((n) => (
            <Pill key={n} label={`${n}s`} active={profile.timerSec === n} onPress={() => setProfile({ timerSec: n })} testID={`timer-${n}`} />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }} testID="reduce-motion-card">
        <SectionLabel>{it.profile.reduceMotion}</SectionLabel>
        <View style={s.row}>
          {([["system", it.profile.reduceSystem], ["on", it.profile.reduceOn], ["off", it.profile.reduceOff]] as [ReduceMotionPref, string][]).map(([id, label]) => (
            <Pill key={id} label={label} active={profile.reduceMotion === id} onPress={() => setProfile({ reduceMotion: id })} testID={`reduce-motion-${id}`} />
          ))}
        </View>
        <Body muted style={{ marginTop: spacing.sm, fontSize: 12 }}>{it.profile.reduceMotionHint}</Body>
      </Card>

      <Card style={{ marginTop: spacing.md }} onPress={() => router.push("/glossary")} testID="open-glossary">
        <Text style={s.link}>{it.profile.glossary} →</Text>
      </Card>

      <View style={{ marginTop: spacing.md, gap: spacing.md }}>
        <SecondaryButton title={it.profile.exportData} onPress={() => setShowExport(true)} testID="export-data" />
        <SecondaryButton title={it.profile.resetProgress} onPress={() => setConfirmReset(true)} testID="reset-progress" />
      </View>

      <Card style={{ marginTop: spacing.xl, borderColor: colors.warning, borderWidth: 1 }}>
        <SectionLabel>{it.profile.responsibleTitle}</SectionLabel>
        <Body muted style={{ marginTop: 4, fontSize: 13 }}>{it.profile.responsibleBody}</Body>
      </Card>

      <Modal visible={confirmReset} transparent animationType="fade" onRequestClose={() => setConfirmReset(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Heading size="h2">{it.profile.resetProgress}</Heading>
            <Body muted style={{ marginTop: spacing.sm }}>{it.profile.resetConfirm}</Body>
            <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
              <PrimaryButton title={it.common.confirm} tone="danger" onPress={() => { reset(); setConfirmReset(false); }} testID="reset-confirm" />
              <SecondaryButton title={it.common.cancel} onPress={() => setConfirmReset(false)} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showExport} transparent animationType="slide" onRequestClose={() => setShowExport(false)}>
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { maxHeight: "80%" }]}>
            <Heading size="h2">{it.profile.exportData}</Heading>
            <ScrollView style={{ marginVertical: spacing.md }}>
              <Text selectable style={s.json}>{exportJson}</Text>
            </ScrollView>
            <SecondaryButton title={it.common.close} onPress={() => setShowExport(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" },
  link: { color: c.interactive, fontSize: 15, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: "center", padding: spacing.xl },
  modalCard: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: spacing.xl, borderWidth: 1, borderColor: c.border },
  json: { color: c.muted, fontSize: 11, fontFamily: "monospace" },
}));
