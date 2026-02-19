import { Ionicons } from "@expo/vector-icons";
import * as React from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  createAndAssignHousehold,
  getHouseholdById,
  joinHouseholdByCode,
} from "../../src/entities/household/api/household-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { logout } from "../../src/features/auth/api/auth-service";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import { PrimaryButton } from "../../src/ui/components";

export default function SettingsScreen() {
  const { colors, theme, setTheme } = useAppTheme();
  const { user, householdId, refresh } = useHousehold();

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState("");
  const [currentCode, setCurrentCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!householdId) {
      setCurrentCode(null);
      return;
    }

    (async () => {
      const household = await getHouseholdById(householdId);
      if (!cancelled) {
        setCurrentCode(household?.joinCode ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const onJoin = async () => {
    if (!user) return;

    if (joinCode.trim().length < 4) {
      Alert.alert("Check your input", "Please enter a valid household code.");
      return;
    }

    setJoining(true);
    try {
      const household = await joinHouseholdByCode(user.uid, joinCode);
      refresh();
      setJoinCode("");
      Alert.alert("Joined", `You are now in household ${household.joinCode}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join household.";
      Alert.alert("Error", message);
    } finally {
      setJoining(false);
    }
  };

  const onCreateHousehold = async () => {
    if (!user) return;

    setCreating(true);
    try {
      const household = await createAndAssignHousehold(user.uid);
      refresh();
      Alert.alert("Created", `Your new household code is ${household.joinCode}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create household.";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sign out.";
      Alert.alert("Error", message);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>Manage theme and household sharing.</Text>

        <View style={{ height: 12 }} />

        <Pressable
          onPress={() => setTheme("dark")}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: theme === "dark" ? colors.primary : colors.border,
              backgroundColor: theme === "dark" ? colors.primarySoft : colors.surface,
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Dark</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>High contrast and calm.</Text>
          </View>
          {theme === "dark" ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
        </Pressable>

        <Pressable
          onPress={() => setTheme("light")}
          style={({ pressed }) => [
            styles.option,
            {
              borderColor: theme === "light" ? colors.primary : colors.border,
              backgroundColor: theme === "light" ? colors.primarySoft : colors.surface,
            },
            pressed && { opacity: 0.9 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>Light</Text>
            <Text style={[styles.optionText, { color: colors.muted }]}>Brighter and more neutral.</Text>
          </View>
          {theme === "light" ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
        </Pressable>

        <View style={{ height: 16 }} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Household</Text>
        <Text style={[styles.optionText, { color: colors.muted }]}>Current code: {currentCode ?? "not loaded"}</Text>

        {!householdId ? (
          <>
            <View style={{ height: 10 }} />
            <PrimaryButton title="Create Household" onPress={onCreateHousehold} loading={creating} />
          </>
        ) : null}

        <TextInput
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          placeholder="Enter household code"
          placeholderTextColor="rgba(120,120,120,0.55)"
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        />

        <PrimaryButton title="Join Household" onPress={onJoin} loading={joining} />

        <View style={{ height: 16 }} />
        <PrimaryButton title="Sign Out" onPress={onLogout} loading={loggingOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 12 },
  card: { borderRadius: 18, padding: 14, borderWidth: 1 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  option: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionTitle: { fontSize: 15, fontWeight: "900" },
  optionText: { marginTop: 4, lineHeight: 18 },
  sectionTitle: { marginTop: 8, fontSize: 16, fontWeight: "900" },
  input: {
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
});
