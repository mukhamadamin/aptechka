import * as React from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import { LoadingState, Pill, PrimaryButton } from "../../src/ui/components";

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
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView>(null);
  const { colors, theme } = useAppTheme();
  const { householdId, profile } = useHousehold();
  const { t, language } = useLanguage();
  const hasSubscription = profile?.subscriptionActive === true;

  const aiText = React.useMemo(
    () => ({
      title: language === "ru" ? "AI-помощник по симптомам" : "AI Symptom Assistant",
      subtitle:
        language === "ru"
          ? "Опишите симптомы, и помощник подберет варианты из вашей аптечки и выделит риски."
          : "Describe symptoms and the assistant will match options from your kit and highlight risks.",
      placeholder:
        language === "ru"
          ? "Пример: температура 38.6, боль в горле, сухой кашель 2 дня"
          : "Example: fever 101.6F, sore throat, dry cough for 2 days",
      analyze: language === "ru" ? "Анализировать симптомы" : "Analyze Symptoms",
      validation:
        language === "ru"
          ? "Опишите симптомы подробнее (минимум 5 символов)."
          : "Describe symptoms in more detail (at least 5 characters).",
      urgentTitle:
        language === "ru"
          ? "Внимание: обнаружены возможные тревожные признаки"
          : "Warning: possible red flags detected",
      foundInKit: language === "ru" ? "Подходящие варианты из вашей аптечки" : "Possible options from your kit",
      noFound:
        language === "ru"
          ? "Подходящих лекарств в аптечке по этим симптомам не найдено."
          : "No suitable medicines found in your kit for these symptoms.",
      missing: language === "ru" ? "Что может не хватать в аптечке" : "What may be missing in your kit",
      selfcare: language === "ru" ? "Что можно сделать сейчас" : "What you can do now",
      disclaimer:
        language === "ru"
          ? "Это не диагноз и не назначение лечения. При ухудшении состояния, сильной боли, проблемах с дыханием, судорогах, крови, а также для детей и при беременности обратитесь за медицинской помощью."
          : "This is not a diagnosis or a prescription. If symptoms worsen, with severe pain, breathing issues, seizures, blood, or for children/pregnancy, seek medical care or emergency services.",
      noHousehold:
        language === "ru"
          ? "Семья не подключена. Сначала присоединитесь к семье в настройках."
          : "No household connected. Join household in settings first.",
      symptoms: {
        fever: language === "ru" ? "Температура" : "Fever",
        headache: language === "ru" ? "Головная боль" : "Headache",
        sore_throat: language === "ru" ? "Боль в горле" : "Sore throat",
        cough: language === "ru" ? "Кашель" : "Cough",
        runny_nose: language === "ru" ? "Насморк" : "Runny nose",
        allergy: language === "ru" ? "Аллергия" : "Allergy",
        nausea: language === "ru" ? "Тошнота" : "Nausea",
        diarrhea: language === "ru" ? "Диарея" : "Diarrhea",
        pain: language === "ru" ? "Боль" : "Pain",
        burn: language === "ru" ? "Ожог" : "Burn",
      } as Record<string, string>,
      categories: {
        antipyretic: language === "ru" ? "Жаропонижающее" : "Antipyretic",
        painkiller: language === "ru" ? "Обезболивающее" : "Painkiller",
        cough: language === "ru" ? "Средство от кашля" : "Cough remedy",
        throat: language === "ru" ? "Средство для горла" : "Throat remedy",
        antihistamine: language === "ru" ? "Антигистаминное" : "Antihistamine",
        antidiarrheal: language === "ru" ? "Противодиарейное" : "Anti-diarrheal",
        rehydration: language === "ru" ? "Регидратация (ОРС)" : "Rehydration (ORS)",
        antiemetic: language === "ru" ? "Средство от тошноты" : "Anti-nausea remedy",
        burn_care: language === "ru" ? "Средство при ожогах" : "Burn care remedy",
      } as Record<string, string>,
      redFlags: {
        chest_pain: language === "ru" ? "Боль или давление в груди" : "Chest pain or pressure",
        breathing: language === "ru" ? "Затрудненное дыхание" : "Breathing difficulty",
        neuro: language === "ru" ? "Потеря сознания или судороги" : "Loss of consciousness or seizure",
        blood: language === "ru" ? "Симптомы с кровью" : "Blood-related symptom",
        high_fever: language === "ru" ? "Очень высокая температура" : "Very high fever",
        pregnancy_child: language === "ru" ? "Беременность или младенческий возраст" : "Pregnancy or infant case",
      } as Record<string, string>,
    }),
    [language]
  );

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [symptomsInput, setSymptomsInput] = React.useState("");
  const [symptomAdvice, setSymptomAdvice] = React.useState<SymptomAdvice | null>(null);

  const fetchAll = React.useCallback(async () => {
    if (!householdId || !hasSubscription) {
      setMedicines([]);
      return;
    }

    const medList = await listMedicines(householdId);
    setMedicines(medList);
  }, [hasSubscription, householdId]);

  React.useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => sub.remove();
  }, []);

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

  if (!hasSubscription) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, padding: 16, paddingTop: 12 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.h1, { color: colors.text }]}>{t("subscription.requiredTitle")}</Text>
          <Text style={[styles.h2, { color: colors.muted }]}>{t("subscription.requiredFeatureAssistant")}</Text>
          <View style={{ height: 12 }} />
          <PrimaryButton title={t("subscription.goToSettings")} onPress={() => router.push("/settings")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      automaticallyAdjustKeyboardInsets
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
                  <Text key={flag} style={[styles.tipText, { color: colors.danger }]}>- {aiText.redFlags[flag] ?? flag}</Text>
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
                    - {item.name} | {aiText.symptoms[item.forSymptom] ?? item.forSymptom}
                  </Text>
                ))
              )}
            </View>

            {symptomAdvice.missingCategories.length ? (
              <View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{aiText.missing}</Text>
                {symptomAdvice.missingCategories.map((item) => (
                  <Text key={item} style={[styles.tipText, { color: colors.muted }]}>- {aiText.categories[item] ?? item}</Text>
                ))}
              </View>
            ) : null}

            {symptomAdvice.selfCareSteps.length ? (
              <View>
                <Text style={[styles.tipTitle, { color: colors.text }]}>{aiText.selfcare}</Text>
                {symptomAdvice.selfCareSteps.map((item, idx) => (
                  <Text key={`${idx}-${item}`} style={[styles.tipText, { color: colors.muted }]}>- {item}</Text>
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

      {loading ? <LoadingState label={t("common.loading")} /> : null}
    </ScrollView>
    </KeyboardAvoidingView>
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
