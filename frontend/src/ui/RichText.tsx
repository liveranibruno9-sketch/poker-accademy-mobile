// Text with [[Term]] markup → tappable glossary links (so a technical term is
// never used without a path to its definition).
import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { haptic } from "./haptics";

export function stripTerms(text: string): string {
  return text.replace(/\[\[(.+?)\]\]/g, "$1");
}

export function RichText({ text, style, testID }: { text: string; style?: StyleProp<TextStyle>; testID?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const parts = text.split(/(\[\[.+?\]\])/g).filter(Boolean);
  return (
    <Text style={style} testID={testID}>
      {parts.map((p, i) => {
        const m = p.match(/^\[\[(.+?)\]\]$/);
        if (!m) return <Text key={i}>{p}</Text>;
        const term = m[1];
        return (
          <Text
            key={i}
            accessibilityRole="link"
            testID={`term-${term.toLowerCase().replace(/\s+/g, "-")}`}
            style={{ color: colors.interactive, fontWeight: "700", textDecorationLine: "underline" }}
            onPress={() => {
              haptic.light();
              router.push({ pathname: "/glossary", params: { q: term } });
            }}
          >
            {term}
          </Text>
        );
      })}
    </Text>
  );
}
