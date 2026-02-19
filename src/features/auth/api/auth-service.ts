import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { createHouseholdForUser } from "../../../entities/household/api/household-repository";
import type { UserProfile } from "../../../entities/session/model/types";
import { auth, db } from "../../../shared/config/firebase";

export type { UserProfile };

export async function registerWithEmail(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<User> {
  const { email, password, displayName } = params;
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  if (displayName?.trim()) {
    await updateProfile(credential.user, { displayName: displayName.trim() });
  }

  const household = await createHouseholdForUser(credential.user.uid);

  await setDoc(
    doc(db, "users", credential.user.uid),
    {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: credential.user.displayName ?? displayName?.trim() ?? null,
      householdId: household.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies UserProfile,
    { merge: true }
  );

  return credential.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function getMyProfile(uid: string): Promise<UserProfile | null> {
  const profile = await getDoc(doc(db, "users", uid));
  return profile.exists() ? (profile.data() as UserProfile) : null;
}

export async function updateMyProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
