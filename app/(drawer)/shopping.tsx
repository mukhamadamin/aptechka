import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createShoppingItem,
  deleteShoppingItem,
  listShoppingItems,
  toggleShoppingItem,
} from "../../src/entities/household-tools/api/tools-repository";
import { listHouseholdMembers } from "../../src/entities/family/api/family-repository";
import type { ShoppingItem } from "../../src/entities/household-tools/model/types";
import { listMedicines } from "../../src/entities/medicine/api/medicine-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { Medicine } from "../../src/types/medicine";
import { LoadingOverlay, LoadingState, PrimaryButton } from "../../src/ui/components";
import { syncWidgetMedicines, syncWidgetShopping } from "../../src/widgets/widget-sync";

function parseQuantity(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const quantity = Number(match[0].replace(",", "."));
  return Number.isFinite(quantity) ? quantity : null;
}

export default function ShoppingScreen() {
  const scrollRef = React.useRef<ScrollView>(null);
  const { colors, theme } = useAppTheme();
  const { householdId, user } = useHousehold();
  const { t } = useLanguage();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [addingItem, setAddingItem] = React.useState(false);
  const [commandLoading, setCommandLoading] = React.useState(false);

  const [shopping, setShopping] = React.useState<ShoppingItem[]>([]);
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);

  const [newItemTitle, setNewItemTitle] = React.useState("");
  const [newItemQty, setNewItemQty] = React.useState("");

  const fetchAll = React.useCallback(async () => {
    if (!householdId) {
      setShopping([]);
      setMedicines([]);
      return;
    }

    const [shoppingList, medicineList, members] = await Promise.all([
      listShoppingItems(householdId),
      listMedicines(householdId),
      listHouseholdMembers(householdId),
    ]);
    const namesByUid = Object.fromEntries(
      members.map((member) => [member.uid, member.displayName?.trim() || member.email || member.uid])
    );

    setShopping(shoppingList);
    setMedicines(medicineList);
    await Promise.all([
      syncWidgetShopping(householdId, shoppingList),
      syncWidgetMedicines(householdId, medicineList, namesByUid),
    ]);
  }, [householdId]);

  React.useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        await fetchAll();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  };

  const onAddShoppingItem = async () => {
    if (!householdId || !user) return;
    if (newItemTitle.trim().length < 2) {
      Alert.alert(t("auth.checkInput"), t("assistant.shopping.invalid"));
      return;
    }

    setAddingItem(true);
    try {
      setCommandLoading(true);
      await createShoppingItem(householdId, user.uid, {
        title: newItemTitle,
        quantity: newItemQty,
      });
      setNewItemTitle("");
      setNewItemQty("");
      await fetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
    } finally {
      setCommandLoading(false);
      setAddingItem(false);
    }
  };

  const onGenerateShopping = async () => {
    if (!householdId || !user) return;

    const existing = new Set(shopping.map((x) => x.title.trim().toLowerCase()));
    const toCreate = medicines
      .filter((m) => {
        const qty = typeof m.quantityValue === "number" ? m.quantityValue : parseQuantity(m.quantity);
        return qty !== null && qty <= 5;
      })
      .filter((m) => !existing.has(m.name.trim().toLowerCase()));

    if (!toCreate.length) {
      Alert.alert(t("common.ok"), t("assistant.shopping.generatedEmpty"));
      return;
    }

    setCommandLoading(true);
    try {
      await Promise.all(
        toCreate.map((m) =>
          createShoppingItem(householdId, user.uid, {
            title: m.name,
            quantity: m.quantityUnit ?? undefined,
            priority: "high",
          })
        )
      );

      await fetchAll();
      Alert.alert(t("common.ok"), t("assistant.shopping.generated", { count: toCreate.length }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
    } finally {
      setCommandLoading(false);
    }
  };

  const onToggleShoppingItem = async (item: ShoppingItem) => {
    if (!householdId) return;
    setCommandLoading(true);
    try {
      await toggleShoppingItem(householdId, item);
      await fetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
    } finally {
      setCommandLoading(false);
    }
  };

  const onDeleteShoppingItem = async (item: ShoppingItem) => {
    if (!householdId) return;
    setCommandLoading(true);
    try {
      await deleteShoppingItem(householdId, item.id);
      await fetchAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("common.error");
      Alert.alert(t("common.error"), message);
    } finally {
      setCommandLoading(false);
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
      contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.card}
        />
      }
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("assistant.shopping.title")}</Text>
          <Pressable onPress={onGenerateShopping} style={({ pressed }) => [pressed && { opacity: 0.8 }]}>
            <Text style={[styles.link, { color: colors.primary }]}>{t("assistant.shopping.generate")}</Text>
          </Pressable>
        </View>
        <Text style={[styles.hint, { color: colors.muted }]}>{t("assistant.shopping.subtitle")}</Text>

        <View style={styles.row}>
          <TextInput
            value={newItemTitle}
            onChangeText={setNewItemTitle}
            placeholder={t("assistant.shopping.namePlaceholder")}
            placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
            style={[
              styles.input,
              { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
          <View style={{ width: 8 }} />
          <TextInput
            value={newItemQty}
            onChangeText={setNewItemQty}
            placeholder={t("assistant.shopping.qtyPlaceholder")}
            placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
            style={[
              styles.input,
              { width: 110, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          />
        </View>

        <View style={{ height: 8 }} />
        <PrimaryButton title={t("assistant.shopping.add")} onPress={onAddShoppingItem} loading={addingItem} />

        <View style={{ height: 10 }} />

        {!householdId ? (
          <Text style={[styles.hint, { color: colors.muted }]}>{t("home.empty.noHouseholdText")}</Text>
        ) : loading ? (
          <LoadingState label={t("common.loading")} />
        ) : !loading && shopping.length === 0 ? (
          <Text style={[styles.hint, { color: colors.muted }]}>{t("assistant.shopping.empty")}</Text>
        ) : null}

        <View style={{ gap: 8 }}>
          {shopping.map((item) => (
            <View
              key={item.id}
              style={[styles.shoppingItem, { borderColor: colors.border, backgroundColor: colors.card2 }]}
            >
              <Pressable
                onPress={() => onToggleShoppingItem(item)}
                style={({ pressed }) => [
                  styles.check,
                  {
                    borderColor: item.done ? colors.primary : colors.border,
                    backgroundColor: item.done ? colors.primarySoft : colors.surface,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Ionicons
                  name={item.done ? "checkmark" : "ellipse-outline"}
                  size={16}
                  color={item.done ? colors.primary : colors.muted}
                />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.shoppingTitle,
                    {
                      color: colors.text,
                      textDecorationLine: item.done ? "line-through" : "none",
                    },
                  ]}
                >
                  {item.title}
                </Text>
                {item.quantity ? <Text style={[styles.hint, { color: colors.muted }]}>{item.quantity}</Text> : null}
              </View>

              <Pressable
                onPress={() => onDeleteShoppingItem(item)}
                style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
    <LoadingOverlay visible={commandLoading} label={t("common.loading")} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  link: { fontSize: 13, fontWeight: "800" },
  hint: { marginTop: 4, lineHeight: 18 },
  row: { marginTop: 10, flexDirection: "row", alignItems: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  shoppingItem: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  shoppingTitle: { fontSize: 14, fontWeight: "800" },
  delBtn: { padding: 4 },
});
