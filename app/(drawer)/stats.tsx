import * as React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { listHouseholdMembers } from "../../src/entities/family/api/family-repository";
import { listMedicineIntakeLogs } from "../../src/entities/medicine/api/intake-history-repository";
import { listMedicines } from "../../src/entities/medicine/api/medicine-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { MedicineIntakeLog } from "../../src/types/medicine";
import { LoadingState, Pill } from "../../src/ui/components";

type MemberStat = {
  actorUid: string;
  actorName: string;
  totalCount: number;
  totalAmount: number;
  distinctMedicines: number;
  lastTakenAt: number;
  medicines: { medicineName: string; count: number; amount: number }[];
};

type IntakeWithMedicine = MedicineIntakeLog & { medicineName: string };
type DailyPoint = { label: string; value: number };

function formatDateTime(value: number, language: "ru" | "en") {
  return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildDailySeries(logs: MedicineIntakeLog[], language: "ru" | "en"): DailyPoint[] {
  const days = 14;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const map = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }

  logs.forEach((log) => {
    const d = new Date(log.takenAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  });

  const formatter = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "2-digit",
  });

  return Array.from(map.entries()).map(([date, value]) => ({
    label: formatter.format(new Date(date)),
    value,
  }));
}

export default function StatsScreen() {
  const { colors } = useAppTheme();
  const { householdId } = useHousehold();
  const { t, language } = useLanguage();

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [memberStats, setMemberStats] = React.useState<MemberStat[]>([]);
  const [recentLogs, setRecentLogs] = React.useState<IntakeWithMedicine[]>([]);
  const [dailySeries, setDailySeries] = React.useState<DailyPoint[]>([]);
  const [mode, setMode] = React.useState<"list" | "charts">("list");

  const fetchData = React.useCallback(async () => {
    if (!householdId) {
      setMemberStats([]);
      setRecentLogs([]);
      setDailySeries([]);
      return;
    }

    const [members, medicines] = await Promise.all([
      listHouseholdMembers(householdId),
      listMedicines(householdId),
    ]);

    const memberNamesByUid = Object.fromEntries(
      members.map((member) => [member.uid, member.displayName?.trim() || member.email || member.uid])
    );

    const logChunks = await Promise.all(
      medicines.map(async (medicine) => {
        const logs = await listMedicineIntakeLogs(householdId, medicine.id, 300);
        return logs.map((log) => ({ ...log, medicineName: medicine.name }));
      })
    );

    const allLogs = logChunks.flat().sort((a, b) => b.takenAt - a.takenAt);
    setRecentLogs(allLogs.slice(0, 30));
    setDailySeries(buildDailySeries(allLogs, language));

    const memberMap = new Map<
      string,
      {
        actorUid: string;
        actorName: string;
        totalCount: number;
        totalAmount: number;
        lastTakenAt: number;
        medicines: Map<string, { medicineName: string; count: number; amount: number }>;
      }
    >();

    allLogs.forEach((log) => {
      if (!memberMap.has(log.actorUid)) {
        memberMap.set(log.actorUid, {
          actorUid: log.actorUid,
          actorName: memberNamesByUid[log.actorUid] ?? log.actorName ?? log.actorUid,
          totalCount: 0,
          totalAmount: 0,
          lastTakenAt: 0,
          medicines: new Map(),
        });
      }

      const row = memberMap.get(log.actorUid)!;
      row.totalCount += 1;
      row.totalAmount += log.amount;
      row.lastTakenAt = Math.max(row.lastTakenAt, log.takenAt);

      if (!row.medicines.has(log.medicineId)) {
        row.medicines.set(log.medicineId, {
          medicineName: log.medicineName,
          count: 0,
          amount: 0,
        });
      }
      const med = row.medicines.get(log.medicineId)!;
      med.count += 1;
      med.amount += log.amount;
    });

    const nextStats: MemberStat[] = Array.from(memberMap.values())
      .map((row) => ({
        actorUid: row.actorUid,
        actorName: row.actorName,
        totalCount: row.totalCount,
        totalAmount: row.totalAmount,
        distinctMedicines: row.medicines.size,
        lastTakenAt: row.lastTakenAt,
        medicines: Array.from(row.medicines.values()).sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.totalCount - a.totalCount);

    setMemberStats(nextStats);
  }, [householdId, language]);

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

  const totalIntakes = React.useMemo(() => memberStats.reduce((sum, row) => sum + row.totalCount, 0), [memberStats]);

  const medicineTotals = React.useMemo(() => {
    const map = new Map<string, number>();
    memberStats.forEach((member) => {
      member.medicines.forEach((medicine) => {
        map.set(medicine.medicineName, (map.get(medicine.medicineName) ?? 0) + medicine.count);
      });
    });
    return Array.from(map.entries())
      .map(([medicineName, count]) => ({ medicineName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [memberStats]);

  const maxMemberCount = React.useMemo(() => Math.max(1, ...memberStats.map((member) => member.totalCount)), [memberStats]);
  const maxMedicineCount = React.useMemo(() => Math.max(1, ...medicineTotals.map((medicine) => medicine.count)), [medicineTotals]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.card}
        />
      }
    >
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.h1, { color: colors.text }]}>{language === "ru" ? "Статистика приема" : "Intake Statistics"}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>
          {language === "ru" ? "Кто, какие лекарства и как часто принимает." : "Who takes which medicines and how often."}
        </Text>
        <View style={styles.pills}>
          <Pill label={language === "ru" ? `Всего приемов: ${totalIntakes}` : `Total intakes: ${totalIntakes}`} tone="default" />
          <Pill label={language === "ru" ? `Участников: ${memberStats.length}` : `Members tracked: ${memberStats.length}`} tone="muted" />
        </View>
        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode("list")}
            style={({ pressed }) => [
              styles.modeBtn,
              { borderColor: mode === "list" ? colors.primary : colors.border, backgroundColor: mode === "list" ? colors.primarySoft : colors.surface },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.modeText, { color: colors.text }]}>{language === "ru" ? "Список" : "List"}</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("charts")}
            style={({ pressed }) => [
              styles.modeBtn,
              { borderColor: mode === "charts" ? colors.primary : colors.border, backgroundColor: mode === "charts" ? colors.primarySoft : colors.surface },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.modeText, { color: colors.text }]}>{language === "ru" ? "Графики" : "Charts"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ height: 12 }} />

      {!householdId ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("family.empty.noHousehold")}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>{t("family.empty.noHouseholdText")}</Text>
        </View>
      ) : loading ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <LoadingState label={language === "ru" ? "Загружаем статистику..." : "Loading statistics..."} />
        </View>
      ) : memberStats.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{language === "ru" ? "Пока нет данных" : "No data yet"}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {language === "ru" ? "Логи появятся после первых отметок приема лекарств." : "Stats will appear after first intake logs."}
          </Text>
        </View>
      ) : mode === "list" ? (
        <>
          {memberStats.map((member) => (
            <View key={member.actorUid} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <Text style={[styles.title, { color: colors.text }]}>{member.actorName}</Text>
              <View style={styles.pills}>
                <Pill label={language === "ru" ? `Приемов: ${member.totalCount}` : `Intakes: ${member.totalCount}`} tone="default" />
                <Pill label={language === "ru" ? `Лекарств: ${member.distinctMedicines}` : `Medicines: ${member.distinctMedicines}`} tone="muted" />
                <Pill label={language === "ru" ? `Доза: ${member.totalAmount.toFixed(1)}` : `Dose: ${member.totalAmount.toFixed(1)}`} tone="muted" />
              </View>
              <Text style={[styles.sub, { color: colors.faint }]}>
                {language === "ru" ? "Последний прием: " : "Last intake: "}
                {formatDateTime(member.lastTakenAt, language)}
              </Text>

              <View style={{ marginTop: 10, gap: 6 }}>
                {member.medicines.slice(0, 6).map((medicine) => (
                  <View key={`${member.actorUid}:${medicine.medicineName}`} style={styles.row}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{medicine.medicineName}</Text>
                    <Text style={[styles.rowMeta, { color: colors.muted }]}>{language === "ru" ? `${medicine.count} раз` : `${medicine.count} times`}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={{ height: 12 }} />

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.text }]}>{language === "ru" ? "Последние отметки" : "Recent intakes"}</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {recentLogs.slice(0, 20).map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{log.actorName} - {log.medicineName}</Text>
                  <Text style={[styles.rowMeta, { color: colors.muted }]}>{formatDateTime(log.takenAt, language)}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.text }]}>{language === "ru" ? "Линейный чарт: приемы по дням" : "Line chart: intakes by day"}</Text>
            <LineChart data={dailySeries} color={colors.primary} textColor={colors.muted} trackColor={colors.surfaceStrong} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.text }]}>{language === "ru" ? "Барчарт: по участникам семьи" : "Bar chart: by family member"}</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {memberStats.map((member) => {
                const width = `${Math.max(8, Math.round((member.totalCount / maxMemberCount) * 100))}%`;
                return (
                  <View key={`chart-member-${member.actorUid}`} style={{ gap: 4 }}>
                    <View style={styles.row}>
                      <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{member.actorName}</Text>
                      <Text style={[styles.rowMeta, { color: colors.muted }]}>{member.totalCount}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.surfaceStrong }]}>
                      <View style={[styles.fill, { width, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.text }]}>{language === "ru" ? "Барчарт: топ лекарств" : "Bar chart: top medicines"}</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {medicineTotals.map((medicine) => {
                const width = `${Math.max(8, Math.round((medicine.count / maxMedicineCount) * 100))}%`;
                return (
                  <View key={`chart-medicine-${medicine.medicineName}`} style={{ gap: 4 }}>
                    <View style={styles.row}>
                      <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>{medicine.medicineName}</Text>
                      <Text style={[styles.rowMeta, { color: colors.muted }]}>{medicine.count}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.surfaceStrong }]}>
                      <View style={[styles.fill, { width, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderRadius: 18, padding: 14, borderWidth: 1 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  pills: { marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modeRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  modeBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  modeText: { fontSize: 13, fontWeight: "800" },
  card: { borderRadius: 16, padding: 12, borderWidth: 1, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: "900" },
  sub: { marginTop: 6, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  rowMeta: { fontSize: 12, fontWeight: "600" },
  logRow: { gap: 2 },
  track: { width: "100%", height: 8, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  chartWrap: { marginTop: 12, borderRadius: 12, padding: 10, overflow: "hidden" },
  chartArea: { height: 150, position: "relative" },
  chartLine: { position: "absolute", height: 2, borderRadius: 2 },
  chartDot: { position: "absolute", width: 8, height: 8, borderRadius: 4, marginLeft: -4, marginTop: -4 },
  chartLabels: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  chartLabel: { fontSize: 10, fontWeight: "700" },
  empty: { borderRadius: 18, padding: 14, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  emptyText: { marginTop: 6, lineHeight: 20 },
});

function LineChart(props: {
  data: DailyPoint[];
  color: string;
  textColor: string;
  trackColor: string;
}) {
  const { data, color, textColor, trackColor } = props;
  const [width, setWidth] = React.useState(0);

  const chartHeight = 150;
  const paddingX = 10;
  const paddingY = 12;

  const maxValue = React.useMemo(() => Math.max(1, ...data.map((point) => point.value)), [data]);
  const innerWidth = Math.max(1, width - paddingX * 2);
  const innerHeight = chartHeight - paddingY * 2;
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = React.useMemo(
    () =>
      data.map((point, index) => ({
        ...point,
        x: paddingX + index * stepX,
        y: paddingY + innerHeight * (1 - point.value / maxValue),
      })),
    [data, innerHeight, maxValue, paddingX, paddingY, stepX]
  );

  const tickLabels = React.useMemo(() => {
    if (data.length <= 4) return data;
    const indexes = [0, Math.floor((data.length - 1) / 3), Math.floor(((data.length - 1) * 2) / 3), data.length - 1];
    return indexes.map((idx) => data[idx]);
  }, [data]);

  return (
    <View style={[styles.chartWrap, { backgroundColor: trackColor }]} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.chartArea}>
        {points.slice(0, -1).map((start, index) => {
          const end = points[index + 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          return (
            <View
              key={`line-${index}`}
              style={[
                styles.chartLine,
                {
                  left: (start.x + end.x) / 2 - length / 2,
                  top: (start.y + end.y) / 2 - 1,
                  width: length,
                  backgroundColor: color,
                  transform: [{ rotateZ: `${angle}rad` }],
                },
              ]}
            />
          );
        })}
        {points.map((point, index) => (
          <View key={`dot-${index}`} style={[styles.chartDot, { left: point.x, top: point.y, backgroundColor: color }]} />
        ))}
      </View>
      <View style={styles.chartLabels}>
        {tickLabels.map((point, index) => (
          <Text key={`tick-${point.label}-${index}`} style={[styles.chartLabel, { color: textColor }]}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
