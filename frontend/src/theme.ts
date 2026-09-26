// Design tokens for Poker Academy. Dark-first (default), with a full light theme.
// Palette from the brief (section 4). Every color used in components comes from here.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

// Token semantics (one meaning per token, app-wide):
//   brandPrimary  -> primary CTA only (gold)
//   interactive   -> links, focus, selection, "who acts" cues
//   reward        -> session score / points / currency
//   progress      -> progression, XP, progress bars
//   rare          -> levels, unlocks, achievements (max 1 screen in 5)
//   streak        -> daily streak
//   highlight     -> numeric data emphasis inside content (never running text)
//   felt/feltCenter -> the playing surface only (dark green in both themes)
const dark = {
  // Surfaces
  surface: "#0A0E14", // app background
  onSurface: "#EEF2F8", // off-white primary text
  surfaceSecondary: "#121826", // cards / sheets / sub-header
  onSurfaceSecondary: "#EEF2F8",
  surfaceTertiary: "#1B2436", // deepest fills, tracks
  onSurfaceTertiary: "#9AA7BD",
  surfaceInverse: "#EEF2F8",
  onSurfaceInverse: "#0F1622",
  muted: "#9AA7BD", // grey labels, secondary text

  // Brand / accent
  brand: "#FFC53D",
  onBrand: "#1A1206",
  brandPrimary: "#FFC53D", // gold, primary CTA
  onBrandPrimary: "#1A1206",
  brandSecondary: "#1B2436",
  onBrandSecondary: "#EEF2F8",
  brandTertiary: "#23304A", // chips, tags
  onBrandTertiary: "#9AA7BD",

  // Status
  success: "#22D3A6",
  onSuccess: "#04231A",
  warning: "#FFA23A",
  onWarning: "#241200",
  error: "#FF4D5E",
  onError: "#FFFFFF",
  info: "#4EA8FF",
  onInfo: "#04121F",

  // Lines
  border: "#1F2A3D",
  borderStrong: "#4EA8FF",
  divider: "#1A2333",

  // Custom app tokens
  highlight: "#4EA8FF", // data highlight
  felt: "#0E3B2E", // table felt (edge)
  feltCenter: "#14523D", // table felt (center of radial gradient)
  onFelt: "#EEF2F8", // text drawn directly on the felt (both themes)
  cardFace: "#FFFFFF",
  cardRed: "#FF4D5E",
  cardBlack: "#0F1622",
  positive: "#22D3A6",
  negative: "#FF4D5E",

  // Game-feel tokens
  reward: "#FFC53D",
  onReward: "#1A1206",
  progress: "#22D3A6",
  rare: "#A855F7",
  streak: "#FF7A1A",
  interactive: "#4EA8FF",
  onInteractive: "#04121F",
  scrim: "#000000A6", // modal backdrop
};

const light: typeof dark = {
  surface: "#F7F9FC",
  onSurface: "#0F1622",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#0F1622",
  surfaceTertiary: "#EEF2F8",
  onSurfaceTertiary: "#5A6A82",
  surfaceInverse: "#0F1622",
  onSurfaceInverse: "#F7F9FC",
  muted: "#5A6A82",

  brand: "#B8860B",
  onBrand: "#FFFFFF",
  brandPrimary: "#B8860B",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#EEF2F8",
  onBrandSecondary: "#0F1622",
  brandTertiary: "#E3E9F2",
  onBrandTertiary: "#0F1622",

  success: "#0F9B7A",
  onSuccess: "#FFFFFF",
  warning: "#D98218",
  onWarning: "#241200", // white on #D98218 is 2.9:1; dark ink keeps 6.5:1
  error: "#D2394A",
  onError: "#FFFFFF",
  info: "#2E6BB0",
  onInfo: "#FFFFFF",

  border: "#D5DDE8",
  borderStrong: "#2E6BB0",
  divider: "#E3E9F2",

  highlight: "#2E6BB0",
  felt: "#0E3B2E", // playing surface stays dark green in light theme
  feltCenter: "#14523D",
  onFelt: "#EEF2F8",
  cardFace: "#FFFFFF",
  cardRed: "#D2394A",
  cardBlack: "#0F1622",
  positive: "#0F9B7A",
  negative: "#D2394A",

  reward: "#B8860B",
  onReward: "#FFFFFF",
  progress: "#0F9B7A",
  rare: "#7C3AED",
  streak: "#D35400",
  interactive: "#2E6BB0",
  onInteractive: "#FFFFFF",
  scrim: "#0F162299",
};

export type ThemeColors = typeof dark;

export const defaultScheme = "dark" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

// Dark-first override that also works where Appearance.setColorScheme is a
// no-op (web). null = follow the system setting.
let schemeOverride: ColorScheme | null = "dark";
export function setThemeOverride(scheme: ColorScheme | null) {
  schemeOverride = scheme;
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = schemeOverride ?? (system && themes[system] ? system : defaultScheme);
  return { scheme, colors: themes[scheme] ?? themes.dark };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Derive a darker/lighter variant of a token at runtime (amount in -1..1).
// Used for the pressed "lip" of primary buttons so no extra literals are needed.
export function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "").slice(0, 6);
  const n = parseInt(h, 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, card: 16, sheet: 24, pill: 999 };
export const tabular = { fontVariant: ["tabular-nums" as const] };
