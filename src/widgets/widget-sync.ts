import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { ShoppingItem } from "../entities/household-tools/model/types";
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

function medicineLines(input: Medicine[]): string[] {
  return input.slice(0, 8).map((item) => {
    const qty =
      typeof item.quantityValue === "number"
        ? `${item.quantityValue} ${item.quantityUnit ?? ""}`.trim()
        : item.quantity ?? "";

    return qty ? `${item.name} (${qty})` : item.name;
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

  if (Platform.OS !== "android") return;

  try {
    const widgets = await import("@bittingz/expo-widgets");
    widgets.setWidgetData(JSON.stringify(payload), appPackageName());
  } catch {
    // Keep app flow resilient if widget bridge is unavailable.
  }
}

export async function syncWidgetMedicines(input: Medicine[]) {
  const prev = await loadPayload();
  await persistPayload({
    ...prev,
    medicines: medicineLines(input),
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
