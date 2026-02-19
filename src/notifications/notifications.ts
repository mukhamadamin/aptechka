import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Medicine } from "../types/medicine";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

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
  await Notifications.setNotificationChannelAsync("expiry", {
    name: "Срок годности",
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

export async function scheduleMedicineNotifications(med: Medicine): Promise<string[]> {
  const expires = safeDate(med.expiresAt);
  if (!expires) return [];

  await ensureAndroidChannel();

  const granted = await ensureNotificationPermission();
  if (!granted) return [];

  const remindDays = typeof med.remindDaysBefore === "number" ? med.remindDaysBefore : 7;

  const now = new Date();
  const ids: string[] = [];

  // 1) За N дней
  const before = new Date(expires);
  before.setDate(before.getDate() - remindDays);
  const beforeAt = nextLocalNineAM(before);

  if (beforeAt.getTime() > now.getTime()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Срок годности скоро закончится",
        body: `${med.name} — осталось ${remindDays} дн.`,
        sound: true,
      },
      // ✅ ВАЖНО: объект-триггер
      trigger: { date: beforeAt, channelId: "expiry" } as Notifications.NotificationTriggerInput,
    });
    ids.push(id);
  }

  // 2) В день срока
  const expAt = nextLocalNineAM(expires);

  if (expAt.getTime() > now.getTime()) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Срок годности сегодня",
        body: `${med.name} — проверьте препарат.`,
        sound: true,
      },
      // ✅ ВАЖНО: объект-триггер
      trigger: { date: expAt, channelId: "expiry" } as Notifications.NotificationTriggerInput,
    });
    ids.push(id);
  }

  return ids;
}

export async function cancelNotificationIds(ids?: string[]) {
  if (!ids?.length) return;
  await Promise.allSettled(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id))
  );
}
