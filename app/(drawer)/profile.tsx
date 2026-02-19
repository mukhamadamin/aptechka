import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { updateMyProfile } from "../../src/features/auth/api/auth-service";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { setSosPhone } from "../../src/notifications/sos-shortcut";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import { PrimaryButton } from "../../src/ui/components";

type SosForm = {
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodType: string;
  allergies: string;
  chronicConditions: string;
  address: string;
  notes: string;
};

const EMPTY_FORM: SosForm = {
  emergencyContactName: "",
  emergencyContactPhone: "",
  bloodType: "",
  allergies: "",
  chronicConditions: "",
  address: "",
  notes: "",
};

export default function ProfileScreen() {
  const { colors, theme } = useAppTheme();
  const { user, profile } = useHousehold();
  const { t } = useLanguage();

  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<SosForm>(EMPTY_FORM);

  React.useEffect(() => {
    setForm({
      emergencyContactName: profile?.emergencyContactName ?? "",
      emergencyContactPhone: profile?.emergencyContactPhone ?? "",
      bloodType: profile?.bloodType ?? "",
      allergies: profile?.allergies ?? "",
      chronicConditions: profile?.chronicConditions ?? "",
      address: profile?.address ?? "",
      notes: profile?.notes ?? "",
    });
  }, [profile]);

  React.useEffect(() => {
    setSosPhone(profile?.emergencyContactPhone ?? "").catch(() => {});
  }, [profile?.emergencyContactPhone]);

  const onSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await updateMyProfile(user.uid, {
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
        bloodType: form.bloodType.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        chronicConditions: form.chronicConditions.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      await setSosPhone(form.emergencyContactPhone);

      Alert.alert(t("common.ok"), t("assistant.emergency.saved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("assistant.error.saveProfile");
      Alert.alert(t("common.error"), message);
    } finally {
      setSaving(false);
    }
  };

  const onCall = async () => {
    const phone = form.emergencyContactPhone.trim();
    if (!phone) {
      Alert.alert(t("assistant.emergency.noPhoneTitle"), t("assistant.emergency.noPhoneText"));
      return;
    }

    await Linking.openURL(`tel:${phone}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 32 }}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>{t("profile.title")}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>{t("profile.subtitle")}</Text>

        <Field
          label={t("assistant.emergency.contactName")}
          value={form.emergencyContactName}
          onChangeText={(value) => setForm((prev) => ({ ...prev, emergencyContactName: value }))}
          colors={colors}
          theme={theme}
        />
        <Field
          label={t("assistant.emergency.contactPhone")}
          value={form.emergencyContactPhone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, emergencyContactPhone: value }))}
          colors={colors}
          theme={theme}
        />
        <Field
          label={t("assistant.emergency.blood")}
          value={form.bloodType}
          onChangeText={(value) => setForm((prev) => ({ ...prev, bloodType: value }))}
          colors={colors}
          theme={theme}
        />
        <Field
          label={t("assistant.emergency.allergies")}
          value={form.allergies}
          onChangeText={(value) => setForm((prev) => ({ ...prev, allergies: value }))}
          colors={colors}
          theme={theme}
          multiline
        />
        <Field
          label={t("assistant.emergency.conditions")}
          value={form.chronicConditions}
          onChangeText={(value) => setForm((prev) => ({ ...prev, chronicConditions: value }))}
          colors={colors}
          theme={theme}
          multiline
        />
        <Field
          label={t("assistant.emergency.address")}
          value={form.address}
          onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
          colors={colors}
          theme={theme}
          multiline
        />
        <Field
          label={t("assistant.emergency.notes")}
          value={form.notes}
          onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))}
          colors={colors}
          theme={theme}
          multiline
        />

        <View style={{ height: 10 }} />
        <PrimaryButton title={t("assistant.emergency.save")} onPress={onSave} loading={saving} />

        <View style={{ height: 8 }} />
        <Pressable
          onPress={onCall}
          style={({ pressed }) => [
            styles.sosBtn,
            { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="call-outline" size={18} color={colors.danger} />
          <Text style={[styles.sosText, { color: colors.danger }]}>{t("assistant.emergency.call")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.fieldLabel, { color: props.colors.faint }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        multiline={props.multiline}
        autoCorrect={false}
        autoCapitalize="sentences"
        textAlignVertical={props.multiline ? "top" : "center"}
        placeholderTextColor={props.theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
        style={[
          styles.input,
          {
            color: props.colors.text,
            borderColor: props.colors.border,
            backgroundColor: props.colors.surface,
          },
          props.multiline ? { minHeight: 78, paddingTop: 10 } : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sosBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sosText: { fontSize: 14, fontWeight: "900" },
});
