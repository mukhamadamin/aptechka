import type { AppLanguage } from "../../../i18n/LanguageProvider";
import type { Medicine } from "../../../types/medicine";

export type SymptomTag =
  | "fever"
  | "headache"
  | "sore_throat"
  | "cough"
  | "runny_nose"
  | "allergy"
  | "nausea"
  | "diarrhea"
  | "pain"
  | "burn";

export type MedicineCategory =
  | "antipyretic"
  | "painkiller"
  | "cough"
  | "throat"
  | "antihistamine"
  | "antidiarrheal"
  | "rehydration"
  | "antiemetic"
  | "burn_care";

const SYMPTOM_KEYWORDS: { tag: SymptomTag; keywords: string[] }[] = [
  { tag: "fever", keywords: ["fever", "temperature", "temp", "жар", "температур"] },
  {
    tag: "headache",
    keywords: [
      "headache",
      "migraine",
      "head hurts",
      "голов",
      "мигрен",
      "болит голова",
      "головная боль",
    ],
  },
  { tag: "sore_throat", keywords: ["sore throat", "throat", "горл", "ангин"] },
  { tag: "cough", keywords: ["cough", "кашл"] },
  { tag: "runny_nose", keywords: ["runny", "nose", "snot", "насморк", "нос залож"] },
  { tag: "allergy", keywords: ["allergy", "rash", "itch", "аллерг", "сып", "зуд"] },
  { tag: "nausea", keywords: ["nausea", "vomit", "тошн", "рвот"] },
  { tag: "diarrhea", keywords: ["diarrhea", "loose stool", "понос", "диаре"] },
  { tag: "pain", keywords: ["pain", "ache", "бол", "болит", "ломит"] },
  { tag: "burn", keywords: ["burn", "ожог"] },
];

const RED_FLAGS: { id: string; keywords: string[] }[] = [
  {
    id: "chest_pain",
    keywords: ["chest pain", "pressure in chest", "боль в груди", "давит в груди"],
  },
  {
    id: "breathing",
    keywords: ["shortness of breath", "hard to breathe", "дыхани", "задыха"],
  },
  {
    id: "neuro",
    keywords: ["fainted", "convulsion", "seizure", "потеря сознания", "судорог"],
  },
  { id: "blood", keywords: ["blood", "кровь"] },
  {
    id: "high_fever",
    keywords: ["40", "41", "очень высокая температура", "very high fever"],
  },
  {
    id: "pregnancy_child",
    keywords: ["pregnant", "pregnancy", "беремен", "infant", "newborn", "младен"],
  },
];

const CATEGORY_BY_SYMPTOM: Record<SymptomTag, MedicineCategory[]> = {
  fever: ["antipyretic", "rehydration"],
  headache: ["painkiller"],
  sore_throat: ["throat", "painkiller"],
  cough: ["cough", "rehydration"],
  runny_nose: ["antihistamine"],
  allergy: ["antihistamine"],
  nausea: ["antiemetic", "rehydration"],
  diarrhea: ["antidiarrheal", "rehydration"],
  pain: ["painkiller"],
  burn: ["burn_care"],
};

const MED_NAME_MARKERS: Record<MedicineCategory, string[]> = {
  antipyretic: [
    "paracetamol",
    "acetaminophen",
    "ibuprofen",
    "nurofen",
    "панадол",
    "парацетамол",
    "ацетаминофен",
    "ибупроф",
  ],
  painkiller: [
    "paracetamol",
    "acetaminophen",
    "ibuprofen",
    "nurofen",
    "ketorol",
    "diclofenac",
    "citramon",
    "парацетамол",
    "ибупроф",
    "нурофен",
    "кеторол",
    "цитрамон",
    "диклофен",
  ],
  cough: ["ambroxol", "bromhex", "acetylcyste", "ацц", "амброкс", "бромгекс"],
  throat: ["strepsils", "tantum", "hexoral", "хлоргекс", "гексорал"],
  antihistamine: ["cetirizine", "loratadine", "suprastin", "цетир", "лоратад", "супраст"],
  antidiarrheal: ["loperamide", "smecta", "enterosgel", "смекта", "энтеросгель"],
  rehydration: ["rehydron", "ors", "регидрон"],
  antiemetic: ["ondansetron", "domperidone", "метоклоп", "мотилиум"],
  burn_care: ["panthenol", "burn", "пантенол"],
};

const CARE_STEPS_BY_SYMPTOM: Record<AppLanguage, Record<SymptomTag, string[]>> = {
  en: {
    fever: ["Rest and drink enough water.", "Track temperature every 4-6 hours."],
    headache: ["Reduce light/noise and rest.", "Drink water and monitor pain progression."],
    sore_throat: ["Use warm fluids.", "Avoid very hot/cold food and smoke."],
    cough: ["Humidify air and stay hydrated.", "Watch for breathing difficulty."],
    runny_nose: ["Rinse nose with saline.", "Drink more fluids."],
    allergy: ["Stop contact with possible allergen.", "Monitor swelling and breathing."],
    nausea: ["Small sips of water or oral rehydration.", "Avoid heavy food for several hours."],
    diarrhea: ["Oral rehydration is critical.", "Watch for dehydration signs."],
    pain: ["Reduce physical load and rest.", "Avoid combining painkillers without guidance."],
    burn: ["Cool affected area with water for 10-20 minutes.", "Do not puncture blisters."],
  },
  ru: {
    fever: ["Отдыхайте и пейте больше воды.", "Контролируйте температуру каждые 4-6 часов."],
    headache: ["Уменьшите свет и шум, отдохните.", "Пейте воду и наблюдайте за динамикой боли."],
    sore_throat: ["Пейте тёплую жидкость.", "Избегайте очень горячей или холодной еды и дыма."],
    cough: ["Увлажняйте воздух и пейте больше жидкости.", "Следите за появлением одышки."],
    runny_nose: ["Промывайте нос солевым раствором.", "Увеличьте потребление жидкости."],
    allergy: ["Прекратите контакт с возможным аллергеном.", "Следите за отёком и дыханием."],
    nausea: ["Пейте воду маленькими глотками.", "Избегайте тяжёлой пищи несколько часов."],
    diarrhea: ["Главное — регидратация.", "Следите за признаками обезвоживания."],
    pain: ["Снизьте нагрузку и отдохните.", "Не комбинируйте обезболивающие без консультации."],
    burn: ["Охлаждайте место ожога водой 10-20 минут.", "Не вскрывайте пузыри."],
  },
};

export type SymptomAdvice = {
  detectedSymptoms: SymptomTag[];
  urgentFlags: string[];
  recommendedFromKit: { medicineId: string; name: string; forSymptom: SymptomTag }[];
  missingCategories: MedicineCategory[];
  selfCareSteps: string[];
  summary: string;
};

function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function medicineSearchText(item: Medicine) {
  return normalize([item.name, item.dosage, item.notes].filter(Boolean).join(" "));
}

export function buildSymptomAdvice(
  symptoms: string,
  medicines: Medicine[],
  language: AppLanguage = "en"
): SymptomAdvice {
  const text = normalize(symptoms);

  const detectedSymptoms = dedupe(
    SYMPTOM_KEYWORDS.filter((item) => includesAny(text, item.keywords)).map((item) => item.tag)
  );

  const urgentFlags = RED_FLAGS.filter((item) => includesAny(text, item.keywords)).map((item) => item.id);

  const requiredCategories = dedupe(detectedSymptoms.flatMap((tag) => CATEGORY_BY_SYMPTOM[tag] ?? []));

  const recommendedFromKit: SymptomAdvice["recommendedFromKit"] = [];
  const usedMedicineIds = new Set<string>();

  for (const symptomTag of detectedSymptoms) {
    const categories = CATEGORY_BY_SYMPTOM[symptomTag] ?? [];

    for (const category of categories) {
      const markers = MED_NAME_MARKERS[category] ?? [];
      const med = medicines.find((item) => {
        if (usedMedicineIds.has(item.id)) return false;
        return includesAny(medicineSearchText(item), markers);
      });

      if (med) {
        usedMedicineIds.add(med.id);
        recommendedFromKit.push({
          medicineId: med.id,
          name: med.name,
          forSymptom: symptomTag,
        });
      }
    }
  }

  const coveredCategories = new Set<MedicineCategory>();
  for (const category of requiredCategories) {
    const markers = MED_NAME_MARKERS[category] ?? [];
    if (medicines.some((item) => includesAny(medicineSearchText(item), markers))) {
      coveredCategories.add(category);
    }
  }

  const missingCategories = requiredCategories.filter((category) => !coveredCategories.has(category));

  const selfCareSteps = dedupe(detectedSymptoms.flatMap((tag) => CARE_STEPS_BY_SYMPTOM[language][tag] ?? []));

  const summary =
    detectedSymptoms.length === 0
      ? language === "ru"
        ? "Не удалось уверенно распознать симптомы. Добавьте больше деталей (длительность, температура, локализация боли)."
        : "Could not confidently detect symptoms. Add more detail (duration, temperature, pain location)."
      : language === "ru"
        ? `Обнаружено ${detectedSymptoms.length} симптом(ов). В аптечке найдено ${recommendedFromKit.length} подходящее(их) средство(в).`
        : `Detected ${detectedSymptoms.length} symptom pattern(s). Found ${recommendedFromKit.length} possible option(s) in your kit.`;

  return {
    detectedSymptoms,
    urgentFlags,
    recommendedFromKit,
    missingCategories,
    selfCareSteps,
    summary,
  };
}
