import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { ShoppingItem } from "../entities/household-tools/model/types";
import { buildTodayDosePlan } from "../features/adherence/model/dose-tracker";
import type { Medicine } from "../types/medicine";

type WidgetListItem = {
  id: string;
  text: string;
};

type WidgetPayload = {
  householdId: string | null;
  shopping: WidgetListItem[];
  medicines: WidgetListItem[];
  updatedAt: number;
};

const KEY = "home_pharmacy_widget_payload_v1";

const EMPTY_PAYLOAD: WidgetPayload = {
  householdId: null,
  shopping: [],
  medicines: [],
  updatedAt: Date.now(),
};

function appPackageName() {
  return Constants.expoConfig?.android?.package ?? "com.anonymous.HomeAidKit";
}

function canUseNativeWidgetsModule() {
  if (Platform.OS !== "android") return false;

  // Expo Go cannot load custom native modules from app plugins.
  if (Constants.executionEnvironment === "storeClient") return false;

  return true;
}

function medicineItems(input: Medicine[], memberNamesByUid?: Record<string, string>): WidgetListItem[] {
  const byId = new Map(input.map((item) => [item.id, item]));
  const todayPlan = buildTodayDosePlan(input, (uid) => memberNamesByUid?.[uid]);
  const seen = new Set<string>();

  return todayPlan
    .map((dose) => {
      const medicine = byId.get(dose.medicineId);
      if (!medicine || seen.has(medicine.id)) return null;
      seen.add(medicine.id);

      const who = dose.targetMemberNames.length ? ` - ${dose.targetMemberNames.join(", ")}` : "";
      return {
        id: medicine.id,
        text: `${dose.time} ${dose.medicineName}${who}`,
      } satisfies WidgetListItem;
    })
    .filter((item): item is WidgetListItem => item !== null)
    .slice(0, 6);
}

function shoppingItems(input: ShoppingItem[]): WidgetListItem[] {
  return input
    .filter((item) => !item.done)
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      text: item.quantity ? `${item.title} - ${item.quantity}` : item.title,
    }));
}

function normalizeItems(value: unknown): WidgetListItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        if (!text) return null;
        return { id: text, text } satisfies WidgetListItem;
      }

      if (!item || typeof item !== "object") return null;
      const id = typeof (item as { id?: unknown }).id === "string" ? (item as { id: string }).id.trim() : "";
      const text =
        typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text.trim()
          : "";

      if (!id || !text) return null;
      return { id, text } satisfies WidgetListItem;
    })
    .filter((item): item is WidgetListItem => item !== null);
}

async function loadPayload(): Promise<WidgetPayload> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...EMPTY_PAYLOAD };
  try {
    const parsed = JSON.parse(raw) as Partial<WidgetPayload>;
    return {
      householdId: typeof parsed.householdId === "string" ? parsed.householdId : null,
      shopping: normalizeItems(parsed.shopping),
      medicines: normalizeItems(parsed.medicines),
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return { ...EMPTY_PAYLOAD };
  }
}

async function persistPayload(payload: WidgetPayload) {
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));

  if (!canUseNativeWidgetsModule()) return;

  try {
    const widgets = await import("@bittingz/expo-widgets");
    widgets.setWidgetData(JSON.stringify(payload), appPackageName());
  } catch {
    // Keep app flow resilient if widget bridge is unavailable.
  }
}

export async function syncWidgetMedicines(
  householdId: string,
  input: Medicine[],
  memberNamesByUid?: Record<string, string>
) {
  const prev = await loadPayload();
  await persistPayload({
    ...prev,
    householdId,
    medicines: medicineItems(input, memberNamesByUid),
    updatedAt: Date.now(),
  });
}

export async function syncWidgetShopping(householdId: string, input: ShoppingItem[]) {
  const prev = await loadPayload();
  await persistPayload({
    ...prev,
    householdId,
    shopping: shoppingItems(input),
    updatedAt: Date.now(),
  });
}
