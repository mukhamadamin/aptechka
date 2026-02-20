import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { ShoppingItem } from "../entities/household-tools/model/types";
import { buildTodayDosePlan } from "../features/adherence/model/dose-tracker";
import type { Medicine } from "../types/medicine";

type WidgetPayload = {
  shopping: string[];
  medicines: string[];
  updatedAt: number;
};

const KEY = "home_pharmacy_widget_payload_v1";

const EMPTY_PAYLOAD: WidgetPayload = {
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

function medicineLines(input: Medicine[], memberNamesByUid?: Record<string, string>): string[] {
  const todayPlan = buildTodayDosePlan(input, (uid) => memberNamesByUid?.[uid]);

  return todayPlan.slice(0, 8).map((dose) => {
    const who = dose.targetMemberNames.length ? ` - ${dose.targetMemberNames.join(", ")}` : "";
    return `${dose.time} ${dose.medicineName}${who}`;
  });
}

function shoppingLines(input: ShoppingItem[]): string[] {
  return input
    .filter((item) => !item.done)
    .slice(0, 8)
    .map((item) => (item.quantity ? `${item.title} - ${item.quantity}` : item.title));
}

async function loadPayload(): Promise<WidgetPayload> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return { ...EMPTY_PAYLOAD };
  try {
    const parsed = JSON.parse(raw) as WidgetPayload;
    return {
      shopping: Array.isArray(parsed.shopping) ? parsed.shopping : [],
      medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
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

export async function syncWidgetMedicines(input: Medicine[], memberNamesByUid?: Record<string, string>) {
  const prev = await loadPayload();
  await persistPayload({
    ...prev,
    medicines: medicineLines(input, memberNamesByUid),
    updatedAt: Date.now(),
  });
}

export async function syncWidgetShopping(input: ShoppingItem[]) {
  const prev = await loadPayload();
  await persistPayload({
    ...prev,
    shopping: shoppingLines(input),
    updatedAt: Date.now(),
  });
}
