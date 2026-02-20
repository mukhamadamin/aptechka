import { collection, doc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../../../shared/config/firebase";
import type { MedicineIntakeLog } from "../../../types/medicine";

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export async function addMedicineIntakeLog(
  householdId: string,
  medicineId: string,
  input: {
    actorUid: string;
    actorName: string;
    amount: number;
    unit?: MedicineIntakeLog["unit"];
    takenAt?: number;
  }
): Promise<MedicineIntakeLog> {
  const createdAt = Date.now();
  const ref = doc(collection(db, "households", householdId, "medicines", medicineId, "intakeLogs"));

  const log: MedicineIntakeLog = {
    id: ref.id,
    medicineId,
    actorUid: input.actorUid,
    actorName: input.actorName.trim() || input.actorUid,
    amount: input.amount,
    unit: input.unit,
    takenAt: input.takenAt ?? createdAt,
    createdAt,
  };

  await setDoc(ref, stripUndefined(log));
  return log;
}

export async function listMedicineIntakeLogs(
  householdId: string,
  medicineId: string,
  maxItems = 50
): Promise<MedicineIntakeLog[]> {
  const ref = collection(db, "households", householdId, "medicines", medicineId, "intakeLogs");
  const snapshot = await getDocs(query(ref, orderBy("takenAt", "desc"), limit(maxItems)));
  return snapshot.docs.map((row) => row.data() as MedicineIntakeLog);
}
