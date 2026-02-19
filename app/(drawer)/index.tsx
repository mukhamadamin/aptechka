import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  deleteMedicine,
  listMedicines,
  saveMedicine,
} from "../../src/entities/medicine/api/medicine-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { cancelNotificationIds } from "../../src/notifications/notifications";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { Medicine } from "../../src/types/medicine";
import { IconButton, Pill, PrimaryButton } from "../../src/ui/components";
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

type FilterMode = "all" | "expiring" | "expired" | "noExpiry" | "withNotes";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { householdId } = useHousehold();
  const { language, t } = useLanguage();

  const [items, setItems] = React.useState<Medicine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

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
      return;
    }

    const list = await listMedicines(householdId);
    setItems(list);
    await syncWidgetMedicines(list);
  }, [householdId]);

  React.useEffect(() => {
    (async () => {
      try {
        await fetchData();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!householdId) {
        setItems([]);
        return undefined;
      }

      let active = true;
      (async () => {
        const list = await listMedicines(householdId);
        if (active) setItems(list);
      })();

      return () => {
        active = false;
      };
    }, [householdId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
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
          await cancelNotificationIds(med?.notificationIds);
          await deleteMedicine(householdId, id);
          await fetchData();
        },
      },
    ]);
  };

  const onUseOne = async (medicine: Medicine) => {
    if (!householdId) return;

    const currentQuantity =
      typeof medicine.quantityValue === "number"
        ? medicine.quantityValue
        : parseQuantity(medicine.quantity);

    if (currentQuantity === null) {
      Alert.alert(t("home.useOneErrorTitle"), t("home.useOneErrorText"));
      return;
    }

    const nextQuantity = Math.max(0, Math.round((currentQuantity - 1) * 100) / 100);

    const updated: Medicine = {
      ...medicine,
      quantityValue: nextQuantity,
      quantity: formatQuantity(nextQuantity, medicine.quantityUnit, medicine.quantity),
      updatedAt: Date.now(),
    };

    await saveMedicine(householdId, updated);
    await fetchData();
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

  const renderItem = ({ item }: { item: Medicine }) => {
    const isOpen = expandedId === item.id;
    const left = daysLeft(item.expiresAt);
    const exp = formatExpiry(item.expiresAt, language);

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
            backgroundColor: colors.card2,
            borderColor: colors.border,
          },
          pressed && { opacity: 0.94 },
        ]}
      >
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>

            {!isOpen ? (
              <View style={{ marginTop: 8, gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
                {qty ? <Pill label={qty} tone="muted" /> : null}
                {stockStatus ? <Pill label={stockStatus.label} tone={stockStatus.tone} /> : null}
                {status ? <Pill label={status.label} tone={status.tone} /> : null}
              </View>
            ) : null}
          </View>

          <View style={styles.iconRow}>
            <IconButton name="create-outline" onPress={() => router.push(`/medicine/${item.id}`)} />
            <IconButton name="trash-outline" tone="danger" onPress={() => onDelete(item.id)} />
          </View>
        </View>

        {isOpen ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <View style={styles.pillsRow}>
              {item.dosage ? <Pill label={t("home.dosage", { value: item.dosage })} tone="muted" /> : null}
              {qty ? <Pill label={qty} tone="muted" /> : null}
              {country ? <Pill label={country} tone="muted" /> : null}
              {stockStatus ? <Pill label={stockStatus.label} tone={stockStatus.tone} /> : null}
              {status ? <Pill label={status.label} tone={status.tone} /> : null}
            </View>

            <Pressable
              onPress={() => onUseOne(item)}
              style={({ pressed }) => [
                styles.useBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={[styles.useBtnText, { color: colors.text }]}>{t("home.useOne")}</Text>
            </Pressable>

            {item.notes ? (
              <Text style={[styles.notes, { color: colors.faint }]} numberOfLines={6}>
                {item.notes}
              </Text>
            ) : null}

            <Text style={[styles.hint, { color: colors.muted }]}>{t("home.collapse")}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>{t("home.title")}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>{t("home.subtitle")}</Text>

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
            <Text style={[styles.filterBtnText, { color: colors.text }]}>{t("home.filter")}</Text>
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

        <View style={{ height: 12 }} />
        <PrimaryButton
          title={t("home.add")}
          onPress={() => router.push("/medicine/new")}
          disabled={!householdId}
        />
      </View>

      <View style={{ height: 12 }} />

      {!householdId ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("home.empty.noHousehold")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("home.empty.noHouseholdText")}</Text>
        </View>
      ) : loading ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("common.loading")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("home.loadingText")}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerBlock: { borderRadius: 18, padding: 14, borderWidth: 1 },
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
  card: { borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 15, fontWeight: "900" },
  iconRow: { flexDirection: "row", gap: 8 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
});
