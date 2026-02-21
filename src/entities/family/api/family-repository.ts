import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
} from "firebase/auth";
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getHouseholdById } from "../../household/api/household-repository";
import type { UserProfile } from "../../session/model/types";
import { db, firebaseConfig } from "../../../shared/config/firebase";

export async function listHouseholdMembers(householdId: string): Promise<UserProfile[]> {
  const usersRef = collection(db, "users");
  const usersQuery = query(usersRef, where("householdId", "==", householdId));
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs
    .map((row) => row.data() as UserProfile)
    .sort((a, b) => (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? ""));
}

function localizeAuthError(message: string): string {
  if (message.includes("auth/email-already-in-use")) return "family.memberCreate.emailInUse";
  if (message.includes("auth/invalid-email")) return "family.memberCreate.invalidEmail";
  if (message.includes("auth/weak-password")) return "family.memberCreate.weakPassword";
  return message;
}

export async function createHouseholdMemberAccount(params: {
  actorUid: string;
  householdId: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<UserProfile> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;
  const displayName = params.displayName?.trim() ?? null;

  if (!email.includes("@") || password.length < 6) {
    throw new Error("family.memberCreate.invalidInput");
  }

  if (displayName !== null && displayName.length > 0 && displayName.length < 2) {
    throw new Error("family.memberCreate.nameInvalid");
  }

  const household = await getHouseholdById(params.householdId);
  if (!household) {
    throw new Error("family.memberCreate.householdNotFound");
  }

  if (household.ownerUid !== params.actorUid) {
    throw new Error("family.memberCreate.ownerOnly");
  }

  const secondaryApp = initializeApp(
    firebaseConfig,
    `member-create-${params.actorUid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    const profile: UserProfile = {
      uid: credential.user.uid,
      email: credential.user.email ?? email,
      displayName: credential.user.displayName ?? displayName,
      householdId: params.householdId,
      subscriptionActive: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", credential.user.uid), profile, { merge: true });
    return profile;
  } catch (error) {
    const message = error instanceof Error ? localizeAuthError(error.message) : "family.memberCreate.failed";
    throw new Error(message);
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}
