import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Medicine, MedicineForm } from "../types/medicine";

const KEY = "home_pharmacy_medicines_v2";

function safeTrim(v?: string) {
  const s = (v ?? "").trim();
  return s.length ? s : undefined;
}

export async function loadMedicines(): Promise<Medicine[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Medicine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveMedicines(list: Medicine[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export function normalizeForm(input: MedicineForm): MedicineForm {
  const remind =
    typeof input.remindDaysBefore === "number" && Number.isFinite(input.remindDaysBefore)
      ? Math.max(0, Math.min(365, Math.floor(input.remindDaysBefore)))
      : undefined;

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const expiresISO =
    expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.toISOString() : undefined;

  return {
    name: (input.name ?? "").trim(),
    dosage: safeTrim(input.dosage),
    quantity: safeTrim(input.quantity),
    notes: safeTrim(input.notes),
    expiresAt: expiresISO,
    remindDaysBefore: remind,
  };
}

export function validateForm(form: MedicineForm) {
  if (!form.name || form.name.trim().length < 2) {
    return "Please enter a medicine name (at least 2 characters).";
  }
  return null;
}

export function createMedicine(form: MedicineForm): Medicine {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    ...normalizeForm(form),
    createdAt: now,
    updatedAt: now,
    notificationIds: [],
  };
}

export function updateMedicine(m: Medicine, patch: MedicineForm): Medicine {
  return {
    ...m,
    ...normalizeForm(patch),
    updatedAt: Date.now(),
  };
}
