import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../shared/config/firebase";
import type { EmergencyProfile, ShoppingItem, ShoppingPriority } from "../model/types";

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export async function listShoppingItems(householdId: string): Promise<ShoppingItem[]> {
  const ref = collection(db, "households", householdId, "shopping");
  const snapshot = await getDocs(query(ref, orderBy("updatedAt", "desc")));
  return snapshot.docs.map((row) => row.data() as ShoppingItem);
}

export async function createShoppingItem(
  householdId: string,
  uid: string,
  input: { title: string; quantity?: string; priority?: ShoppingPriority }
): Promise<ShoppingItem> {
  const now = Date.now();
  const ref = doc(collection(db, "households", householdId, "shopping"));
  const item: ShoppingItem = {
    id: ref.id,
    title: input.title.trim(),
    quantity: input.quantity?.trim() || undefined,
    done: false,
    priority: input.priority ?? "normal",
    createdByUid: uid,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(ref, stripUndefined(item));
  return item;
}

export async function saveShoppingItem(householdId: string, item: ShoppingItem): Promise<void> {
  await setDoc(doc(db, "households", householdId, "shopping", item.id), stripUndefined(item));
}

export async function toggleShoppingItem(
  householdId: string,
  item: ShoppingItem
): Promise<ShoppingItem> {
  const next: ShoppingItem = {
    ...item,
    done: !item.done,
    updatedAt: Date.now(),
  };

  await saveShoppingItem(householdId, next);
  return next;
}

export async function deleteShoppingItem(householdId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, "households", householdId, "shopping", itemId));
}

export async function getEmergencyProfile(householdId: string): Promise<EmergencyProfile | null> {
  const snapshot = await getDoc(doc(db, "households", householdId, "meta", "emergency"));
  return snapshot.exists() ? (snapshot.data() as EmergencyProfile) : null;
}

export async function saveEmergencyProfile(
  householdId: string,
  profile: EmergencyProfile
): Promise<void> {
  await setDoc(
    doc(db, "households", householdId, "meta", "emergency"),
    stripUndefined({ ...profile, updatedAt: Date.now() }),
    { merge: true }
  );
}
