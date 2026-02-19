import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  getMedicineById,
  saveMedicine,
} from "../../../src/entities/medicine/api/medicine-repository";
import {
  createMedicine,
  normalizeMedicineForm,
  updateMedicine,
  validateMedicineForm,
} from "../../../src/entities/medicine/model/medicine";
import { useHousehold } from "../../../src/entities/session/model/use-household";
import {
  cancelNotificationIds,
  scheduleMedicineNotifications,
} from "../../../src/notifications/notifications";
import { useAppTheme } from "../../../src/theme/ThemeProvider";
import type { MedicineForm } from "../../../src/types/medicine";
import { GhostButton, PrimaryButton } from "../../../src/ui/components";

const emptyForm: MedicineForm = {
  name: "",
  dosage: "",
  quantity: "",
  notes: "",
  expiresAt: undefined,
  remindDaysBefore: 7,
};

function formatDateLocal(iso?: string) {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not set";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy}`;
}

export default function UpsertMedicine() {
  const router = useRouter();
  const { colors, theme } = useAppTheme();
  const { householdId } = useHousehold();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id;

  const [form, setForm] = React.useState<MedicineForm>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(!!id);
  const [showPicker, setShowPicker] = React.useState(false);

  React.useEffect(() => {
    if (!id || !householdId) return;

    (async () => {
      try {
        const found = await getMedicineById(householdId, id);
        if (!found) {
          Alert.alert("Not found", "Medicine was not found or has been deleted.", [
            { text: "OK", onPress: () => router.back() },
          ]);
          return;
        }

        setForm({
          name: found.name,
          dosage: found.dosage ?? "",
          quantity: found.quantity ?? "",
          notes: found.notes ?? "",
          expiresAt: found.expiresAt,
          remindDaysBefore: found.remindDaysBefore ?? 7,
        });
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [householdId, id, router]);

  const setField = <K extends keyof MedicineForm>(key: K, value: MedicineForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (!householdId) {
      Alert.alert("No household", "Join a household first in Settings.");
      return;
    }

    const cleaned = normalizeMedicineForm(form);
    const errorMessage = validateMedicineForm(cleaned);
    if (errorMessage) {
      Alert.alert("Check your input", errorMessage);
      return;
    }

    setSaving(true);
    try {
      if (!id) {
        const created = createMedicine(cleaned);
        const notificationIds = await scheduleMedicineNotifications(created);
        created.notificationIds = notificationIds;

        await saveMedicine(householdId, created);
        router.back();
        return;
      }

      const previous = await getMedicineById(householdId, id);
      if (!previous) {
        Alert.alert("Not found", "Medicine was not found or has been deleted.");
        router.back();
        return;
      }

      await cancelNotificationIds(previous.notificationIds);

      const updated = updateMedicine(previous, cleaned);
      const notificationIds = await scheduleMedicineNotifications(updated);
      updated.notificationIds = notificationIds;

      await saveMedicine(householdId, updated);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const pickDate = (date: Date) => {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    setField("expiresAt", normalizedDate.toISOString());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: theme === "dark" ? "#000" : "#0F172A",
            },
          ]}
        >
          <Text style={[styles.h1, { color: colors.text }]}>{id ? "Edit Medicine" : "New Medicine"}</Text>
          <Text style={[styles.h2, { color: colors.muted }]}>This medicine will be shared with all household members.</Text>

          <Field
            label="Name"
            value={form.name}
            placeholder="For example: Paracetamol"
            onChangeText={(value) => setField("name", value)}
            autoFocus={!id}
            colors={colors}
            theme={theme}
          />

          <View style={styles.grid}>
            <View style={{ flex: 1 }}>
              <Field
                label="Dosage"
                value={form.dosage ?? ""}
                placeholder="For example: 500 mg"
                onChangeText={(value) => setField("dosage", value)}
                colors={colors}
                theme={theme}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Quantity"
                value={form.quantity ?? ""}
                placeholder="For example: 20 tabs"
                onChangeText={(value) => setField("quantity", value)}
                colors={colors}
                theme={theme}
              />
            </View>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: colors.faint }]}>Expiry date</Text>

            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [
                styles.selectBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.selectText, { color: colors.text }]}>{formatDateLocal(form.expiresAt)}</Text>
              <Text style={[styles.selectHint, { color: colors.muted }]}>Tap to choose date</Text>
            </Pressable>

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => setField("expiresAt", undefined)}
              style={({ pressed }) => [
                styles.clearBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.clearText, { color: colors.text }]}>Clear expiry date</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: colors.faint }]}>Remind before (days)</Text>
            <TextInput
              value={String(form.remindDaysBefore ?? 7)}
              onChangeText={(value) => {
                const numericValue = Number(value.replace(/[^\d]/g, ""));
                setField("remindDaysBefore", Number.isFinite(numericValue) ? numericValue : 7);
              }}
              keyboardType="number-pad"
              placeholder="For example: 7"
              placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            />
          </View>

          <Field
            label="Notes"
            value={form.notes ?? ""}
            placeholder="For example: after meal"
            onChangeText={(value) => setField("notes", value)}
            multiline
            minHeight={110}
            colors={colors}
            theme={theme}
          />

          <View style={{ height: 14 }} />

          <PrimaryButton
            title={id ? "Save Changes" : "Add Medicine"}
            onPress={onSave}
            loading={saving}
            disabled={initialLoading}
          />

          <View style={{ height: 10 }} />

          <GhostButton title="Cancel" onPress={() => router.back()} />
        </View>
      </ScrollView>

      {showPicker ? (
        <DateTimePicker
          value={form.expiresAt ? new Date(form.expiresAt) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) pickDate(date);
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  multiline?: boolean;
  minHeight?: number;
  colors: ReturnType<typeof useAppTheme>["colors"];
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  const { label, value, placeholder, onChangeText, autoFocus, multiline, minHeight, colors, theme } = props;

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: colors.faint }]}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
          multiline && { height: minHeight ?? 110, paddingTop: 12, textAlignVertical: "top" },
        ]}
        multiline={multiline}
        autoCorrect={false}
        autoCapitalize="sentences"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 16, paddingTop: 12, paddingBottom: 28 },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 8, lineHeight: 20 },
  grid: { flexDirection: "row", marginTop: 2 },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  selectBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectText: { fontSize: 15, fontWeight: "800" },
  selectHint: { marginTop: 6, fontSize: 12, fontWeight: "600" },
  clearBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearText: { fontSize: 13, fontWeight: "700" },
});
