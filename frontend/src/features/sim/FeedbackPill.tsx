// Non-blocking in-game feedback: a compact, tappable pill that auto-dismisses
// after 4 s while the game keeps running, plus the review-queue sheet.
import React, { useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, radius, spacing, tabular, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { DecisionRecord } from "@/src/store/appStore";
import { PressableScale, useMotionEnabled } from "@/src/ui/motion";
import { haptic } from "@/src/ui/haptics";
import { ShortFeedback } from "./causes";

const PILL_MS = 4000;

const fmtPts = (p: number) => (p > 0 ? `+${p.toFixed(1)}` : p < 0 ? `−${Math.abs(p).toFixed(1)}` : "0,0").replace(".", ",");

export function useTone(verdict: ShortFeedback["verdict"]) {
  const { colors } = useTheme();
  if (verdict === "correct") return { bg: colors.progress, fg: colors.onSuccess, icon: "✓" };
  if (verdict === "imprecise") return { bg: colors.warning, fg: colors.onWarning, icon: "!" };
  return { bg: colors.error, fg: colors.onError, icon: "✕" };
}

export function FeedbackPill({ feedback, onPress, onExpire }: { feedback: ShortFeedback; onPress?: () => void; onExpire: () => void }) {
  const s = useStyles();
  const tone = useTone(feedback.verdict);
  const motion = useMotionEnabled();
  useEffect(() => {
    if (feedback.verdict === "correct") haptic.light();
    else haptic.medium();
    const t = setTimeout(onExpire, PILL_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View entering={motion ? FadeInUp.duration(180) : undefined} exiting={motion ? FadeOutUp.duration(160) : undefined} style={s.pillWrap} pointerEvents="box-none">
      <Pressable onPress={onPress} disabled={!onPress} testID="feedback-pill" accessibilityRole="button" style={[s.pill, { borderColor: tone.bg }]}>
        <View style={[s.pillIcon, { backgroundColor: tone.bg }]}>
          <Text style={[s.pillIconText, { color: tone.fg }]}>{tone.icon}</Text>
        </View>
        <Text style={s.pillText} numberOfLines={1}>
          <Text style={[s.pillPts, { color: tone.bg }]}>{fmtPts(feedback.points)}</Text> · {feedback.cause}
        </Text>
        {onPress ? <Text style={s.pillChevron}>›</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

export interface QueueItem {
  index: number;
  decision: DecisionRecord;
  feedback: ShortFeedback;
}

export function ReviewQueueSheet({ visible, items, onClose, onOpen }: { visible: boolean; items: QueueItem[]; onClose: () => void; onOpen: (index: number) => void }) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]} testID="review-queue-sheet">
          <View style={s.grabber} />
          <Text style={s.sheetTitle}>{it.sim.reviewQueue} · {items.length}</Text>
          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {items.map((q) => {
              const c = q.feedback.verdict === "imprecise" ? colors.warning : colors.error;
              return (
                <Pressable key={q.index} onPress={() => onOpen(q.index)} style={s.item} testID={`queue-item-${q.index}`}>
                  <Text style={[s.itemPts, { color: c }]}>{q.feedback.verdict === "imprecise" ? "! " : "✕ "}{fmtPts(q.feedback.points)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemCause}>{q.feedback.cause}</Text>
                    <Text style={s.itemMeta}>{it.sim.handOf(q.decision.handIndex + 1, 0).replace(" di 0", "")} · {q.decision.street} · {q.decision.heroCards.join(" ")}</Text>
                  </View>
                  <Text style={s.pillChevron}>›</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <PressableScale onPress={onClose} style={s.closeBtn} testID="review-queue-close">
            <Text style={s.closeText}>{it.sim.resume}</Text>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  pillWrap: { position: "absolute", left: spacing.md, right: spacing.md, top: 118, zIndex: 20, alignItems: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.pill, borderWidth: 1, paddingVertical: 8, paddingLeft: 8, paddingRight: 14, maxWidth: "100%", minHeight: 44 },
  pillIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  pillIconText: { fontSize: 14, fontWeight: "800" },
  pillText: { color: c.onSurface, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  pillPts: { fontWeight: "800", ...tabular },
  pillChevron: { color: c.muted, fontSize: 18, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: spacing.xl },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: spacing.md },
  sheetTitle: { color: c.onSurface, fontSize: 18, fontWeight: "700", marginBottom: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider, minHeight: 48 },
  itemPts: { fontSize: 15, fontWeight: "800", width: 64, ...tabular },
  itemCause: { color: c.onSurface, fontSize: 14 },
  itemMeta: { color: c.muted, fontSize: 12, marginTop: 2, ...tabular },
  closeBtn: { marginTop: spacing.md, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", backgroundColor: c.interactive, minHeight: 48 },
  closeText: { color: c.onInteractive, fontSize: 15, fontWeight: "700" },
}));
