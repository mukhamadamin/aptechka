import DateTimePicker from "@react-native-community/datetimepicker";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { useLanguage } from "../../../src/i18n/LanguageProvider";
import {
  cancelNotificationIds,
  scheduleMedicineNotifications,
} from "../../../src/notifications/notifications";
import { useAppTheme } from "../../../src/theme/ThemeProvider";
import type { MedicineForm } from "../../../src/types/medicine";
import { GhostButton, PrimaryButton } from "../../../src/ui/components";

const DOSAGE_VALUES: NonNullable<MedicineForm["dosageForm"]>[] = ["tablet", "capsule", "liquid", "powder", "other"];
const UNIT_VALUES: NonNullable<MedicineForm["quantityUnit"]>[] = ["pcs", "ml", "g"];

const emptyForm: MedicineForm = {
  name: "",
  dosageForm: "tablet",
  dosage: "",
  quantityValue: undefined,
  quantityUnit: "pcs",
  quantity: "",
  notes: "",
  manufacturerCountry: "",
  barcode: "",
  intakeTimes: "",
  expiresAt: undefined,
  remindDaysBefore: 7,
};

function defaultUnitByForm(form?: MedicineForm["dosageForm"]): NonNullable<MedicineForm["quantityUnit"]> {
  if (form === "liquid") return "ml";
  if (form === "powder") return "g";
  return "pcs";
}

function formatDateLocal(iso: string | undefined, language: "ru" | "en", fallback: string) {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US").format(d);
}

function parseLegacyQuantity(raw?: string): {
  quantityValue?: number;
  quantityUnit?: NonNullable<MedicineForm["quantityUnit"]>;
} {
  if (!raw?.trim()) return {};

  const match = raw.trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return {};

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value)) return {};

  const unitRaw = match[2].toLowerCase();
  if (unitRaw.includes("ml") || unitRaw.includes("мл") || unitRaw.includes("л")) {
    return { quantityValue: value, quantityUnit: "ml" };
  }
  if (
    unitRaw.includes("g") ||
    unitRaw.includes("kg") ||
    unitRaw.includes("г") ||
    unitRaw.includes("кг")
  ) {
    return { quantityValue: value, quantityUnit: "g" };
  }

  return { quantityValue: value, quantityUnit: "pcs" };
}

function localizeError(message: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (message.startsWith("validation.")) return t(message);
  return message;
}

export default function UpsertMedicine() {
  const router = useRouter();
  const { colors, theme } = useAppTheme();
  const { language, t } = useLanguage();
  const { householdId } = useHousehold();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params?.id;

  const [form, setForm] = React.useState<MedicineForm>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(!!id);
  const [showPicker, setShowPicker] = React.useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanOpen, setScanOpen] = React.useState(false);
  const [scanLocked, setScanLocked] = React.useState(false);

  React.useEffect(() => {
    if (!id || !householdId) return;

    (async () => {
      try {
        const found = await getMedicineById(householdId, id);
        if (!found) {
          Alert.alert(t("common.error"), t("medicine.notFound"), [
            { text: t("common.ok"), onPress: () => router.back() },
          ]);
          return;
        }

        const parsedLegacy = parseLegacyQuantity(found.quantity);

        setForm({
          name: found.name,
          dosageForm: found.dosageForm ?? "tablet",
          dosage: found.dosage ?? "",
          quantityValue: found.quantityValue ?? parsedLegacy.quantityValue,
          quantityUnit:
            found.quantityUnit ??
            parsedLegacy.quantityUnit ??
            defaultUnitByForm(found.dosageForm),
          quantity: found.quantity ?? "",
          notes: found.notes ?? "",
          manufacturerCountry: found.manufacturerCountry ?? "",
          barcode: found.barcode ?? "",
          intakeTimes: found.intakeTimes ?? "",
          expiresAt: found.expiresAt,
          remindDaysBefore: found.remindDaysBefore ?? 7,
        });
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [householdId, id, router, t]);

  const setField = <K extends keyof MedicineForm>(key: K, value: MedicineForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onChangeDosageForm = (nextForm: NonNullable<MedicineForm["dosageForm"]>) => {
    setForm((prev) => ({
      ...prev,
      dosageForm: nextForm,
      quantityUnit: defaultUnitByForm(nextForm),
    }));
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted.granted) {
        Alert.alert(t("medicine.noAccess"), t("medicine.cameraDenied"));
        return;
      }
    }

    setScanLocked(false);
    setScanOpen(true);
  };

  const onSave = async () => {
    if (!householdId) {
      Alert.alert(t("medicine.noHousehold"), t("medicine.noHouseholdText"));
      return;
    }

    const cleaned = normalizeMedicineForm(form);
    const errorMessage = validateMedicineForm(cleaned);
    if (errorMessage) {
      Alert.alert(t("auth.checkInput"), localizeError(errorMessage, t));
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
        Alert.alert(t("common.error"), t("medicine.notFound"));
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 96 }]}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={[styles.h1, { color: colors.text }]}>
            {id ? t("medicine.title.edit") : t("medicine.title.new")}
          </Text>
          <Text style={[styles.h2, { color: colors.muted }]}>{t("medicine.subtitle")}</Text>

          <Field
            label={t("medicine.name")}
            value={form.name}
            placeholder={t("medicine.namePlaceholder")}
            onChangeText={(value) => setField("name", value)}
            autoFocus={!id}
            colors={colors}
            theme={theme}
          />

          <Text style={[styles.label, { color: colors.faint, marginTop: 14 }]}>{t("medicine.form")}</Text>
          <View style={styles.inlineWrap}>
            {DOSAGE_VALUES.map((option) => {
              const active = form.dosageForm === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => onChangeDosageForm(option)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primarySoft : colors.surface,
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{t(`medicine.form.${option}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label={t("medicine.country")}
            value={form.manufacturerCountry ?? ""}
            placeholder={t("medicine.countryPlaceholder")}
            onChangeText={(value) => setField("manufacturerCountry", value)}
            colors={colors}
            theme={theme}
          />

          <Field
            label={t("medicine.barcode")}
            value={form.barcode ?? ""}
            placeholder={t("medicine.barcodePlaceholder")}
            onChangeText={(value) => setField("barcode", value)}
            colors={colors}
            theme={theme}
          />

          <Pressable
            onPress={openScanner}
            style={({ pressed }) => [
              styles.scanBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.scanBtnText, { color: colors.text }]}>{t("medicine.scan")}</Text>
          </Pressable>

          {scanOpen ? (
            <View style={[styles.scannerWrap, { borderColor: colors.border }]}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
                onBarcodeScanned={scanLocked ? undefined : ({ data }) => {
                  setScanLocked(true);
                  setField("barcode", data);
                  if (!form.name.trim()) {
                    setField("name", t("medicine.nameFromBarcode", { code: data }));
                  }
                  setScanOpen(false);
                  Alert.alert(t("common.ok"), t("medicine.scanDone", { code: data }));
                }}
              />
              <Pressable
                onPress={() => setScanOpen(false)}
                style={({ pressed }) => [
                  styles.scanClose,
                  { backgroundColor: colors.card },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.scanCloseText, { color: colors.text }]}>{t("medicine.scanClose")}</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.grid}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("medicine.dosage")}
                value={form.dosage ?? ""}
                placeholder={t("medicine.dosagePlaceholder")}
                onChangeText={(value) => setField("dosage", value)}
                colors={colors}
                theme={theme}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Field
                label={t("medicine.quantity")}
                value={form.quantityValue === undefined ? "" : String(form.quantityValue)}
                placeholder={t("medicine.quantityPlaceholder")}
                onChangeText={(value) => {
                  const normalized = value.replace(",", ".");
                  const parsed = Number(normalized);
                  setField("quantityValue", Number.isFinite(parsed) ? parsed : undefined);
                }}
                keyboardType="decimal-pad"
                colors={colors}
                theme={theme}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.faint, marginTop: 14 }]}>{t("medicine.unit")}</Text>
          <View style={styles.inlineWrap}>
            {UNIT_VALUES.map((option) => {
              const active = form.quantityUnit === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setField("quantityUnit", option)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primarySoft : colors.surface,
                    },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={[styles.chipText, { color: colors.text }]}>{t(`medicine.unit.${option}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label={t("medicine.intake")}
            value={form.intakeTimes ?? ""}
            placeholder={t("medicine.intakePlaceholder")}
            onChangeText={(value) => setField("intakeTimes", value)}
            colors={colors}
            theme={theme}
          />

          <Text style={[styles.noteHint, { color: colors.muted }]}>{t("medicine.intakeHint")}</Text>

          <View style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: colors.faint }]}>{t("medicine.expiry")}</Text>

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
              <Text style={[styles.selectText, { color: colors.text }]}>
                {formatDateLocal(form.expiresAt, language, t("medicine.expiryUnset"))}
              </Text>
              <Text style={[styles.selectHint, { color: colors.muted }]}>{t("medicine.pickDate")}</Text>
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
              <Text style={[styles.clearText, { color: colors.text }]}>{t("medicine.clearDate")}</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={[styles.label, { color: colors.faint }]}>{t("medicine.remindDays")}</Text>
            <TextInput
              value={String(form.remindDaysBefore ?? 7)}
              onChangeText={(value) => {
                const n = Number(value.replace(/[^\d]/g, ""));
                setField("remindDaysBefore", Number.isFinite(n) ? n : 7);
              }}
              keyboardType="number-pad"
              placeholder={t("medicine.remindDaysPlaceholder")}
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
            label={t("medicine.notes")}
            value={form.notes ?? ""}
            placeholder={t("medicine.notesPlaceholder")}
            onChangeText={(value) => setField("notes", value)}
            multiline
            minHeight={110}
            colors={colors}
            theme={theme}
          />

          <View style={{ height: 14 }} />

          <PrimaryButton
            title={id ? t("medicine.saveEdit") : t("medicine.saveNew")}
            onPress={onSave}
            loading={saving}
            disabled={initialLoading}
          />

          <View style={{ height: 10 }} />
          <GhostButton title={t("common.cancel")} onPress={() => router.back()} />
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
  keyboardType?: "default" | "decimal-pad";
  colors: ReturnType<typeof useAppTheme>["colors"];
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  const { label, value, placeholder, onChangeText, autoFocus, multiline, minHeight, keyboardType, colors, theme } =
    props;

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[styles.label, { color: colors.faint }]}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
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
  inlineWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  scanBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  scanBtnText: { fontSize: 13, fontWeight: "800" },
  scannerWrap: {
    marginTop: 10,
    height: 240,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  scanClose: {
    position: "absolute",
    right: 10,
    top: 10,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scanCloseText: { fontSize: 12, fontWeight: "800" },
  noteHint: { marginTop: 8, fontSize: 12, lineHeight: 18 },
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
