import {
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../../shared/config/firebase";

export type Household = {
  id: string;
  ownerUid: string;
  joinCode: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function generateJoinCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function createHouseholdForUser(uid: string): Promise<Household> {
  const householdRef = doc(collection(db, "households"));
  const household: Household = {
    id: householdRef.id,
    ownerUid: uid,
    joinCode: generateJoinCode(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(householdRef, household);
  return household;
}

export async function createAndAssignHousehold(uid: string): Promise<Household> {
  const household = await createHouseholdForUser(uid);

  await updateDoc(doc(db, "users", uid), {
    householdId: household.id,
    updatedAt: serverTimestamp(),
  });

  return household;
}

export async function getHouseholdById(householdId: string): Promise<Household | null> {
  const snapshot = await getDoc(doc(db, "households", householdId));
  return snapshot.exists() ? (snapshot.data() as Household) : null;
}

export async function joinHouseholdByCode(uid: string, code: string): Promise<Household> {
  const normalizedCode = normalizeCode(code);
  const householdsRef = collection(db, "households");
  const householdQuery = query(householdsRef, where("joinCode", "==", normalizedCode), limit(1));
  const snapshot = await getDocs(householdQuery);

  if (snapshot.empty) {
    throw new Error("Household code not found.");
  }

  const household = snapshot.docs[0].data() as Household;

  await updateDoc(doc(db, "users", uid), {
    householdId: household.id,
    updatedAt: serverTimestamp(),
  });

  return household;
}
