import { collection, getDocs, query, where } from "firebase/firestore";
import type { UserProfile } from "../../session/model/types";
import { db } from "../../../shared/config/firebase";

export async function listHouseholdMembers(householdId: string): Promise<UserProfile[]> {
  const usersRef = collection(db, "users");
  const usersQuery = query(usersRef, where("householdId", "==", householdId));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs
    .map((row) => row.data() as UserProfile)
    .sort((a, b) => (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? ""));
}
