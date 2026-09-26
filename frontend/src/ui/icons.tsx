import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export function IconStudy({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5v-12Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M20 5.5C20 4.7 19.3 4 18.5 4H13v15h5.5c.8 0 1.5-.7 1.5-1.5v-12Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSim({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={11} height={15} rx={2} stroke={color} strokeWidth={1.8} transform="rotate(-8 8.5 12.5)" />
      <Rect x={10} y={4} width={11} height={15} rx={2} fill="none" stroke={color} strokeWidth={1.8} transform="rotate(8 15.5 11.5)" />
    </Svg>
  );
}

export function IconStats({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20V4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M4 20h16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Rect x={7} y={12} width={3} height={5} rx={1} fill={color} />
      <Rect x={12} y={8} width={3} height={9} rx={1} fill={color} />
      <Rect x={17} y={5} width={3} height={12} rx={1} fill={color} />
    </Svg>
  );
}

export function IconProfile({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function IconHome({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19v-8Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M10 20v-6h4v6" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export function IconFlame({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2c1 4 5 5.5 5 11a5 5 0 01-10 0c0-2 .8-3.5 2-4.5.2 1.5 1 2.5 2 2.5 0-3 0-6 1-9Z" fill={color} />
    </Svg>
  );
}

export function IconChevron({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconLock({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M8 11V8a4 4 0 018 0v3" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}
