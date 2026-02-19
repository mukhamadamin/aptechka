import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";

const LANG_KEY = "home_pharmacy_lang_v1";
const SOS_PHONE_KEY = "home_pharmacy_sos_phone_v1";
const SOS_NOTIFICATION_ID_KEY = "home_pharmacy_sos_notification_id_v1";

export const SOS_CATEGORY_ID = "sos-shortcut-category";
export const SOS_ACTION_CALL = "sos-action-call";

function getTexts(language: "ru" | "en") {
  if (language === "ru") {
    return {
      title: "SOS: быстрый вызов",
      body: "Нажмите, чтобы позвонить экстренному контакту.",
      actionCall: "Позвонить",
      noPhone: "Номер SOS не задан в профиле.",
    };
  }

  return {
    title: "SOS: quick call",
    body: "Tap to call your emergency contact.",
    actionCall: "Call",
    noPhone: "SOS phone is not set in profile.",
  };
}

async function getLanguage(): Promise<"ru" | "en"> {
  const raw = await AsyncStorage.getItem(LANG_KEY);
  return raw === "en" ? "en" : "ru";
}

export async function setSosPhone(value?: string) {
  const normalized = (value ?? "").trim();
  if (!normalized) {
    await AsyncStorage.removeItem(SOS_PHONE_KEY);
    return;
  }
  await AsyncStorage.setItem(SOS_PHONE_KEY, normalized);
}

export async function getSosPhone(): Promise<string | null> {
  const phone = await AsyncStorage.getItem(SOS_PHONE_KEY);
  return phone?.trim() ? phone.trim() : null;
}

export async function enableSosShadeShortcut(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();
  const granted =
    permission.status === "granted"
      ? true
      : (await Notifications.requestPermissionsAsync()).status === "granted";

  if (!granted) return false;

  const language = await getLanguage();
  const texts = getTexts(language);

  await Notifications.setNotificationCategoryAsync(SOS_CATEGORY_ID, [
    {
      identifier: SOS_ACTION_CALL,
      buttonTitle: texts.actionCall,
      options: { opensAppToForeground: true },
    },
  ]);

  const existingId = await AsyncStorage.getItem(SOS_NOTIFICATION_ID_KEY);
  if (existingId) {
    await Notifications.dismissNotificationAsync(existingId).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: texts.title,
      body: texts.body,
      categoryIdentifier: SOS_CATEGORY_ID,
      sound: false,
      sticky: true,
      autoDismiss: false,
    },
    trigger: null,
  });

  await AsyncStorage.setItem(SOS_NOTIFICATION_ID_KEY, id);
  return true;
}

export async function disableSosShadeShortcut() {
  const existingId = await AsyncStorage.getItem(SOS_NOTIFICATION_ID_KEY);
  if (!existingId) return;

  await Notifications.dismissNotificationAsync(existingId).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(existingId).catch(() => {});
  await AsyncStorage.removeItem(SOS_NOTIFICATION_ID_KEY);
}

export async function handleSosNotificationResponse(
  response: Notifications.NotificationResponse
): Promise<{ handled: boolean; errorMessage?: string }> {
  if (response.actionIdentifier !== SOS_ACTION_CALL) {
    return { handled: false };
  }

  const phone = await getSosPhone();
  if (!phone) {
    const language = await getLanguage();
    return { handled: true, errorMessage: getTexts(language).noPhone };
  }

  await Linking.openURL(`tel:${phone}`);
  return { handled: true };
}
