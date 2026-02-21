import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import { colors } from "./theme";

export function PrimaryButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors, theme } = useAppTheme();
  const { title, onPress, disabled, loading } = props;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: colors.primary, },
        (disabled || loading) && { opacity: 0.55 },
        pressed && { transform: [{ scale: 0.985 }], opacity: theme === "dark" ? 0.95 : 0.9 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={[styles.btnText, { color: "#FFFFFF" }]}>{title}</Text>
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
        { borderColor: colors.border, backgroundColor: colors.surface },
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
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const { name, onPress, tone = "default", disabled } = props;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          borderColor: tone === "danger" ? colors.dangerSoft : colors.border,
          backgroundColor: tone === "danger" ? colors.dangerSoft : colors.surface,
        },
        disabled && { opacity: 0.5 },
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
      ? colors.dangerSoft
      : tone === "muted"
        ? colors.surface
        : colors.primarySoft;

  const border =
    tone === "danger"
      ? colors.dangerSoft
      : tone === "muted"
        ? colors.border
        : colors.primarySoft;

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

export function LoadingState(props: { label?: string }) {
  const { colors } = useAppTheme();
  const { label } = props;

  return (
    <View style={[styles.loadingWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <ActivityIndicator color={colors.primary} />
      {label ? <Text style={[styles.loadingText, { color: colors.muted }]}>{label}</Text> : null}
    </View>
  );
}

export function LoadingOverlay(props: { visible: boolean; label?: string }) {
  const { colors } = useAppTheme();
  const { visible, label } = props;

  if (!visible) return null;

  return (
    <View style={styles.overlayBackdrop}>
      <View style={[styles.overlayCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>{label ?? "Loading..."}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 15, fontWeight: "900", letterSpacing: 0.2, color: colors.bg },

  ghost: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
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
  loadingWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  overlayCard: {
    minWidth: 180,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
