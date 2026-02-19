import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { createMember, loadFamily, saveFamily, updateMember } from "../../src/storage/family";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { FamilyMember } from "../../src/types/family";
import { IconButton, Pill, PrimaryButton } from "../../src/ui/components";

export default function FamilyScreen() {
  const { colors } = useAppTheme();

  const [items, setItems] = React.useState<FamilyMember[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FamilyMember | null>(null);
  const [name, setName] = React.useState("");
  const [relation, setRelation] = React.useState("");

  const fetchData = React.useCallback(async () => {
    setItems(await loadFamily());
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const startCreate = () => {
    setEditing(null);
    setName("");
    setRelation("");
    setOpen(true);
  };

  const startEdit = (m: FamilyMember) => {
    setEditing(m);
    setName(m.name);
    setRelation(m.relation ?? "");
    setOpen(true);
  };

  const onDelete = (id: string) => {
    Alert.alert("Удалить", "Удалить члена семьи?", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          const next = items.filter((x) => x.id !== id);
          setItems(next);
          await saveFamily(next);
        },
      },
    ]);
  };

  const onSave = async () => {
    const n = name.trim();
    if (n.length < 2) {
      Alert.alert("Проверьте данные", "Имя должно быть минимум 2 символа.");
      return;
    }

    if (!editing) {
      const created = createMember(n, relation);
      const next = [created, ...items];
      setItems(next);
      await saveFamily(next);
      setOpen(false);
      return;
    }

    const idx = items.findIndex((x) => x.id === editing.id);
    if (idx === -1) return;

    const updated = updateMember(items[idx], n, relation);
    const next = [...items];
    next[idx] = updated;
    setItems(next);
    await saveFamily(next);
    setOpen(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.h1, { color: colors.text }]}>Члены семьи</Text>
          <Text style={[styles.h2, { color: colors.muted }]}>
            Можно вести список, чтобы позже привязать лекарства и напоминания.
          </Text>
        </View>
        <IconButton name="add-outline" onPress={startCreate} />
      </View>

      <View style={{ height: 12 }} />

      {items.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Список пуст</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Добавьте первого члена семьи.
          </Text>
          <View style={{ height: 12 }} />
          <PrimaryButton title="Добавить" onPress={startCreate} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card2, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.relation ? (
                    <View style={{ marginTop: 8 }}>
                      <Pill label={item.relation} tone="muted" />
                    </View>
                  ) : null}
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <IconButton name="create-outline" onPress={() => startEdit(item)} />
                  <IconButton name="trash-outline" tone="danger" onPress={() => onDelete(item.id)} />
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editing ? "Редактирование" : "Добавление"}
              </Text>
              <Pressable onPress={() => setOpen(false)} style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
                <Ionicons name="close-outline" size={24} color={colors.text} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.faint }]}>Имя</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Например: Алина"
              placeholderTextColor="rgba(120,120,120,0.55)"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />

            <Text style={[styles.label, { color: colors.faint, marginTop: 12 }]}>Кем приходится</Text>
            <TextInput
              value={relation}
              onChangeText={setRelation}
              placeholder="Например: мама"
              placeholderTextColor="rgba(120,120,120,0.55)"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />

            <View style={{ height: 14 }} />
            <PrimaryButton title="Сохранить" onPress={onSave} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 12 },
  header: { borderRadius: 18, padding: 14, borderWidth: 1, flexDirection: "row", gap: 12, alignItems: "center" },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },

  card: { borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  title: { fontSize: 15, fontWeight: "900" },

  empty: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 16, justifyContent: "center" },
  modalCard: { borderRadius: 18, padding: 14, borderWidth: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: "900" },

  label: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
});
