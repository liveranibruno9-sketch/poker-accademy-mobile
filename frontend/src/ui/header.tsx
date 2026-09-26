import React from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export function HeaderBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={s.bar}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} testID="header-back" style={s.backBtn}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={colors.onSurface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      ) : (
        <View style={s.backBtn} />
      )}
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <View style={s.right}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: c.onSurface, fontSize: 17, fontWeight: "700" },
  right: { minWidth: 40, alignItems: "flex-end" },
}));
