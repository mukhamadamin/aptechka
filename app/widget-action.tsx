import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { listHouseholdMembers } from "../src/entities/family/api/family-repository";
import {
  listShoppingItems,
  toggleShoppingItem,
} from "../src/entities/household-tools/api/tools-repository";
import { addMedicineIntakeLog } from "../src/entities/medicine/api/intake-history-repository";
import {
  getMedicineById,
  listMedicines,
  saveMedicine,
} from "../src/entities/medicine/api/medicine-repository";
import { useHousehold } from "../src/entities/session/model/use-household";
import { useAppTheme } from "../src/theme/ThemeProvider";
import { syncWidgetMedicines, syncWidgetShopping } from "../src/widgets/widget-sync";

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

export default function WidgetActionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    action?: string;
    householdId?: string;
    id?: string;
  }>();
  const { colors } = useAppTheme();
  const { user, profile, loading } = useHousehold();
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (done || loading) return;

    const run = async () => {
      try {
        const action = typeof params.action === "string" ? params.action : null;
        const householdIdParam = typeof params.householdId === "string" ? params.householdId : null;
        const id = typeof params.id === "string" ? params.id : null;

        if (!user || !profile?.householdId || !id || !action) {
          return;
        }

        const householdId = profile.householdId;
        if (householdIdParam && householdIdParam !== householdId) {
          return;
        }

        if (action === "take_medicine") {
          const medicine = await getMedicineById(householdId, id);
          if (medicine) {
            const currentQuantity =
              typeof medicine.quantityValue === "number"
                ? medicine.quantityValue
                : parseQuantity(medicine.quantity);

            if (currentQuantity !== null && currentQuantity > 0) {
              const nextQuantity = Math.max(0, Math.round((currentQuantity - 1) * 100) / 100);
              await saveMedicine(householdId, {
                ...medicine,
                quantityValue: nextQuantity,
                quantity: formatQuantity(nextQuantity, medicine.quantityUnit, medicine.quantity),
                updatedAt: Date.now(),
              });
              await addMedicineIntakeLog(householdId, medicine.id, {
                actorUid: user.uid,
                actorName: profile.displayName ?? user.email ?? user.uid,
                amount: 1,
                unit: medicine.quantityUnit,
              });
            }
          }
        }

        if (action === "toggle_shopping") {
          const shopping = await listShoppingItems(householdId);
          const item = shopping.find((row) => row.id === id);
          if (item && !item.done) {
            await toggleShoppingItem(householdId, item);
          }
        }

        const [shoppingList, medicineList, members] = await Promise.all([
          listShoppingItems(householdId),
          listMedicines(householdId),
          listHouseholdMembers(householdId),
        ]);
        const namesByUid = Object.fromEntries(
          members.map((member) => [member.uid, member.displayName?.trim() || member.email || member.uid])
        );

        await Promise.all([
          syncWidgetShopping(householdId, shoppingList),
          syncWidgetMedicines(householdId, medicineList, namesByUid),
        ]);
      } finally {
        setDone(true);
        router.replace("/(drawer)");
      }
    };

    run().catch(() => {
      setDone(true);
      router.replace("/(drawer)");
    });
  }, [done, loading, params.action, params.householdId, params.id, profile?.displayName, profile?.householdId, router, user]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[styles.text, { color: colors.muted }]}>Applying widget action...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  text: { fontSize: 13 },
});
