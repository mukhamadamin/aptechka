import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addMedicineIntakeLog,
  listMedicineIntakeLogs,
} from "../../src/entities/medicine/api/intake-history-repository";
import {
  deleteMedicine,
  listMedicines,
  saveMedicine,
} from "../../src/entities/medicine/api/medicine-repository";
import { listHouseholdMembers } from "../../src/entities/family/api/family-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import {
  buildTodayDosePlan,
  loadTodayDoseDoneIds,
  type PlannedDose,
  toggleDoseDone,
} from "../../src/features/adherence/model/dose-tracker";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { cancelNotificationIds } from "../../src/notifications/notifications";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { Medicine, MedicineIntakeLog } from "../../src/types/medicine";
import { IconButton, LoadingOverlay, LoadingState, Pill } from "../../src/ui/components";
import { syncWidgetMedicines } from "../../src/widgets/widget-sync";

function daysLeft(expiresAt?: string) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(d);
  exp.setHours(0, 0, 0, 0);
  const diff = exp.getTime() - today.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatExpiry(expiresAt: string | undefined, language: "ru" | "en") {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US").format(d);
}

function parseQuantity(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const quantity = Number(match[0].replace(",", "."));
  return Number.isFinite(quantity) ? quantity : null;
}

function formatQuantity(value?: number, unit?: string, fallback?: string): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} ${unit ?? ""}`.trim();
  }
  return fallback;
}

function formatTakenAt(takenAt: number, language: "ru" | "en"): string {
  const d = new Date(takenAt);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

type FilterMode = "all" | "expiring" | "expired" | "noExpiry" | "withNotes";

export default function HomeScreen() {
  const router = useRouter();
  const { colors, theme } = useAppTheme();
  const { householdId, user, profile } = useHousehold();
  const { language, t } = useLanguage();

  const [items, setItems] = React.useState<Medicine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyMedicine, setHistoryMedicine] = React.useState<Medicine | null>(null);
  const [historyLogs, setHistoryLogs] = React.useState<MedicineIntakeLog[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [todayOpen, setTodayOpen] = React.useState(false);
  const [todayShowAll, setTodayShowAll] = React.useState(false);
  const [doneDoseIds, setDoneDoseIds] = React.useState<Set<string>>(new Set());
  const [todayBusyDoseId, setTodayBusyDoseId] = React.useState<string | null>(null);
  const [memberNamesByUid, setMemberNamesByUid] = React.useState<Record<string, string>>({});
  const [quantityModalOpen, setQuantityModalOpen] = React.useState(false);
  const [quantityTargetMedicine, setQuantityTargetMedicine] = React.useState<Medicine | null>(null);
  const [quantityAction, setQuantityAction] = React.useState<"assigned" | "noPrescription" | "add">("assigned");
  const [quantityValue, setQuantityValue] = React.useState("1");
  const [commandLoadingCount, setCommandLoadingCount] = React.useState(0);

  const runWithCommandLoading = React.useCallback(async (run: () => Promise<unknown>): Promise<unknown> => {
    setCommandLoadingCount((prev) => prev + 1);
    try {
      return await run();
    } finally {
      setCommandLoadingCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const commandLoading = commandLoadingCount > 0;

  const filterLabels = React.useMemo<Record<FilterMode, string>>(
    () => ({
      all: t("home.filter.all"),
      expiring: t("home.filter.expiring"),
      expired: t("home.filter.expired"),
      noExpiry: t("home.filter.noExpiry"),
      withNotes: t("home.filter.withNotes"),
    }),
    [t]
  );

  const fetchData = React.useCallback(async () => {
    if (!householdId) {
      setItems([]);
      setMemberNamesByUid({});
      return;
    }

    const [list, members] = await Promise.all([listMedicines(householdId), listHouseholdMembers(householdId)]);
    const namesByUid = Object.fromEntries(
      members.map((member) => [member.uid, member.displayName?.trim() || member.email || member.uid])
    );

    setItems(list);
    setMemberNamesByUid(namesByUid);
    await syncWidgetMedicines(list, namesByUid);
  }, [householdId]);

  const loadDoseState = React.useCallback(async () => {
    const done = await loadTodayDoseDoneIds();
    setDoneDoseIds(done);
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchData(), loadDoseState()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchData, loadDoseState]);

  useFocusEffect(
    React.useCallback(() => {
      if (!householdId) {
        setItems([]);
        setMemberNamesByUid({});
        return undefined;
      }

      let active = true;
      (async () => {
        const [list, done, members] = await Promise.all([
          listMedicines(householdId),
          loadTodayDoseDoneIds(),
          listHouseholdMembers(householdId),
        ]);
        if (active) {
          setItems(list);
          setDoneDoseIds(done);
          setMemberNamesByUid(
            Object.fromEntries(
              members.map((member) => [member.uid, member.displayName?.trim() || member.email || member.uid])
            )
          );
        }
      })();

      return () => {
        active = false;
      };
    }, [householdId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchData(), loadDoseState()]);
    } finally {
      setRefreshing(false);
    }
  };

  const onDelete = (id: string) => {
    if (!householdId) return;

    const med = items.find((x) => x.id === id);

    Alert.alert(t("home.delete.title"), t("home.delete.text"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await runWithCommandLoading(async () => {
              await cancelNotificationIds(med?.notificationIds);
              await deleteMedicine(householdId, id);
              await fetchData();
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : t("common.error");
            Alert.alert(t("common.error"), message);
          }
        },
      },
    ]);
  };

  const onUseOne = async (
    medicine: Medicine,
    options?: { markDoseId?: string }
  ): Promise<boolean> => {
    if (!householdId || !user) return false;

    const pendingMedicineDoses = todayPlan.filter(
      (dose) => dose.medicineId === medicine.id && !doneDoseIds.has(dose.id)
    );
    const restrictedDoses = pendingMedicineDoses.filter((dose) => dose.targetMemberUids.length > 0);
    const canTakeRestrictedDose = restrictedDoses.some((dose) => dose.targetMemberUids.includes(user.uid));

    if (restrictedDoses.length > 0 && !canTakeRestrictedDose) {
      Alert.alert(
        t("common.error"),
        language === "ru"
          ? "Это лекарство сегодня назначено другому члену семьи."
          : "This medicine is assigned to another family member today."
      );
      return false;
    }

    const currentQuantity =
      typeof medicine.quantityValue === "number"
        ? medicine.quantityValue
        : parseQuantity(medicine.quantity);

    if (currentQuantity === null) {
      Alert.alert(t("home.useOneErrorTitle"), t("home.useOneErrorText"));
      return false;
    }

    const nextQuantity = Math.max(0, Math.round((currentQuantity - 1) * 100) / 100);

    const updated: Medicine = {
      ...medicine,
      quantityValue: nextQuantity,
      quantity: formatQuantity(nextQuantity, medicine.quantityUnit, medicine.quantity),
      updatedAt: Date.now(),
    };

    try {
      await runWithCommandLoading(async () => {
        await saveMedicine(householdId, updated);
        await addMedicineIntakeLog(householdId, medicine.id, {
          actorUid: user.uid,
          actorName: profile?.displayName ?? user.email ?? user.uid,
          amount: 1,
          unit: medicine.quantityUnit,
        });

        const doseIdToMark =
          options?.markDoseId ??
          pendingMedicineDoses.find(
            (dose) => dose.targetMemberUids.length === 0 || dose.targetMemberUids.includes(user.uid)
          )?.id;

        if (doseIdToMark && !doneDoseIds.has(doseIdToMark)) {
          const next = await toggleDoseDone(doseIdToMark);
          setDoneDoseIds(next);
        }

        await fetchData();
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
      return false;
    }
  };

  const onUseOneNoPrescription = async (medicine: Medicine): Promise<boolean> => {
    if (!householdId || !user) return false;

    const currentQuantity =
      typeof medicine.quantityValue === "number"
        ? medicine.quantityValue
        : parseQuantity(medicine.quantity);

    if (currentQuantity === null) {
      Alert.alert(t("home.useOneErrorTitle"), t("home.useOneErrorText"));
      return false;
    }

    const nextQuantity = Math.max(0, Math.round((currentQuantity - 1) * 100) / 100);

    const updated: Medicine = {
      ...medicine,
      quantityValue: nextQuantity,
      quantity: formatQuantity(nextQuantity, medicine.quantityUnit, medicine.quantity),
      updatedAt: Date.now(),
    };

    try {
      await runWithCommandLoading(async () => {
        await saveMedicine(householdId, updated);
        await addMedicineIntakeLog(householdId, medicine.id, {
          actorUid: user.uid,
          actorName: profile?.displayName ?? user.email ?? user.uid,
          amount: 1,
          unit: medicine.quantityUnit,
        });

        await fetchData();
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
      return false;
    }
  };

  const openQuantityModal = (medicine: Medicine, action: "assigned" | "noPrescription" | "add") => {
    const currentQuantity =
      typeof medicine.quantityValue === "number"
        ? medicine.quantityValue
        : parseQuantity(medicine.quantity);

    if (action !== "add" && (currentQuantity === null || currentQuantity <= 0)) {
      Alert.alert(t("home.useOneErrorTitle"), t("home.useOneErrorText"));
      return;
    }

    setQuantityTargetMedicine(medicine);
    setQuantityAction(action);
    setQuantityValue("1");
    setQuantityModalOpen(true);
  };

  const submitQuantityModal = async () => {
    if (!quantityTargetMedicine || !householdId || !user) return;

    const amount = Number(quantityValue.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(t("auth.checkInput"), language === "ru" ? "Введите корректное количество." : "Enter valid amount.");
      return;
    }

    const currentQuantityRaw =
      typeof quantityTargetMedicine.quantityValue === "number"
        ? quantityTargetMedicine.quantityValue
        : parseQuantity(quantityTargetMedicine.quantity);

    if (quantityAction !== "add" && currentQuantityRaw === null) {
      Alert.alert(t("home.useOneErrorTitle"), t("home.useOneErrorText"));
      return;
    }

    const currentQuantity = currentQuantityRaw ?? 0;

    if (quantityAction !== "add" && amount > currentQuantity) {
      Alert.alert(
        t("auth.checkInput"),
        language === "ru"
          ? `Нельзя списать больше, чем есть сейчас (${currentQuantity ?? 0}).`
          : `Cannot decrement more than current quantity (${currentQuantity ?? 0}).`
      );
      return;
    }

    try {
      await runWithCommandLoading(async () => {
        if (quantityAction === "assigned") {
          const pendingMedicineDoses = todayPlan.filter(
            (dose) => dose.medicineId === quantityTargetMedicine.id && !doneDoseIds.has(dose.id)
          );
          const restrictedDoses = pendingMedicineDoses.filter((dose) => dose.targetMemberUids.length > 0);
          const canTakeRestrictedDose = restrictedDoses.some((dose) => dose.targetMemberUids.includes(user.uid));

          if (restrictedDoses.length > 0 && !canTakeRestrictedDose) {
            Alert.alert(
              t("common.error"),
              language === "ru"
                ? "Это лекарство сегодня назначено другому члену семьи."
                : "This medicine is assigned to another family member today."
            );
            return;
          }

          const doseIdToMark = pendingMedicineDoses.find(
            (dose) => dose.targetMemberUids.length === 0 || dose.targetMemberUids.includes(user.uid)
          )?.id;
          if (doseIdToMark && !doneDoseIds.has(doseIdToMark)) {
            const next = await toggleDoseDone(doseIdToMark);
            setDoneDoseIds(next);
          }
        }

        const roundedAmount = Math.round(amount * 100) / 100;
        const nextQuantity =
          quantityAction === "add"
            ? Math.round((currentQuantity + roundedAmount) * 100) / 100
            : Math.max(0, Math.round((currentQuantity - roundedAmount) * 100) / 100);

        const updated: Medicine = {
          ...quantityTargetMedicine,
          quantityValue: nextQuantity,
          quantity: formatQuantity(nextQuantity, quantityTargetMedicine.quantityUnit, quantityTargetMedicine.quantity),
          updatedAt: Date.now(),
        };

        await saveMedicine(householdId, updated);
        if (quantityAction !== "add") {
          await addMedicineIntakeLog(householdId, quantityTargetMedicine.id, {
            actorUid: user.uid,
            actorName: profile?.displayName ?? user.email ?? user.uid,
            amount: roundedAmount,
            unit: quantityTargetMedicine.quantityUnit,
          });
        }

        await fetchData();
        setQuantityModalOpen(false);
        setQuantityTargetMedicine(null);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
    }
  };

  const openHistory = async (medicine: Medicine) => {
    if (!householdId) return;
    setHistoryMedicine(medicine);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const logs = await listMedicineIntakeLogs(householdId, medicine.id, 100);
      setHistoryLogs(logs);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onTakeDose = async (dose: PlannedDose) => {
    const isAssignedToCurrentUser =
      dose.targetMemberUids.length === 0 || (user ? dose.targetMemberUids.includes(user.uid) : false);

    if (todayBusyDoseId || doneDoseIds.has(dose.id) || !isAssignedToCurrentUser) return;
    const medicine = items.find((item) => item.id === dose.medicineId);
    if (!medicine) return;

    setTodayBusyDoseId(dose.id);
    try {
      await onUseOne(medicine, { markDoseId: dose.id });
    } finally {
      setTodayBusyDoseId(null);
    }
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((x) => {
      const a = (x.name ?? "").toLowerCase();
      const b = (x.dosage ?? "").toLowerCase();
      const c = (x.notes ?? "").toLowerCase();
      const d = (x.manufacturerCountry ?? "").toLowerCase();
      const queryMatch = !q || a.includes(q) || b.includes(q) || c.includes(q) || d.includes(q);
      if (!queryMatch) return false;

      if (filterMode === "all") return true;

      const left = daysLeft(x.expiresAt);
      if (filterMode === "expiring") return left !== null && left >= 0 && left <= 7;
      if (filterMode === "expired") return left !== null && left < 0;
      if (filterMode === "noExpiry") return left === null;
      if (filterMode === "withNotes") return Boolean((x.notes ?? "").trim());

      return true;
    });
  }, [items, query, filterMode]);

  const resolveMemberName = React.useCallback(
    (uid: string) => memberNamesByUid[uid],
    [memberNamesByUid]
  );

  const todayPlan = React.useMemo(() => buildTodayDosePlan(items, resolveMemberName), [items, resolveMemberName]);
  const pendingToday = React.useMemo(
    () => todayPlan.filter((dose) => !doneDoseIds.has(dose.id)),
    [todayPlan, doneDoseIds]
  );
  const visibleTodayDoses = React.useMemo(
    () => (todayShowAll ? todayPlan : todayPlan.slice(0, 3)),
    [todayPlan, todayShowAll]
  );

  const renderItem = ({ item }: { item: Medicine }) => {
    const isOpen = expandedId === item.id;
    const left = daysLeft(item.expiresAt);
    const exp = formatExpiry(item.expiresAt, language);
    const isExpired = left !== null && left < 0;
    const isExpiringSoon = left !== null && left >= 0 && left <= 7;

    const cardBackgroundColor = isExpired
      ? theme === "dark"
        ? "rgba(239,68,68,0.22)"
        : "#FEE2E2"
      : isExpiringSoon
        ? theme === "dark"
          ? "rgba(251,146,60,0.22)"
          : "#FFEDD5"
        : colors.card2;

    const cardBorderColor = isExpired
      ? theme === "dark"
        ? "#EF4444"
        : "#FCA5A5"
      : isExpiringSoon
        ? theme === "dark"
          ? "#FB923C"
          : "#FDBA74"
        : colors.border;

    const qtyText = formatQuantity(item.quantityValue, item.quantityUnit, item.quantity);
    const qtyNumber =
      typeof item.quantityValue === "number" ? item.quantityValue : parseQuantity(item.quantity);

    let status: { label: string; tone: "default" | "danger" | "muted" } | null = null;

    if (left !== null && exp) {
      if (left < 0) status = { label: t("home.expired", { date: exp }), tone: "danger" };
      else if (left === 0) status = { label: t("home.expiresToday", { date: exp }), tone: "danger" };
      else if (left <= 7) status = { label: t("home.expiresIn", { days: left, date: exp }), tone: "danger" };
      else status = { label: t("home.expiry", { date: exp }), tone: "muted" };
    } else if (exp) {
      status = { label: t("home.expiry", { date: exp }), tone: "muted" };
    }

    const qty = qtyText ? t("home.qty", { value: qtyText }) : null;
    const country = item.manufacturerCountry ? t("home.country", { value: item.manufacturerCountry }) : null;

    const stockStatus =
      qtyNumber === null
        ? null
        : qtyNumber === 0
          ? { label: t("home.stock.empty"), tone: "danger" as const }
          : qtyNumber <= 5
            ? { label: t("home.stock.low"), tone: "danger" as const }
            : null;

    return (
      <Pressable
        onPress={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: cardBackgroundColor,
            borderColor: cardBorderColor,
          },
          pressed && { opacity: 0.94 },
        ]}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={styles.iconRow}>
            <IconButton name="time-outline" onPress={() => openHistory(item)} />
            <IconButton name="add-outline" onPress={() => openQuantityModal(item, "add")} />
            <IconButton name="create-outline" onPress={() => router.push(`/medicine/${item.id}`)} />
            <IconButton name="trash-outline" tone="danger" onPress={() => onDelete(item.id)} />
          </View>
        </View>

        {!isOpen ? (
          <View style={styles.collapsedRow}>
            <View style={styles.collapsedPills}>
              {qty ? <Pill label={qty} tone="muted" /> : null}
              {stockStatus ? <Pill label={stockStatus.label} tone={stockStatus.tone} /> : null}
              {status ? <Pill label={status.label} tone={status.tone} /> : null}
            </View>
            <View style={styles.quickActionsRow}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onUseOne(item);
                }}
                onLongPress={() => openQuantityModal(item, "assigned")}
                style={({ pressed }) => [
                  styles.quickUseInlineBtn,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="checkmark" size={14} color={colors.text} />
                <Text style={[styles.quickUseInlineText, { color: colors.text }]}>
                  {language === "ru" ? "\u041F\u0440\u0438\u043D\u044F\u0442\u044C" : "Take"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {isOpen ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <View style={styles.pillsRow}>
              {item.dosage ? <Pill label={t("home.dosage", { value: item.dosage })} tone="muted" /> : null}
              {qty ? <Pill label={qty} tone="muted" /> : null}
              {country ? <Pill label={country} tone="muted" /> : null}
              {stockStatus ? <Pill label={stockStatus.label} tone={stockStatus.tone} /> : null}
              {status ? <Pill label={status.label} tone={status.tone} /> : null}
            </View>

            <View style={styles.collapsedPills}>
             {item.notes ? (
              <Text style={[styles.notes, { color: colors.faint }]} numberOfLines={6}>
                {item.notes}
              </Text>
            ) : null}

            <Text style={[styles.hint, { color: colors.muted }]}>{t("home.collapse")}</Text>

              <View style={styles.quickActionsRow}>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onUseOne(item);
                  }}
                  onLongPress={() => openQuantityModal(item, "assigned")}
                  style={({ pressed }) => [
                    styles.quickUseInlineBtn,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="checkmark" size={14} color={colors.text} />
                  <Text style={[styles.quickUseInlineText, { color: colors.text }]}>
                    {language === "ru" ? "\u041F\u0440\u0438\u043D\u044F\u0442\u044C" : "Take"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onUseOneNoPrescription(item);
                  }}
                  onLongPress={() => openQuantityModal(item, "noPrescription")}
                  style={({ pressed }) => [
                    styles.quickMinusBtn,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="remove" size={14} color={colors.text} />
                  <Text style={[styles.quickUseInlineText, { color: colors.text }]}>
                    {language === "ru" ? "\u0431\u0435\u0437 \u0440\u0435\u0446\u0435\u043F\u0442\u0430 \u043F\u0440\u0438\u043D\u044F\u0442\u044C" : "Take without Rx"}
                  </Text>
                </Pressable>
              </View>
            </View>

           
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor="rgba(120,120,120,0.55)"
            style={[
              styles.search,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                borderColor: filterMode === "all" ? colors.border : colors.primary,
                backgroundColor: filterMode === "all" ? colors.surface : colors.primarySoft,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="options-outline" size={16} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => router.push("/medicine/new")}
            disabled={!householdId}
            style={({ pressed }) => [
              styles.filterBtn,
              { borderColor: colors.border, backgroundColor: colors.surface },
              !householdId && { opacity: 0.45 },
              pressed && householdId && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="add" size={16} color={colors.text} />
          </Pressable>
        </View>

        {filtersOpen ? (
          <View style={styles.filtersWrap}>
            {(Object.keys(filterLabels) as FilterMode[]).map((mode) => {
              const active = mode === filterMode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setFilterMode(mode)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primarySoft : colors.surface,
                    },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: colors.text }]}>{filterLabels[mode]}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View
          style={[
            styles.todayCard,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <Pressable
            onPress={() =>
              setTodayOpen((prev) => {
                const next = !prev;
                if (!next) setTodayShowAll(false);
                return next;
              })
            }
            style={({ pressed }) => [styles.todayHeader, pressed && { opacity: 0.9 }]}
          >
            <Text style={[styles.todayTitle, { color: colors.text }]}> 
              {language === "ru" ? "\u041A \u043F\u0440\u0438\u0435\u043C\u0443 \u0441\u0435\u0433\u043E\u0434\u043D\u044F" : "To take today"}
            </Text>
            <Text style={[styles.todayMeta, { color: colors.muted }]}>
              {language === "ru" ? `${pendingToday.length} \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C` : `${pendingToday.length} left`}
            </Text>
          </Pressable>

          {todayOpen &&
            (todayPlan.length === 0 ? (
              <Text style={[styles.todayEmpty, { color: colors.muted }]}>
                {language === "ru"
                  ? "\u041D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u043D\u0435\u0442 \u0437\u0430\u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u043F\u0440\u0438\u0435\u043C\u043E\u0432."
                  : "No scheduled doses for today."}
              </Text>
            ) : (
              <View style={styles.todayList}>
                {visibleTodayDoses.map((dose) => {
                  const done = doneDoseIds.has(dose.id);
                  const isAssignedToCurrentUser =
                    dose.targetMemberUids.length === 0 || (user ? dose.targetMemberUids.includes(user.uid) : false);
                  const now = new Date();
                  const isOverdue = !done && dose.hour * 60 + dose.minute < now.getHours() * 60 + now.getMinutes();
                  const statusLabel = !isAssignedToCurrentUser
                    ? (language === "ru" ? "\u041D\u0435 \u0434\u043B\u044F \u0432\u0430\u0441" : "Not for you")
                    : done
                    ? (language === "ru" ? "\u041F\u0440\u0438\u043D\u044F\u0442\u043E" : "Taken")
                    : isOverdue
                      ? (language === "ru" ? "\u041F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E" : "Overdue")
                      : (language === "ru" ? "\u041F\u0440\u0438\u043D\u044F\u0442\u044C" : "Take");
                  const statusTone = !isAssignedToCurrentUser ? "muted" : done ? "default" : isOverdue ? "danger" : "muted";

                  return (
                    <Pressable
                      key={dose.id}
                      onPress={() => onTakeDose(dose)}
                      disabled={done || todayBusyDoseId === dose.id || !isAssignedToCurrentUser}
                      style={({ pressed }) => [
                        styles.todayRow,
                        {
                          borderColor: done ? colors.primary : colors.border,
                          backgroundColor: done ? colors.primarySoft : colors.card2,
                        },
                        (done || todayBusyDoseId === dose.id || !isAssignedToCurrentUser) && { opacity: 0.78 },
                        pressed && !done && todayBusyDoseId !== dose.id && { opacity: 0.9 },
                      ]}
                    >
                      <View style={styles.todayTimeWrap}>
                        <Ionicons
                          name={done ? "checkmark-circle" : "ellipse-outline"}
                          size={14}
                          color={done ? colors.primary : colors.muted}
                        />
                        <Text style={[styles.todayTime, { color: colors.text }]}>{dose.time}</Text>
                      </View>
                      <View style={styles.todayNameWrap}>
                        <Text style={[styles.todayName, { color: colors.text }]} numberOfLines={1}>
                          {dose.medicineName}
                        </Text>
                        {dose.targetMemberNames.length ? (
                          <Text style={[styles.todayAssignees, { color: colors.muted }]} numberOfLines={1}>
                            {dose.targetMemberNames.join(", ")}
                          </Text>
                        ) : null}
                      </View>
                      <Pill label={statusLabel} tone={statusTone} />
                    </Pressable>
                  );
                })}
                {todayPlan.length > 3 ? (
                  <Pressable
                    onPress={() => setTodayShowAll((prev) => !prev)}
                    style={({ pressed }) => [styles.todayToggleBtn, { borderColor: colors.border }, pressed && { opacity: 0.88 }]}
                  >
                    <Text style={[styles.todayToggleText, { color: colors.text }]}>
                      {todayShowAll
                        ? (language === "ru" ? "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C" : "Collapse")
                        : (language === "ru" ? `\u0415\u0449\u0451 ${todayPlan.length - 3}` : `${todayPlan.length - 3} more`)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
        </View>
      </View>

      <View style={{ height: 12 }} />

      {!householdId ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("home.empty.noHousehold")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("home.empty.noHouseholdText")}</Text>
        </View>
      ) : loading ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LoadingState label={t("home.loadingText")} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("home.empty.list")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {query.trim() || filterMode !== "all" ? t("home.empty.query") : t("home.empty.first")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          }
        />
      )}

      <Modal
        visible={quantityModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setQuantityModalOpen(false);
          setQuantityTargetMedicine(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.qtyModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {quantityAction === "add"
                ? language === "ru"
                  ? "Добавить количество"
                  : "Add quantity"
                : language === "ru"
                  ? "Списать количество"
                  : "Decrement amount"}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              {quantityTargetMedicine?.name ?? ""}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              {language === "ru"
                ? `Сейчас: ${
                    typeof quantityTargetMedicine?.quantityValue === "number"
                      ? quantityTargetMedicine.quantityValue
                      : parseQuantity(quantityTargetMedicine?.quantity) ?? 0
                  }`
                : `Current: ${
                    typeof quantityTargetMedicine?.quantityValue === "number"
                      ? quantityTargetMedicine.quantityValue
                      : parseQuantity(quantityTargetMedicine?.quantity) ?? 0
                  }`}
            </Text>

            <TextInput
              value={quantityValue}
              onChangeText={setQuantityValue}
              keyboardType="decimal-pad"
              placeholder={language === "ru" ? "Введите количество" : "Enter amount"}
              placeholderTextColor="rgba(120,120,120,0.55)"
              style={[
                styles.qtyInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            />

            <View style={styles.qtyButtonsRow}>
              <Pressable
                onPress={() => {
                  setQuantityModalOpen(false);
                  setQuantityTargetMedicine(null);
                }}
                style={({ pressed }) => [
                  styles.qtyBtn,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.qtyBtnText, { color: colors.text }]}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={submitQuantityModal}
                style={({ pressed }) => [
                  styles.qtyBtn,
                  { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={[styles.qtyBtnText, { color: colors.text }]}>
                  {quantityAction === "add"
                    ? language === "ru"
                      ? "Добавить"
                      : "Add"
                    : language === "ru"
                      ? "Списать"
                      : "Apply"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={historyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === "ru" ? "\u0416\u0443\u0440\u043D\u0430\u043B \u043F\u0440\u0438\u0435\u043C\u0430" : "Intake history"}
              </Text>
              <Pressable
                onPress={() => setHistoryOpen(false)}
                style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.85 }]}
              >
                <Text style={[styles.modalCloseText, { color: colors.text }]}>
                  {language === "ru" ? "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" : "Close"}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
              {historyMedicine?.name ?? ""}
            </Text>

            {historyLoading ? (
              <LoadingState label={language === "ru" ? "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." : "Loading..."} />
            ) : historyLogs.length === 0 ? (
              <Text style={[styles.modalEmpty, { color: colors.muted }]}>
                {language === "ru" ? "\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442." : "No records yet."}
              </Text>
            ) : (
              <FlatList
                data={historyLogs}
                keyExtractor={(x) => x.id}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.logItem,
                      { borderColor: colors.border, backgroundColor: colors.card2 },
                    ]}
                  >
                    <Text style={[styles.logItemTitle, { color: colors.text }]}>
                      {item.actorName} - {item.amount} {item.unit ?? ""}
                    </Text>
                    <Text style={[styles.logItemMeta, { color: colors.muted }]}>
                      {formatTakenAt(item.takenAt, language)}
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      <LoadingOverlay visible={commandLoading} label={t("common.loading")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerBlock: { borderRadius: 18, padding: 14, borderWidth: 1 },
  appBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appBarAddBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  searchRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  search: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterBtnText: { fontSize: 13, fontWeight: "800" },
  filtersWrap: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  filterChipText: { fontSize: 12, fontWeight: "800" },
  todayCard: { marginTop: 10, borderWidth: 1, borderRadius: 14, padding: 10 },
  todayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  todayTitle: { fontSize: 14, fontWeight: "900" },
  todayMeta: { fontSize: 12, fontWeight: "700" },
  todayEmpty: { marginTop: 8, fontSize: 13 },
  todayList: { marginTop: 8, gap: 6 },
  todayRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  todayTimeWrap: { width: 62, flexDirection: "row", alignItems: "center", gap: 4 },
  todayTime: { fontSize: 12, fontWeight: "900" },
  todayNameWrap: { flex: 1, minWidth: 0 },
  todayName: { fontSize: 13, fontWeight: "700" },
  todayAssignees: { marginTop: 2, fontSize: 12 },
  todayToggleBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  todayToggleText: { fontSize: 12, fontWeight: "800" },
  card: { borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  quickActionsRow: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 6 },
  quickUseInlineBtn: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickMinusBtn: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickUseInlineText: { fontSize: 12, fontWeight: "900" },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 15, fontWeight: "900" },
  collapsedRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  collapsedPills: { flex: 1, minWidth: 0, gap: 8, flexDirection: "row", flexWrap: "wrap" },
  iconRow: { flexDirection: "row", gap: 8 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  useBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  useBtnText: { fontSize: 13, fontWeight: "800" },
  notes: { lineHeight: 18 },
  hint: { fontSize: 12, fontWeight: "700" },
  emptyWrap: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "78%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  qtyModalCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 14,
    alignSelf: "stretch",
    marginBottom: 120,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: "900" },
  modalSubtitle: { marginTop: 4, marginBottom: 10, lineHeight: 18 },
  qtyInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 2,
  },
  qtyButtonsRow: { marginTop: 12, flexDirection: "row", gap: 8 },
  qtyBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  qtyBtnText: { fontSize: 14, fontWeight: "800" },
  modalClose: { paddingHorizontal: 8, paddingVertical: 6 },
  modalCloseText: { fontSize: 13, fontWeight: "800" },
  modalEmpty: { lineHeight: 20, marginTop: 6, marginBottom: 10 },
  logItem: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  logItemTitle: { fontSize: 14, fontWeight: "800" },
  logItemMeta: { marginTop: 4, fontSize: 12, lineHeight: 17 },
});


