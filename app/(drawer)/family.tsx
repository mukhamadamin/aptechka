import * as React from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { listHouseholdMembers } from "../../src/entities/family/api/family-repository";
import type { UserProfile } from "../../src/entities/session/model/types";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import { Pill } from "../../src/ui/components";

export default function FamilyScreen() {
  const { colors } = useAppTheme();
  const { householdId, user } = useHousehold();
  const { t } = useLanguage();

  const [members, setMembers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!householdId) {
      setMembers([]);
      return;
    }

    const list = await listHouseholdMembers(householdId);
    setMembers(list);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.h1, { color: colors.text }]}>{t("family.title")}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>{t("family.subtitle")}</Text>
      </View>

      <View style={{ height: 12 }} />

      {!householdId ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("family.empty.noHousehold")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("family.empty.noHouseholdText")}</Text>
        </View>
      ) : loading ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("common.loading")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("family.loadingText")}</Text>
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

            return (
              <View style={[styles.card, { backgroundColor: colors.card2, borderColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.sub, { color: colors.muted }]} numberOfLines={1}>
                  {subtitle}
                </Text>
                {isYou ? (
                  <View style={{ marginTop: 8 }}>
                    <Pill label={t("family.you")} tone="default" />
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 12 },
  header: { borderRadius: 18, padding: 14, borderWidth: 1 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  card: { borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  title: { fontSize: 15, fontWeight: "900" },
  sub: { marginTop: 4, lineHeight: 18 },
  empty: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },
});
