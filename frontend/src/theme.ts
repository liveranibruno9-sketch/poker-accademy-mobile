// Design tokens for Poker Academy. Dark-first (default), with a full light theme.
// Palette from the brief (section 4). Every color used in components comes from here.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  // Surfaces
  surface: "#0B1D3A", // navy base, app background
  onSurface: "#EEF2F8", // off-white primary text
  surfaceSecondary: "#16305A", // navy 2, cards / sheets / sub-header
  onSurfaceSecondary: "#EEF2F8",
  surfaceTertiary: "#081730", // navy 3, table felt / deepest fills
  onSurfaceTertiary: "#7C8AA5",
  surfaceInverse: "#EEF2F8",
  onSurfaceInverse: "#1A2332",
  muted: "#7C8AA5", // grey labels, secondary text

  // Brand / accent
  brand: "#5B9BD5",
  onBrand: "#08152B",
  brandPrimary: "#5B9BD5", // accent blue, CTA, focus
  onBrandPrimary: "#08152B",
  brandSecondary: "#16305A",
  onBrandSecondary: "#EEF2F8",
  brandTertiary: "#1E3D6E", // chips, tags
  onBrandTertiary: "#8FC0EA",

  // Status
  success: "#1FA971",
  onSuccess: "#FFFFFF",
  warning: "#E0A64B",
  onWarning: "#1A2332",
  error: "#E0574B",
  onError: "#FFFFFF",
  info: "#5B9BD5",
  onInfo: "#08152B",

  // Lines
  border: "#24406B",
  borderStrong: "#5B9BD5",
  divider: "#1B345E",

  // Custom app tokens
  highlight: "#8FC0EA", // light blue, data highlight
  felt: "#081730", // table felt
  cardFace: "#FFFFFF",
  cardRed: "#E0574B",
  cardBlack: "#1A2332",
  positive: "#1FA971",
  negative: "#E0574B",
};

const light: typeof dark = {
  surface: "#EEF2F8",
  onSurface: "#1A2332",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1A2332",
  surfaceTertiary: "#DCE4F0",
  onSurfaceTertiary: "#5A6B85",
  surfaceInverse: "#16305A",
  onSurfaceInverse: "#EEF2F8",
  muted: "#5A6B85",

  brand: "#2E6BB0",
  onBrand: "#FFFFFF",
  brandPrimary: "#2E6BB0",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#DCE4F0",
  onBrandSecondary: "#1A2332",
  brandTertiary: "#DCE4F0",
  onBrandTertiary: "#1A2332",

  success: "#1FA971",
  onSuccess: "#FFFFFF",
  warning: "#C8862B",
  onWarning: "#FFFFFF",
  error: "#D2493C",
  onError: "#FFFFFF",
  info: "#2E6BB0",
  onInfo: "#FFFFFF",

  border: "#CDD8E8",
  borderStrong: "#2E6BB0",
  divider: "#DCE4F0",

  highlight: "#2E6BB0",
  felt: "#C9D6E8",
  cardFace: "#FFFFFF",
  cardRed: "#D2493C",
  cardBlack: "#1A2332",
  positive: "#1FA971",
  negative: "#D2493C",
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

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, card: 16, sheet: 24, pill: 999 };
export const tabular = { fontVariant: ["tabular-nums" as const] };
