import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useAppTheme();
  const { title, onPress, disabled, loading } = props;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: colors.primary },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={[styles.btnText, { color: colors.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function GhostButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const { title, onPress, disabled } = props;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghost,
        { borderColor: colors.border },
        disabled && { opacity: 0.55 },
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text style={[styles.ghostText, { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton(props: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  tone?: "default" | "danger";
}) {
  const { colors } = useAppTheme();
  const { name, onPress, tone = "default" } = props;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          borderColor:
            tone === "danger" ? "rgba(239,68,68,0.28)" : colors.border,
          backgroundColor:
            tone === "danger" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons
        name={name}
        size={18}
        color={tone === "danger" ? colors.danger : colors.text}
      />
    </Pressable>
  );
}

export function Pill(props: { label: string; tone?: "default" | "danger" | "muted" }) {
  const { colors } = useAppTheme();
  const { label, tone = "default" } = props;

  const bg =
    tone === "danger"
      ? "rgba(239,68,68,0.08)"
      : tone === "muted"
        ? "rgba(255,255,255,0.03)"
        : "rgba(124,58,237,0.14)";

  const border =
    tone === "danger"
      ? "rgba(239,68,68,0.22)"
      : tone === "muted"
        ? colors.border
        : "rgba(124,58,237,0.22)";

  const text = tone === "muted" ? colors.muted : colors.text;

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.pillText, { color: text }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label }: { label: string }) {
  return <Pill label={label} tone="default" />;
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "900", letterSpacing: 0.2 },

  ghost: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  ghostText: { fontSize: 15, fontWeight: "800", letterSpacing: 0.1 },

  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: "800" },
});