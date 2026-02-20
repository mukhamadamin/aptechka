import { Redirect } from "expo-router";
import * as React from "react";
import {
  Alert,
  Keyboard,
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
import { useLanguage } from "../src/i18n/LanguageProvider";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { PrimaryButton } from "../src/ui/components";

type AuthMode = "login" | "register";

export default function LoginScreen() {
  const scrollRef = React.useRef<ScrollView>(null);
  const { user, loading } = useAuth();
  const { colors, theme } = useAppTheme();
  const { t } = useLanguage();

  const [mode, setMode] = React.useState<AuthMode>("login");
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => sub.remove();
  }, []);

  if (!loading && user) {
    return <Redirect href="/(drawer)" />;
  }

  const onSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@") || password.length < 6) {
      Alert.alert(t("auth.checkInput"), t("auth.invalid"));
      return;
    }

    if (mode === "register" && displayName.trim().length < 2) {
      Alert.alert(t("auth.checkInput"), t("auth.nameInvalid"));
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
      const message = error instanceof Error ? error.message : t("auth.requestFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, { paddingBottom: 28 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("auth.title")}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{t("auth.subtitle")}</Text>

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
              <Text style={[styles.tabLabel, { color: colors.text }]}>{t("auth.login")}</Text>
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
              <Text style={[styles.tabLabel, { color: colors.text }]}>{t("auth.register")}</Text>
            </Pressable>
          </View>

          {mode === "register" ? (
            <Field
              label={t("auth.name")}
              value={displayName}
              placeholder={t("auth.namePlaceholder")}
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
            label={t("auth.password")}
            value={password}
            placeholder={t("auth.passwordPlaceholder")}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            colors={colors}
            theme={theme}
          />

          <View style={{ height: 16 }} />
          <PrimaryButton
            title={mode === "login" ? t("auth.signIn") : t("auth.create")}
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
