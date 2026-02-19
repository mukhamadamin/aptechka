import { doc, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { getMyProfile } from "../../../features/auth/api/auth-service";
import { db } from "../../../shared/config/firebase";
import type { UserProfile } from "./types";
import { useAuth } from "./use-auth";

export function useHousehold() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const nextProfile = await getMyProfile(user.uid);
    setProfile(nextProfile);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return {
    user,
    profile,
    householdId: profile?.householdId ?? null,
    loading: authLoading || loading,
    refresh,
  };
}
