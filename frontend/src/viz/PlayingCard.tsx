import React from "react";
import { View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "@/src/theme";
import { RANK_CHARS } from "@/src/engine/types";

const SUIT_GLYPH = ["♣", "♦", "♥", "♠"];

export type CardStr = string; // e.g. "As", "Th"

export function parseStr(cs: CardStr): { rank: string; suit: number } {
  const rank = cs[0].toUpperCase();
  const suit = "cdhs".indexOf(cs[1].toLowerCase());
  return { rank, suit };
}

export function PlayingCard({ card, size = "board", faceDown = false }: { card?: CardStr; size?: "hero" | "board" | "villain" | "tiny"; faceDown?: boolean }) {
  const { colors } = useTheme();
  const dims = { hero: [56, 80], board: [48, 68], villain: [34, 48], tiny: [26, 38] }[size];
  const [w, h] = dims;

  if (faceDown || !card) {
    return (
      <Svg width={w} height={h}>
        <Rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={colors.surfaceSecondary} stroke={colors.brandPrimary} strokeWidth={1} />
        <Rect x={5} y={5} width={w - 10} height={h - 10} rx={4} fill="none" stroke={colors.brandTertiary} strokeWidth={1} strokeDasharray="3 3" />
      </Svg>
    );
  }

  const { rank, suit } = parseStr(card);
  const red = suit === 1 || suit === 2;
  const ink = red ? colors.cardRed : colors.cardBlack;
  const fontSize = w * 0.42;
  return (
    <Svg width={w} height={h}>
      <Rect x={1} y={1} width={w - 2} height={h - 2} rx={6} fill={colors.cardFace} stroke={"#00000022"} strokeWidth={1} />
      <SvgText x={w * 0.16} y={h * 0.34} fontSize={fontSize} fontWeight="700" fill={ink} textAnchor="start">
        {rank}
      </SvgText>
      <SvgText x={w * 0.16} y={h * 0.56} fontSize={fontSize * 0.8} fill={ink} textAnchor="start">
        {SUIT_GLYPH[suit]}
      </SvgText>
      <SvgText x={w * 0.82} y={h * 0.9} fontSize={fontSize} fontWeight="700" fill={ink} textAnchor="middle">
        {SUIT_GLYPH[suit]}
      </SvgText>
    </Svg>
  );
}

export function CardRow({ cards, size = "board", gap = 4 }: { cards: (CardStr | undefined)[]; size?: "hero" | "board" | "villain" | "tiny"; gap?: number }) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {cards.map((c, i) => (
        <PlayingCard key={i} card={c} size={size} faceDown={!c} />
      ))}
    </View>
  );
}
