import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function SettingsScreen() {
  const { colors, theme, setTheme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>Настройки</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>Выберите тему оформления.</Text>

        <View style={{ height: 12 }} />

        <Pressable
          onPress={() => setTheme("dark")}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: theme === "dark" ? colors.primary : colors.border,
              backgroundColor: theme === "dark" ? colors.primarySoft : colors.surface,
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Тёмная</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>Контрастная и спокойная.</Text>
          </View>
          {theme === "dark" ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
        </Pressable>

        <Pressable
          onPress={() => setTheme("light")}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: theme === "light" ? colors.primary : colors.border,
              backgroundColor: theme === "light" ? colors.primarySoft : colors.surface,
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Светлая</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>Более светлая и нейтральная.</Text>
          </View>
          {theme === "light" ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 12 },
  card: { borderRadius: 18, padding: 14, borderWidth: 1 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },

  option: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionTitle: { fontSize: 15, fontWeight: "900" },
  optionText: { marginTop: 4, lineHeight: 18 },
});
