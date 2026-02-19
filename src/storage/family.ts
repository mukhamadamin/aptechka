import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FamilyMember } from "../types/family";

const KEY = "home_pharmacy_family_v1";

export async function loadFamily(): Promise<FamilyMember[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FamilyMember[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveFamily(list: FamilyMember[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export function createMember(name: string, relation?: string): FamilyMember {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    relation: relation?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateMember(m: FamilyMember, name: string, relation?: string): FamilyMember {
  return {
    ...m,
    name: name.trim(),
    relation: relation?.trim() || undefined,
    updatedAt: Date.now(),
  };
}
