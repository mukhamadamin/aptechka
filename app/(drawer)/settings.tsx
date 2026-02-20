import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createAndAssignHousehold,
  getHouseholdById,
  joinHouseholdByCode,
} from "../../src/entities/household/api/household-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { logout } from "../../src/features/auth/api/auth-service";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { disableSosShadeShortcut, enableSosShadeShortcut } from "../../src/notifications/sos-shortcut";
import { usePreferences } from "../../src/preferences/PreferencesProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import { PrimaryButton } from "../../src/ui/components";
import { requestPinMedicinesWidget } from "../../src/widgets/widget-pinning";

function localizeError(message: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (message.startsWith("household.")) return t(message);
  return message;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef<ScrollView>(null);
  const { colors, theme, setTheme } = useAppTheme();
  const { user, householdId, refresh } = useHousehold();
  const { language, setLanguage, t } = useLanguage();
  const { showSosInPanel, setShowSosInPanel } = usePreferences();

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [pinningWidget, setPinningWidget] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [currentCode, setCurrentCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    if (!householdId) {
      setCurrentCode(null);
      return;
    }

    (async () => {
      const household = await getHouseholdById(householdId);
      if (!cancelled) {
        setCurrentCode(household?.joinCode ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const onJoin = async () => {
    if (!user) return;

    if (joinCode.trim().length < 4) {
      Alert.alert(t("auth.checkInput"), t("settings.household.invalid"));
      return;
    }

    setJoining(true);
    try {
      const household = await joinHouseholdByCode(user.uid, joinCode);
      refresh();
      setJoinCode("");
      Alert.alert(t("common.ok"), t("settings.household.joined", { code: household.joinCode }));
    } catch (error) {
      const fallback = t("settings.household.joinFail");
      const message = error instanceof Error ? localizeError(error.message, t) : fallback;
      Alert.alert(t("common.error"), message);
    } finally {
      setJoining(false);
    }
  };

  const onCreateHousehold = async () => {
    if (!user) return;

    setCreating(true);
    try {
      const household = await createAndAssignHousehold(user.uid);
      refresh();
      Alert.alert(t("common.ok"), t("settings.household.created", { code: household.joinCode }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.household.createFail");
      Alert.alert(t("common.error"), message);
    } finally {
      setCreating(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.signoutFail");
      Alert.alert(t("common.error"), message);
    } finally {
      setLoggingOut(false);
    }
  };

  const onToggleSos = async (next: boolean) => {
    if (next) {
      const ok = await enableSosShadeShortcut();
      if (!ok) {
        Alert.alert(t("common.error"), t("settings.sos.permissionDenied"));
        setShowSosInPanel(false);
        return;
      }
      setShowSosInPanel(true);
      return;
    }

    await disableSosShadeShortcut();
    setShowSosInPanel(false);
  };

  const onPinWidget = async () => {
    if (pinningWidget) return;

    setPinningWidget(true);
    try {
      const result = await requestPinMedicinesWidget();
      if (result === "requested") {
        Alert.alert(t("common.ok"), t("settings.widget.pinRequested"));
        return;
      }

      if (result === "unavailable") {
        Alert.alert(t("common.error"), t("settings.widget.unavailable"));
        return;
      }

      Alert.alert(t("common.error"), t("settings.widget.unsupported"));
    } finally {
      setPinningWidget(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 24 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>{t("settings.title")}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>{t("settings.subtitle")}</Text>

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
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t("settings.theme.dark")}</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>{t("settings.theme.darkDesc")}</Text>
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
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t("settings.theme.light")}</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>{t("settings.theme.lightDesc")}</Text>
          </View>
          {theme === "light" ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
        </Pressable>

        <View style={{ height: 16 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("settings.lang.title")}</Text>

        <View style={styles.langRow}>
          <Pressable
            onPress={() => setLanguage("ru")}
            style={({ pressed }) => [
              styles.langBtn,
              {
                borderColor: language === "ru" ? colors.primary : colors.border,
                backgroundColor: language === "ru" ? colors.primarySoft : colors.surface,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.langText, { color: colors.text }]}>{t("settings.lang.ru")}</Text>
          </Pressable>

          <Pressable
            onPress={() => setLanguage("en")}
            style={({ pressed }) => [
              styles.langBtn,
              {
                borderColor: language === "en" ? colors.primary : colors.border,
                backgroundColor: language === "en" ? colors.primarySoft : colors.surface,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.langText, { color: colors.text }]}>{t("settings.lang.en")}</Text>
          </Pressable>
        </View>

        <View style={{ height: 16 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("settings.sos.title")}</Text>
        <View
          style={[
            styles.option,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{t("settings.sos.toggle")}</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>{t("settings.sos.hint")}</Text>
          </View>
          <Switch
            value={showSosInPanel}
            onValueChange={onToggleSos}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>

        <View style={{ height: 16 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("settings.widget.title")}</Text>
        <Text style={[styles.optionText, { color: colors.muted }]}>{t("settings.widget.hint")}</Text>
        <PrimaryButton title={t("settings.widget.pinButton")} onPress={onPinWidget} loading={pinningWidget} />

        <View style={{ height: 16 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("settings.household.title")}</Text>
        <Text style={[styles.optionText, { color: colors.muted }]}>
          {t("settings.household.current", { code: currentCode ?? t("settings.household.notLoaded") })}
        </Text>

        {!householdId ? (
          <>
            <View style={{ height: 10 }} />
            <PrimaryButton title={t("settings.household.create")} onPress={onCreateHousehold} loading={creating} />
          </>
        ) : null}

        <TextInput
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          placeholder={t("settings.household.placeholder")}
          placeholderTextColor="rgba(120,120,120,0.55)"
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        />

        <PrimaryButton title={t("settings.household.join")} onPress={onJoin} loading={joining} />

        <View style={{ height: 16 }} />
        <PrimaryButton title={t("settings.signout")} onPress={onLogout} loading={loggingOut} />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  sectionTitle: { marginTop: 8, fontSize: 16, fontWeight: "900" },
  langRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  langBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  langText: { fontSize: 14, fontWeight: "800" },
  input: {
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
});
