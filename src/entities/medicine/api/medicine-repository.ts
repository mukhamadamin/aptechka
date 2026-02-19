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
import type { Medicine } from "../../../types/medicine";

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export async function listMedicines(householdId: string): Promise<Medicine[]> {
  const medicinesRef = collection(db, "households", householdId, "medicines");
  const medicinesQuery = query(medicinesRef, orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(medicinesQuery);

  return snapshot.docs.map((row) => row.data() as Medicine);
}

export async function getMedicineById(
  householdId: string,
  medicineId: string
): Promise<Medicine | null> {
  const medicineRef = doc(db, "households", householdId, "medicines", medicineId);
  const snapshot = await getDoc(medicineRef);

  return snapshot.exists() ? (snapshot.data() as Medicine) : null;
}

export async function saveMedicine(householdId: string, medicine: Medicine): Promise<void> {
  await setDoc(
    doc(db, "households", householdId, "medicines", medicine.id),
    stripUndefined(medicine)
  );
}

export async function deleteMedicine(householdId: string, medicineId: string): Promise<void> {
  await deleteDoc(doc(db, "households", householdId, "medicines", medicineId));
}
