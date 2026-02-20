import * as React from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createHouseholdMemberAccount,
  listHouseholdMembers,
} from "../../src/entities/family/api/family-repository";
import { getHouseholdById } from "../../src/entities/household/api/household-repository";
import type { UserProfile } from "../../src/entities/session/model/types";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import { LoadingState, Pill, PrimaryButton } from "../../src/ui/components";

function localizeError(message: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (message.startsWith("family.memberCreate.")) return t(message);
  return message;
}

export default function FamilyScreen() {
  const { colors, theme } = useAppTheme();
  const { householdId, user } = useHousehold();
  const { t } = useLanguage();

  const [members, setMembers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [ownerUid, setOwnerUid] = React.useState<string | null>(null);
  const [memberName, setMemberName] = React.useState("");
  const [memberEmail, setMemberEmail] = React.useState("");
  const [memberPassword, setMemberPassword] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const isOwner = Boolean(user?.uid && ownerUid && user.uid === ownerUid);

  const fetchData = React.useCallback(async () => {
    if (!householdId) {
      setMembers([]);
      setOwnerUid(null);
      return;
    }

    const [list, household] = await Promise.all([listHouseholdMembers(householdId), getHouseholdById(householdId)]);
    setMembers(list);
    setOwnerUid(household?.ownerUid ?? null);
  }, [householdId]);

  React.useEffect(() => {
    (async () => {
      try {
        await fetchData();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const onCreateMember = async () => {
    if (!user || !householdId) return;

    const email = memberEmail.trim().toLowerCase();
    const password = memberPassword;
    const displayName = memberName.trim();

    if (!email.includes("@") || password.length < 6) {
      Alert.alert(t("auth.checkInput"), t("family.memberCreate.invalidInput"));
      return;
    }

    if (displayName.length > 0 && displayName.length < 2) {
      Alert.alert(t("auth.checkInput"), t("family.memberCreate.nameInvalid"));
      return;
    }

    setCreating(true);
    try {
      await createHouseholdMemberAccount({
        actorUid: user.uid,
        householdId,
        email,
        password,
        displayName: displayName || undefined,
      });
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");
      await fetchData();
      Alert.alert(t("common.ok"), t("family.memberCreate.success", { email }));
    } catch (error) {
      const fallback = t("family.memberCreate.failed");
      const message = error instanceof Error ? localizeError(error.message, t) : fallback;
      Alert.alert(t("common.error"), message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={[styles.containerInner, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>{t("family.title")}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>{t("family.subtitle")}</Text>
      </View>

      {householdId ? (
        <View style={[styles.manageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.manageTitle, { color: colors.text }]}>{t("family.memberCreate.title")}</Text>
          <Text style={[styles.manageText, { color: colors.muted }]}>
            {isOwner ? t("family.memberCreate.subtitleOwner") : t("family.memberCreate.subtitleNotOwner")}
          </Text>

          {isOwner ? (
            <>
              <Field
                label={t("auth.name")}
                value={memberName}
                placeholder={t("auth.namePlaceholder")}
                onChangeText={setMemberName}
                colors={colors}
                theme={theme}
              />
              <Field
                label="Email"
                value={memberEmail}
                placeholder="name@example.com"
                onChangeText={setMemberEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                colors={colors}
                theme={theme}
              />
              <Field
                label={t("auth.password")}
                value={memberPassword}
                placeholder={t("auth.passwordPlaceholder")}
                onChangeText={setMemberPassword}
                secureTextEntry
                autoCapitalize="none"
                colors={colors}
                theme={theme}
              />
              <View style={{ height: 12 }} />
              <PrimaryButton title={t("family.memberCreate.action")} onPress={onCreateMember} loading={creating} />
            </>
          ) : null}
        </View>
      ) : null}

      <View style={{ height: 12 }} />

      {!householdId ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("family.empty.noHousehold")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("family.empty.noHouseholdText")}</Text>
        </View>
      ) : loading ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LoadingState label={t("family.loadingText")} />
        </View>
      ) : members.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("family.empty.none")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("family.empty.noneText")}</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          }
          renderItem={({ item }) => {
            const title = item.displayName?.trim() || item.email || t("family.unnamed");
            const subtitle = item.email ?? t("family.noEmail");
            const isYou = item.uid === user?.uid;
            const isMemberOwner = item.uid === ownerUid;

            return (
              <View style={[styles.card, { backgroundColor: colors.card2, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
                {isYou || isMemberOwner ? (
                  <View style={[styles.badges, { marginTop: 8 }]}>
                    {isYou ? <Pill label={t("family.you")} tone="default" /> : null}
                    {isMemberOwner ? <Pill label={t("family.owner")} tone="muted" /> : null}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerInner: { flex: 1, padding: 16, paddingTop: 12 },
  header: { borderRadius: 18, padding: 14, borderWidth: 1 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  card: { borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  manageCard: { marginTop: 12, borderRadius: 16, padding: 12, borderWidth: 1 },
  manageTitle: { fontSize: 15, fontWeight: "900" },
  manageText: { marginTop: 4, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  title: { fontSize: 15, fontWeight: "900" },
  sub: { marginTop: 4, lineHeight: 18 },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  empty: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },
});

function Field(props: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[styles.label, { color: props.colors.faint }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        placeholder={props.placeholder}
        placeholderTextColor={props.theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
        onChangeText={props.onChangeText}
        autoCapitalize={props.autoCapitalize ?? "sentences"}
        keyboardType={props.keyboardType}
        secureTextEntry={props.secureTextEntry}
        style={[
          styles.input,
          {
            color: props.colors.text,
            borderColor: props.colors.border,
            backgroundColor: props.colors.surface,
          },
        ]}
      />
    </View>
  );
}
