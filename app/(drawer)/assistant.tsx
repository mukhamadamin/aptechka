import * as React from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { listMedicines } from "../../src/entities/medicine/api/medicine-repository";
import { useHousehold } from "../../src/entities/session/model/use-household";
import { buildSymptomAdvice, type SymptomAdvice } from "../../src/features/symptom-ai/model/symptom-advisor";
import { useLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";
import type { Medicine } from "../../src/types/medicine";
import { Pill, PrimaryButton } from "../../src/ui/components";

function parseQuantity(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const quantity = Number(match[0].replace(",", "."));
  return Number.isFinite(quantity) ? quantity : null;
}

function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AssistantScreen() {
  const { colors, theme } = useAppTheme();
  const { householdId } = useHousehold();
  const { t, language } = useLanguage();

  const aiText = React.useMemo(
    () =>
      language === "ru"
        ? {
            title: "ИИ-помощник по симптомам",
            subtitle:
              "Опишите симптомы, а помощник подберет варианты из вашей аптечки и покажет риски.",
            placeholder: "Например: температура 38.7, болит горло, сухой кашель 2 дня",
            analyze: "Анализировать симптомы",
            validation: "Опишите симптомы подробнее (минимум 5 символов).",
            urgentTitle: "Внимание: возможны опасные признаки",
            foundInKit: "Подходящие варианты из аптечки",
            noFound: "Подходящих лекарств по симптомам в аптечке не найдено.",
            missing: "Чего не хватает в аптечке",
            selfcare: "Что можно сделать сейчас",
            disclaimer:
              "Это не диагноз и не назначение лечения. При ухудшении состояния, сильной боли, одышке, судорогах, крови или у детей/беременных обязательно обратитесь к врачу или в экстренную службу.",
            noHousehold: "Семья не подключена. Сначала подключите household в настройках.",
            symptoms: {
              fever: "Температура",
              headache: "Головная боль",
              sore_throat: "Боль в горле",
              cough: "Кашель",
              runny_nose: "Насморк",
              allergy: "Аллергия",
              nausea: "Тошнота",
              diarrhea: "Диарея",
              pain: "Боль",
              burn: "Ожог",
            } as Record<string, string>,
            categories: {
              antipyretic: "Жаропонижающее",
              painkiller: "Обезболивающее",
              cough: "Средство от кашля",
              throat: "Средство для горла",
              antihistamine: "Антигистаминное",
              antidiarrheal: "Средство от диареи",
              rehydration: "Регидратация (ORS/Регидрон)",
              antiemetic: "Средство от тошноты",
              burn_care: "Средство для ожогов",
            } as Record<string, string>,
            redFlags: {
              chest_pain: "Боль или давление в груди",
              breathing: "Затруднение дыхания",
              neuro: "Потеря сознания или судороги",
              blood: "Кровь в симптомах",
              high_fever: "Очень высокая температура",
              pregnancy_child: "Беременность или младенческий возраст",
            } as Record<string, string>,
          }
        : {
            title: "AI Symptom Assistant",
            subtitle:
              "Describe symptoms and the assistant will match options from your kit and highlight risks.",
            placeholder: "Example: fever 101.6F, sore throat, dry cough for 2 days",
            analyze: "Analyze Symptoms",
            validation: "Describe symptoms in more detail (at least 5 characters).",
            urgentTitle: "Warning: possible red flags detected",
            foundInKit: "Possible options from your kit",
            noFound: "No suitable medicines found in your kit for these symptoms.",
            missing: "What may be missing in your kit",
            selfcare: "What you can do now",
            disclaimer:
              "This is not a diagnosis or a prescription. If symptoms worsen, with severe pain, breathing issues, seizures, blood, or for children/pregnancy, seek medical care or emergency services.",
            noHousehold: "No household connected. Join household in settings first.",
            symptoms: {
              fever: "Fever",
              headache: "Headache",
              sore_throat: "Sore throat",
              cough: "Cough",
              runny_nose: "Runny nose",
              allergy: "Allergy",
              nausea: "Nausea",
              diarrhea: "Diarrhea",
              pain: "Pain",
              burn: "Burn",
            } as Record<string, string>,
            categories: {
              antipyretic: "Antipyretic",
              painkiller: "Painkiller",
              cough: "Cough remedy",
              throat: "Throat remedy",
              antihistamine: "Antihistamine",
              antidiarrheal: "Anti-diarrheal",
              rehydration: "Rehydration (ORS)",
              antiemetic: "Anti-nausea remedy",
              burn_care: "Burn care remedy",
            } as Record<string, string>,
            redFlags: {
              chest_pain: "Chest pain or pressure",
              breathing: "Breathing difficulty",
              neuro: "Loss of consciousness or seizure",
              blood: "Blood-related symptom",
              high_fever: "Very high fever",
              pregnancy_child: "Pregnancy or infant case",
            } as Record<string, string>,
          },
    [language]
  );

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [symptomsInput, setSymptomsInput] = React.useState("");
  const [symptomAdvice, setSymptomAdvice] = React.useState<SymptomAdvice | null>(null);

  const fetchAll = React.useCallback(async () => {
    if (!householdId) {
      setMedicines([]);
      return;
    }

    const medList = await listMedicines(householdId);
    setMedicines(medList);
  }, [householdId]);

  React.useEffect(() => {
    (async () => {
      try {
        await fetchAll();
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = React.useMemo(() => {
    const expired = medicines.filter((m) => {
      const left = daysLeft(m.expiresAt);
      return left !== null && left < 0;
    }).length;

    const expiringSoon = medicines.filter((m) => {
      const left = daysLeft(m.expiresAt);
      return left !== null && left >= 0 && left <= 14;
    }).length;

    const lowStock = medicines.filter((m) => {
      const qty = typeof m.quantityValue === "number" ? m.quantityValue : parseQuantity(m.quantity);
      return qty !== null && qty <= 5;
    }).length;

    return {
      total: medicines.length,
      expired,
      expiringSoon,
      lowStock,
    };
  }, [medicines]);

  const onAnalyzeSymptoms = () => {
    if (!householdId) {
      Alert.alert(t("common.error"), aiText.noHousehold);
      return;
    }

    if (symptomsInput.trim().length < 5) {
      Alert.alert(t("auth.checkInput"), aiText.validation);
      return;
    }

    const advice = buildSymptomAdvice(symptomsInput, medicines, language);
    setSymptomAdvice(advice);
  };

  const firstAidItems = React.useMemo(
    () => [
      {
        key: "burn",
        title: t("assistant.firstAid.burn.title"),
        text: t("assistant.firstAid.burn.text"),
      },
      {
        key: "allergy",
        title: t("assistant.firstAid.allergy.title"),
        text: t("assistant.firstAid.allergy.text"),
      },
      {
        key: "fever",
        title: t("assistant.firstAid.fever.title"),
        text: t("assistant.firstAid.fever.text"),
      },
    ],
    [t]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 32 }}
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
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.h1, { color: colors.text }]}>{t("assistant.title")}</Text>
        <Text style={[styles.h2, { color: colors.muted }]}>{t("assistant.subtitle")}</Text>

        <View style={styles.metricRow}>
          <Pill label={t("assistant.metrics.total", { count: metrics.total })} tone="muted" />
          <Pill label={t("assistant.metrics.expiring", { count: metrics.expiringSoon })} tone="danger" />
          <Pill label={t("assistant.metrics.expired", { count: metrics.expired })} tone="danger" />
          <Pill label={t("assistant.metrics.low", { count: metrics.lowStock })} tone="danger" />
        </View>
      </View>

      <View style={{ height: 12 }} />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{aiText.title}</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>{aiText.subtitle}</Text>

        <TextInput
          value={symptomsInput}
          onChangeText={setSymptomsInput}
          multiline
          autoCorrect={false}
          autoCapitalize="sentences"
          textAlignVertical="top"
          placeholder={aiText.placeholder}
          placeholderTextColor={theme === "dark" ? "rgba(232,238,246,0.35)" : "rgba(15,23,42,0.4)"}
          style={[
            styles.input,
            styles.multiline,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        />

        <View style={{ height: 8 }} />
        <PrimaryButton title={aiText.analyze} onPress={onAnalyzeSymptoms} />

        {symptomAdvice ? (
          <View style={{ marginTop: 12, gap: 10 }}>
            <Text style={[styles.tipText, { color: colors.muted }]}>{symptomAdvice.summary}</Text>

            {symptomAdvice.urgentFlags.length > 0 ? (
              <View style={[styles.alertBox, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }]}> 
                <Text style={[styles.tipTitle, { color: colors.danger }]}>{aiText.urgentTitle}</Text>
                {symptomAdvice.urgentFlags.map((flag) => (
                  <Text key={flag} style={[styles.tipText, { color: colors.danger }]}> 
                    • {aiText.redFlags[flag] ?? flag}
                  </Text>
                ))}
              </View>
            ) : null}

            <View>
              <Text style={[styles.tipTitle, { color: colors.text }]}>{aiText.foundInKit}</Text>
              {symptomAdvice.recommendedFromKit.length === 0 ? (
                <Text style={[styles.tipText, { color: colors.muted }]}>{aiText.noFound}</Text>
              ) : (
                symptomAdvice.recommendedFromKit.map((item) => (
                  <Text key={`${item.medicineId}-${item.forSymptom}`} style={[styles.tipText, { color: colors.text }]}> 
                    • {item.name} - {aiText.symptoms[item.forSymptom] ?? item.forSymptom}
                  </Text>
                ))
              )}
            </View>

            {symptomAdvice.missingCategories.length ? (
              <View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{aiText.missing}</Text>
                {symptomAdvice.missingCategories.map((item) => (
                  <Text key={item} style={[styles.tipText, { color: colors.muted }]}> 
                    • {aiText.categories[item] ?? item}
                  </Text>
                ))}
              </View>
            ) : null}

            {symptomAdvice.selfCareSteps.length ? (
              <View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{aiText.selfcare}</Text>
                {symptomAdvice.selfCareSteps.map((item, idx) => (
                  <Text key={`${idx}-${item}`} style={[styles.tipText, { color: colors.muted }]}> 
                    • {item}
                  </Text>
                ))}
              </View>
            ) : null}

            <Text style={[styles.warning, { color: colors.muted }]}>{aiText.disclaimer}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ height: 12 }} />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("assistant.firstAid.title")}</Text>
        <Text style={[styles.hint, { color: colors.muted }]}>{t("assistant.firstAid.subtitle")}</Text>

        <View style={{ gap: 8, marginTop: 10 }}>
          {firstAidItems.map((item) => (
            <View key={item.key} style={[styles.tip, { borderColor: colors.border, backgroundColor: colors.card2 }]}> 
              <Text style={[styles.tipTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.tipText, { color: colors.muted }]}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? <View style={{ height: 24 }} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14 },
  h1: { fontSize: 20, fontWeight: "900" },
  h2: { marginTop: 6, lineHeight: 20 },
  metricRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  hint: { marginTop: 4, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 96, paddingTop: 10 },
  alertBox: { borderWidth: 1, borderRadius: 12, padding: 10 },
  warning: { fontSize: 12, lineHeight: 18 },
  tip: { borderWidth: 1, borderRadius: 12, padding: 10 },
  tipTitle: { fontSize: 14, fontWeight: "900" },
  tipText: { marginTop: 4, lineHeight: 18 },
});
