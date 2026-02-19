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
  cancelNotificationIds,
  scheduleMedicineNotifications,
} from "../../../src/notifications/notifications";
import {
  createMedicine,
  loadMedicines,
  normalizeForm,
  saveMedicines,
  updateMedicine,
  validateForm,
} from "../../../src/storage/medicines";
import type { MedicineForm } from "../../../src/types/medicine";
import { GhostButton, PrimaryButton } from "../../../src/ui/components";
import { colors, radius, shadow } from "../../../src/ui/theme";

const emptyForm: MedicineForm = {
  name: "",
  dosage: "",
  quantity: "",
  notes: "",
  expiresAt: undefined,
  remindDaysBefore: 7,
};

function formatDateLocal(iso?: string) {
  if (!iso) return "Не указан";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Не указан";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy}`;
}

export default function UpsertMedicine() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id;

  const [form, setForm] = React.useState<MedicineForm>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(!!id);

  const [showPicker, setShowPicker] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const list = await loadMedicines();
        const found = list.find((x) => x.id === id);
        if (!found) {
          Alert.alert("Не найдено", "Лекарство не найдено или было удалено.", [
            { text: "Ок", onPress: () => router.back() },
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
  }, [id, router]);

  const setField = (key: keyof MedicineForm, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const onSave = async () => {
    const cleaned = normalizeForm(form);
    const err = validateForm(cleaned);
    if (err) {
      Alert.alert("Проверьте данные", err);
      return;
    }

    setSaving(true);
    try {
      const list = await loadMedicines();

      // CREATE
      if (!id) {
        const created = createMedicine(cleaned);

        // планируем уведомления (если expiresAt задан)
        const notifIds = await scheduleMedicineNotifications(created);
        created.notificationIds = notifIds;

        await saveMedicines([created, ...list]);
        router.back();
        return;
      }

      // UPDATE
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) {
        Alert.alert("Не найдено", "Лекарство не найдено или было удалено.");
        router.back();
        return;
      }

      const prev = list[idx];
      // отменяем старые уведомления
      await cancelNotificationIds(prev.notificationIds);

      const updated = updateMedicine(prev, cleaned);
      // планируем новые
      const notifIds = await scheduleMedicineNotifications(updated);
      updated.notificationIds = notifIds;

      const next = [...list];
      next[idx] = updated;
      await saveMedicines(next);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const pickDate = (date: Date) => {
    // ставим 00:00:00, чтобы срок был по дню
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    setField("expiresAt", d.toISOString());
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.h1}>{id ? "Редактирование лекарства" : "Новое лекарство"}</Text>
          <Text style={styles.h2}>
            Добавьте срок годности и выберите, за сколько дней прислать напоминание.
          </Text>

          <Field
            label="Название"
            value={form.name}
            placeholder="Например: Парацетамол"
            onChangeText={(v) => setField("name", v)}
            autoFocus={!id}
          />

          <View style={styles.grid}>
            <View style={{ flex: 1 }}>
              <Field
                label="Дозировка"
                value={form.dosage ?? ""}
                placeholder="Например: 500 мг"
                onChangeText={(v) => setField("dosage", v)}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label="Количество"
                value={form.quantity ?? ""}
                placeholder="Например: 20 табл"
                onChangeText={(v) => setField("quantity", v)}
              />
            </View>
          </View>

          {/* Срок годности */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Срок годности</Text>

            <Pressable
              onPress={() => setShowPicker(true)}
              style={({ pressed }) => [styles.selectBox, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.selectText}>{formatDateLocal(form.expiresAt)}</Text>
              <Text style={styles.selectHint}>Нажмите, чтобы выбрать дату</Text>
            </Pressable>

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => setField("expiresAt", undefined)}
              style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.clearText}>Сбросить срок годности</Text>
            </Pressable>
          </View>

          {/* За сколько дней напомнить */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Напомнить за (дней)</Text>
            <TextInput
              value={String(form.remindDaysBefore ?? 7)}
              onChangeText={(v) => {
                const n = Number(v.replace(/[^\d]/g, ""));
                setField("remindDaysBefore", Number.isFinite(n) ? n : 7);
              }}
              keyboardType="number-pad"
              placeholder="Например: 7"
              placeholderTextColor="rgba(232,238,246,0.35)"
              style={styles.input}
            />
          </View>

          <Field
            label="Примечание"
            value={form.notes ?? ""}
            placeholder="Например: после еды"
            onChangeText={(v) => setField("notes", v)}
            multiline
            minHeight={110}
          />

          <View style={{ height: 14 }} />

          <PrimaryButton
            title={id ? "Сохранить изменения" : "Добавить"}
            onPress={onSave}
            loading={saving}
            disabled={initialLoading}
          />

          <View style={{ height: 10 }} />

          <GhostButton title="Отмена" onPress={() => router.back()} />
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
  onChangeText: (v: string) => void;
  autoFocus?: boolean;
  multiline?: boolean;
  minHeight?: number;
}) {
  const { label, value, placeholder, onChangeText, autoFocus, multiline, minHeight } = props;
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="rgba(232,238,246,0.35)"
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        style={[
          styles.input,
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
  container: { padding: 16, paddingTop: 12, paddingBottom: 28 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  h1: { color: colors.text, fontSize: 20, fontWeight: "900" },
  h2: { color: colors.muted, marginTop: 8, lineHeight: 20 },

  grid: { flexDirection: "row", marginTop: 2 },

  label: { color: colors.faint, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },

  selectBox: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  selectHint: { color: colors.muted, marginTop: 6, fontSize: 12, fontWeight: "600" },

  clearBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  clearText: { color: colors.text, fontSize: 13, fontWeight: "700" },
});
