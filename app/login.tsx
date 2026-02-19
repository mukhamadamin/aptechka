import { Redirect } from "expo-router";
import * as React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../src/entities/session/model/use-auth";
import { loginWithEmail, registerWithEmail } from "../src/features/auth/api/auth-service";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { PrimaryButton } from "../src/ui/components";

type AuthMode = "login" | "register";

export default function LoginScreen() {
  const { user, loading } = useAuth();
  const { colors, theme } = useAppTheme();

  const [mode, setMode] = React.useState<AuthMode>("login");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  if (!loading && user) {
    return <Redirect href="/(drawer)" />;
  }

  const onSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@") || password.length < 6) {
      Alert.alert("Check your input", "Please provide a valid email and a password with at least 6 characters.");
      return;
    }

    if (mode === "register" && displayName.trim().length < 2) {
      Alert.alert("Check your input", "Name must be at least 2 characters.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        await loginWithEmail(normalizedEmail, password);
      } else {
        await registerWithEmail({
          email: normalizedEmail,
          password,
          displayName: displayName.trim(),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Home Aid Kit</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Sign in to store and sync your data with Firebase.</Text>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode("login")}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: mode === "login" ? colors.primarySoft : colors.surface,
                  borderColor: mode === "login" ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.tabLabel, { color: colors.text }]}>Sign In</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("register")}
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: mode === "register" ? colors.primarySoft : colors.surface,
                  borderColor: mode === "register" ? colors.primary : colors.border,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.tabLabel, { color: colors.text }]}>Register</Text>
            </Pressable>
          </View>

          {mode === "register" ? (
            <Field
              label="Name"
              value={displayName}
              placeholder="For example: Anna"
              onChangeText={setDisplayName}
              colors={colors}
              theme={theme}
            />
          ) : null}

          <Field
            label="Email"
            value={email}
            placeholder="name@example.com"
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            colors={colors}
            theme={theme}
          />

          <Field
            label="Password"
            value={password}
            placeholder="At least 6 characters"
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            colors={colors}
            theme={theme}
          />

          <View style={{ height: 16 }} />
          <PrimaryButton
            title={mode === "login" ? "Sign In" : "Create Account"}
            onPress={onSubmit}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={[styles.label, { color: props.colors.faint }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        placeholder={props.placeholder}
        placeholderTextColor={props.theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
        onChangeText={props.onChangeText}
        autoCapitalize={props.autoCapitalize ?? "sentences"}
        keyboardType={props.keyboardType}
        secureTextEntry={props.secureTextEntry}
        style={[
          styles.input,
          {
            color: props.colors.text,
            borderColor: props.colors.border,
            backgroundColor: props.colors.surface,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: 16 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  title: { fontSize: 24, fontWeight: "900" },
  subtitle: { marginTop: 8, lineHeight: 20 },
  tabs: { marginTop: 16, flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabLabel: { fontSize: 14, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
});
