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
import { Ionicons } from "@expo/vector-icons";
import { cancelNotificationIds } from "../../src/notifications/notifications";
import { loadMedicines, saveMedicines } from "../../src/storage/medicines";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { Medicine } from "../../src/types/medicine";
import { IconButton, Pill, PrimaryButton } from "../../src/ui/components";

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

function formatExpiry(expiresAt?: string) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy}`;
}

type FilterMode = "all" | "expiring" | "expired" | "noExpiry" | "withNotes";

const FILTER_LABELS: Record<FilterMode, string> = {
  all: "Все",
  expiring: "Истекают (<= 7 дней)",
  expired: "Просроченные",
  noExpiry: "Без срока",
  withNotes: "С примечанием",
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [items, setItems] = React.useState<Medicine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<FilterMode>("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    const list = await loadMedicines();
    setItems(list);
  }, []);

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
      let active = true;
      (async () => {
        const list = await loadMedicines();
        if (active) setItems(list);
      })();
      return () => {
        active = false;
      };
    }, [])
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
    const med = items.find((x) => x.id === id);

    Alert.alert("Удалить лекарство", "Действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await cancelNotificationIds(med?.notificationIds);
          const next = items.filter((x) => x.id !== id);
          setItems(next);
          await saveMedicines(next);
        },
      },
    ]);
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((x) => {
      const a = (x.name ?? "").toLowerCase();
      const b = (x.dosage ?? "").toLowerCase();
      const c = (x.notes ?? "").toLowerCase();
      const queryMatch = !q || a.includes(q) || b.includes(q) || c.includes(q);
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
    const exp = formatExpiry(item.expiresAt);

    let status: { label: string; tone: "default" | "danger" | "muted" } | null = null;

    if (left !== null && exp) {
      if (left < 0) status = { label: `Срок истёк • ${exp}`, tone: "danger" };
      else if (left === 0) status = { label: `Истекает сегодня • ${exp}`, tone: "danger" };
      else if (left <= 7) status = { label: `Истекает через ${left} дн. • ${exp}`, tone: "danger" };
      else status = { label: `Срок: ${exp}`, tone: "muted" };
    } else if (exp) {
      status = { label: `Срок: ${exp}`, tone: "muted" };
    }

    const qty = item.quantity ? `Кол-во: ${item.quantity}` : null;

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
        {/* Верхняя строка: название + иконки */}
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>

            {/* В свернутом виде показываем только 1–2 строки */}
            {!isOpen ? (
              <View style={{ marginTop: 8, gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
                {qty ? <Pill label={qty} tone="muted" /> : null}
                {status ? <Pill label={status.label} tone={status.tone} /> : null}
              </View>
            ) : null}
          </View>

          <View style={styles.iconRow}>
            <IconButton
              name="create-outline"
              onPress={() => router.push(`/medicine/${item.id}`)}
            />
            <IconButton
              name="trash-outline"
              tone="danger"
              onPress={() => onDelete(item.id)}
            />
          </View>
        </View>

        {/* Раскрытая часть */}
        {isOpen ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <View style={styles.pillsRow}>
              {item.dosage ? <Pill label={`Дозировка: ${item.dosage}`} tone="muted" /> : null}
              {item.quantity ? <Pill label={`Кол-во: ${item.quantity}`} tone="muted" /> : null}
              {status ? <Pill label={status.label} tone={status.tone} /> : null}
            </View>

            {item.notes ? (
              <Text style={[styles.notes, { color: colors.faint }]} numberOfLines={6}>
                {item.notes}
              </Text>
            ) : null}

            <Text style={[styles.hint, { color: colors.muted }]}>
              Нажмите ещё раз, чтобы свернуть.
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>Домашняя аптечка</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>
          Быстрый список. Детали открываются по нажатию.
        </Text>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Поиск по названию, дозировке, заметкам"
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
            <Text style={[styles.filterBtnText, { color: colors.text }]}>Фильтр</Text>
          </Pressable>
        </View>

        {filtersOpen ? (
          <View style={styles.filtersWrap}>
            {(Object.keys(FILTER_LABELS) as FilterMode[]).map((mode) => {
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
                  <Text style={[styles.filterChipText, { color: colors.text }]}>
                    {FILTER_LABELS[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ height: 12 }} />
        <PrimaryButton title="Добавить лекарство" onPress={() => router.push("/medicine/new")} />
      </View>

      <View style={{ height: 12 }} />

      {loading ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Загрузка</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Подготавливаем список.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={[styles.emptyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {query.trim() ? "Ничего не найдено" : "Список пуст"}
          </Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {query.trim() || filterMode !== "all"
              ? "Измените запрос или фильтр."
              : "Добавьте первое лекарство."}
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

  headerBlock: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },

  searchRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  filterBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  filtersWrap: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "800",
  },

  card: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  title: { fontSize: 15, fontWeight: "900" },
  iconRow: { flexDirection: "row", gap: 8 },

  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  notes: { lineHeight: 18 },
  hint: { fontSize: 12, fontWeight: "700" },

  emptyWrap: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },
});
