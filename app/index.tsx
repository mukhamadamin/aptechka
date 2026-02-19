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
import { cancelNotificationIds, ensureAndroidChannel, ensureNotificationPermission } from "../src/notifications/notifications";
import { loadMedicines, saveMedicines } from "../src/storage/medicines";
import type { Medicine } from "../src/types/medicine";
import { Chip, GhostButton, PrimaryButton } from "../src/ui/components";
import { colors, radius, shadow } from "../src/ui/theme";

function daysLeft(expiresAt?: string) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  // считаем по дням (без времени)
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

export default function HomeScreen() {
  const router = useRouter();

  const [items, setItems] = React.useState<Medicine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [query, setQuery] = React.useState("");

  const fetchData = React.useCallback(async () => {
    const list = await loadMedicines();
    setItems(list);
  }, []);

  // Разрешения на уведомления — один раз
  React.useEffect(() => {
    (async () => {
      await ensureAndroidChannel();
      await ensureNotificationPermission();
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          await fetchData();
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [fetchData])
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
          // отменяем уведомления
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
    if (!q) return items;
    return items.filter((x) => {
      const a = (x.name ?? "").toLowerCase();
      const b = (x.dosage ?? "").toLowerCase();
      const c = (x.notes ?? "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q);
    });
  }, [items, query]);

  const renderItem = ({ item }: { item: Medicine }) => {
    const subtitle = [item.dosage, item.quantity].filter(Boolean).join(" • ");
    const left = daysLeft(item.expiresAt);
    const exp = formatExpiry(item.expiresAt);

    let expiryLabel: string | null = null;
    if (left !== null && exp) {
      if (left < 0) expiryLabel = `Срок истёк • ${exp}`;
      else if (left === 0) expiryLabel = `Истекает сегодня • ${exp}`;
      else if (left <= 7) expiryLabel = `Истекает через ${left} дн. • ${exp}`;
      else expiryLabel = `Срок: ${exp}`;
    } else if (exp) {
      expiryLabel = `Срок: ${exp}`;
    }

    const danger = left !== null && left <= 7;

    return (
      <Pressable
        onPress={() => router.push(`/medicine/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(`/medicine/${item.id}`)}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.actionText}>Редактировать</Text>
            </Pressable>

            <Pressable
              onPress={() => onDelete(item.id)}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionDanger,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.danger }]}>Удалить</Text>
            </Pressable>
          </View>
        </View>

        {subtitle ? (
          <View style={{ marginTop: 10 }}>
            <Chip label={subtitle} />
          </View>
        ) : null}

        {expiryLabel ? (
          <View style={{ marginTop: 10 }}>
            <View
              style={[
                styles.expiryChip,
                danger && { borderColor: "rgba(239,68,68,0.30)", backgroundColor: "rgba(239,68,68,0.07)" },
              ]}
            >
              <Text style={[styles.expiryText, danger && { color: colors.text }]}>
                {expiryLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {item.notes ? (
          <Text style={styles.notes} numberOfLines={2}>
            {item.notes}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.h1}>Ваши лекарства</Text>
        <Text style={styles.h2}>Поиск, срок годности и напоминания — всё локально на устройстве.</Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по названию, дозировке, заметкам"
          placeholderTextColor="rgba(232,238,246,0.35)"
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <View style={{ height: 12 }} />
        <PrimaryButton title="Добавить лекарство" onPress={() => router.push("/medicine/new")} />
      </View>

      <View style={{ height: 14 }} />

      {loading ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Загрузка</Text>
          <Text style={styles.emptyText}>Подготавливаем список лекарств.</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>{query.trim() ? "Ничего не найдено" : "Список пуст"}</Text>
          <Text style={styles.emptyText}>
            {query.trim()
              ? "Попробуйте изменить запрос."
              : "Добавьте первое лекарство — оно появится на главном экране."}
          </Text>
          <View style={{ height: 12 }} />
          <GhostButton title="Добавить" onPress={() => router.push("/medicine/new")} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(x) => x.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerBlock: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  h1: { color: colors.text, fontSize: 22, fontWeight: "900" },
  h2: { color: colors.muted, marginTop: 8, lineHeight: 20 },

  search: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },

  card: {
    backgroundColor: colors.card2,
    borderRadius: radius.xl,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: { gap: 10 },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },

  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  actionDanger: {
    borderColor: "rgba(239,68,68,0.28)",
    backgroundColor: "rgba(239,68,68,0.05)",
  },
  actionText: { color: colors.text, fontSize: 13, fontWeight: "800" },

  expiryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.10)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.20)",
  },
  expiryText: { color: colors.muted, fontSize: 12, fontWeight: "700" },

  notes: { color: colors.faint, marginTop: 10, lineHeight: 18 },

  emptyWrap: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  emptyText: { color: colors.muted, marginTop: 8, lineHeight: 20 },
});
