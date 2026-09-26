// Thin haptics wrapper: light on confirmations, medium on important events,
// notification patterns on outcomes. No-op on web and never throws.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS !== "web";
const swallow = () => {};

export const haptic = {
  light: () => (enabled ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow) : undefined),
  medium: () => (enabled ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow) : undefined),
  success: () => (enabled ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow) : undefined),
  warning: () => (enabled ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(swallow) : undefined),
  error: () => (enabled ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(swallow) : undefined),
};
