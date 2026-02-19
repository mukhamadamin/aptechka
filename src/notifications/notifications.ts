import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Medicine } from "../types/medicine";

const LANGUAGE_KEY = "home_pharmacy_lang_v1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

async function getLanguage(): Promise<"ru" | "en"> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_KEY);
    return value === "en" ? "en" : "ru";
  } catch {
    return "ru";
  }
}

function notifyText(language: "ru" | "en") {
  if (language === "en") {
    return {
      channel: "Expiry date",
      expirySoonTitle: "Expiry date is coming",
      expirySoonBody: (name: string, days: number) => `${name} - ${days} day(s) left.`,
      expiryTodayTitle: "Expires today",
      expiryTodayBody: (name: string) => `${name} - please check this medicine.`,
      intakeTitle: "Intake reminder",
      intakeBody: (name: string) => `${name} - time to take medicine.`,
    };
  }

  return {
    channel: "Срок годности",
    expirySoonTitle: "Срок годности скоро закончится",
    expirySoonBody: (name: string, days: number) => `${name} - осталось ${days} дн.`,
    expiryTodayTitle: "Срок годности сегодня",
    expiryTodayBody: (name: string) => `${name} - проверьте препарат.`,
    intakeTitle: "Напоминание о приёме",
    intakeBody: (name: string) => `${name} - время принять препарат.`,
  };
}

export async function ensureNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  }
  return true;
}

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  const language = await getLanguage();
  const text = notifyText(language);

  await Notifications.setNotificationChannelAsync("expiry", {
    name: text.channel,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#7C3AED",
  });
}

function nextLocalNineAM(date: Date) {
  const d = new Date(date);
  d.setHours(9, 0, 0, 0);
  return d;
}

function safeDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseIntakeTimes(raw?: string): { hour: number; minute: number }[] {
  if (!raw?.trim()) return [];

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (!match) return null;
      return { hour: Number(match[1]), minute: Number(match[2]) };
    })
    .filter((item): item is { hour: number; minute: number } => Boolean(item));
}

export async function scheduleMedicineNotifications(med: Medicine): Promise<string[]> {
  const expires = safeDate(med.expiresAt);

  await ensureAndroidChannel();

  const granted = await ensureNotificationPermission();
  if (!granted) return [];

  const language = await getLanguage();
  const text = notifyText(language);

  const remindDays = typeof med.remindDaysBefore === "number" ? med.remindDaysBefore : 7;

  const now = new Date();
  const ids: string[] = [];

  if (expires) {
    const before = new Date(expires);
    before.setDate(before.getDate() - remindDays);
    const beforeAt = nextLocalNineAM(before);

    if (beforeAt.getTime() > now.getTime()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: text.expirySoonTitle,
          body: text.expirySoonBody(med.name, remindDays),
          sound: true,
        },
        trigger: { date: beforeAt, channelId: "expiry" } as Notifications.NotificationTriggerInput,
      });
      ids.push(id);
    }

    const expAt = nextLocalNineAM(expires);

    if (expAt.getTime() > now.getTime()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: text.expiryTodayTitle,
          body: text.expiryTodayBody(med.name),
          sound: true,
        },
        trigger: { date: expAt, channelId: "expiry" } as Notifications.NotificationTriggerInput,
      });
      ids.push(id);
    }
  }

  const intakeTimes = parseIntakeTimes(med.intakeTimes);

  for (const intake of intakeTimes) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: text.intakeTitle,
        body: text.intakeBody(med.name),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: intake.hour,
        minute: intake.minute,
        channelId: "expiry",
      } as Notifications.NotificationTriggerInput,
    });
    ids.push(id);
  }

  return ids;
}

export async function cancelNotificationIds(ids?: string[]) {
  if (!ids?.length) return;
  await Promise.allSettled(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}
