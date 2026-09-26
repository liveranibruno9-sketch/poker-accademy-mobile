import React from "react";
import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { IconProfile, IconSim, IconStats, IconStudy } from "@/src/ui/icons";
import { usesNativeTabs } from "@/src/navigation";

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    const { NativeTabs } = require("expo-router/unstable-native-tabs");
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="book.fill" />
          <NativeTabs.Trigger.Label>{it.tabs.study}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="sim">
          <NativeTabs.Trigger.Icon sf="suit.spade.fill" />
          <NativeTabs.Trigger.Label>{it.tabs.sim}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="stats">
          <NativeTabs.Trigger.Icon sf="chart.bar.fill" />
          <NativeTabs.Trigger.Label>{it.tabs.stats}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person.fill" />
          <NativeTabs.Trigger.Label>{it.tabs.profile}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: it.tabs.study, tabBarIcon: ({ color }) => <IconStudy color={color} /> }} />
      <Tabs.Screen name="sim" options={{ title: it.tabs.sim, tabBarIcon: ({ color }) => <IconSim color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: it.tabs.stats, tabBarIcon: ({ color }) => <IconStats color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: it.tabs.profile, tabBarIcon: ({ color }) => <IconProfile color={color} /> }} />
    </Tabs>
  );
}
