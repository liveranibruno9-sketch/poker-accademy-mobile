import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { GLOSSARY } from "@/src/content/glossary";
import { HeaderBar } from "@/src/ui/header";
import { ScrollView } from "react-native-gesture-handler";

export default function GlossaryScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = GLOSSARY.filter((t) => t.term.toLowerCase().includes(query.toLowerCase()) || t.definition.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <HeaderBar title={it.glossary.title} onBack={() => router.back()} />
      <View style={{ paddingHorizontal: spacing.xl }}>
        <TextInput
          testID="glossary-search"
          value={query}
          onChangeText={setQuery}
          placeholder={it.glossary.searchPlaceholder}
          placeholderTextColor={colors.muted}
          style={s.search}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }} showsVerticalScrollIndicator={false}>
        {filtered.map((t) => (
          <Card key={t.term} style={{ marginBottom: spacing.md }} onPress={t.lesson?.startsWith("L") ? () => router.push(`/lesson/${t.lesson}`) : undefined}>
            <SectionLabel>{t.lesson ?? "TERMINE"}</SectionLabel>
            <Text style={s.term}>{t.term}</Text>
            <Text style={s.def}>{t.definition}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  search: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: spacing.md, color: c.onSurface, fontSize: 15 },
  term: { color: c.onSurface, fontSize: 17, fontWeight: "700", marginTop: 2 },
  def: { color: c.muted, fontSize: 14, lineHeight: 20, marginTop: 4 },
}));
