import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, SectionLabel } from "@/src/ui/components";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { it } from "@/src/i18n/it";
import { GLOSSARY } from "@/src/content/glossary";
import { LESSONS } from "@/src/content/curriculum";
import { useApp } from "@/src/store/appStore";
import { stripTerms } from "@/src/ui/RichText";
import { HeaderBar } from "@/src/ui/header";
import { ScrollView } from "react-native-gesture-handler";

export default function GlossaryScreen() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q ? String(q) : "");
  const saved = useApp((st) => st.savedTakeaways);
  const savedRules = LESSONS.filter((l) => saved.includes(l.id)).map((l) => {
    const tk = l.slides.flatMap((sl) => sl.blocks).find((b) => b.kind === "takeaway");
    return { id: l.id, title: l.title, text: tk && tk.kind === "takeaway" ? stripTerms(tk.text) : "" };
  }).filter((r) => r.text && (!query || r.text.toLowerCase().includes(query.toLowerCase()) || r.title.toLowerCase().includes(query.toLowerCase())));

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
        {savedRules.length > 0 ? (
          <View style={{ marginBottom: spacing.lg }} testID="saved-rules">
            <SectionLabel>{it.glossary.savedRules}</SectionLabel>
            {savedRules.map((r) => (
              <Card key={r.id} style={{ marginTop: spacing.sm, borderColor: colors.positive }} onPress={() => router.push(`/lesson/${r.id}`)} testID={`saved-rule-${r.id}`}>
                <SectionLabel>{r.id} · {r.title}</SectionLabel>
                <Text style={s.term}>✓ {r.text}</Text>
              </Card>
            ))}
          </View>
        ) : null}
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
