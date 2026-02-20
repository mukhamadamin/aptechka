import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Medicine } from "../../../types/medicine";

const DOSE_TRACKER_KEY = "home_pharmacy_dose_tracker_v1";

type DoseTrackerState = {
  date: string;
  doneDoseIds: string[];
};

export type PlannedDose = {
  id: string;
  medicineId: string;
  medicineName: string;
  targetMemberUids: string[];
  targetMemberNames: string[];
  time: string;
  hour: number;
  minute: number;
};

function dateKeyLocal(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDoseId(medicineId: string, time: string, targetMemberUid?: string): string {
  return targetMemberUid ? `${medicineId}|${time}|${targetMemberUid}` : `${medicineId}|${time}`;
}

function normalizeMemberUids(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeMembersByTime(value?: Record<string, string[]>): Record<string, string[]> {
  if (!value || typeof value !== "object") return {};

  const out: Record<string, string[]> = {};
  for (const [time, members] of Object.entries(value)) {
    if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(time)) continue;
    out[time] = normalizeMemberUids(members);
  }

  return out;
}

function parseIntakeTimes(raw?: string): { hour: number; minute: number; time: string }[] {
  if (!raw?.trim()) return [];

  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const match = item.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
      if (!match) return null;

      const hour = Number(match[1]);
      const minute = Number(match[2]);
      return {
        hour,
        minute,
        time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      };
    })
    .filter((item): item is { hour: number; minute: number; time: string } => Boolean(item));

  const unique = new Map<string, { hour: number; minute: number; time: string }>();
  for (const item of parsed) {
    unique.set(item.time, item);
  }

  return Array.from(unique.values());
}

export function buildTodayDosePlan(
  medicines: Medicine[],
  resolveMemberName?: (uid: string) => string | undefined
): PlannedDose[] {
  const doses = medicines.flatMap((medicine) =>
    parseIntakeTimes(medicine.intakeTimes).map((timePoint) => {
      const fallbackMemberUids = normalizeMemberUids(medicine.intakeMemberUids);
      const membersByTime = normalizeMembersByTime(medicine.intakeMembersByTime);
      const targetMemberUids = membersByTime[timePoint.time] ?? fallbackMemberUids;
      if (targetMemberUids.length > 0) {
        return targetMemberUids.map((uid) => {
          const resolvedName = resolveMemberName?.(uid)?.trim();
          return {
            id: parseDoseId(medicine.id, timePoint.time, uid),
            medicineId: medicine.id,
            medicineName: medicine.name,
            targetMemberUids: [uid],
            targetMemberNames: resolvedName ? [resolvedName] : [],
            time: timePoint.time,
            hour: timePoint.hour,
            minute: timePoint.minute,
          };
        });
      }

      return {
        id: parseDoseId(medicine.id, timePoint.time),
        medicineId: medicine.id,
        medicineName: medicine.name,
        targetMemberUids: [],
        targetMemberNames: [],
        time: timePoint.time,
        hour: timePoint.hour,
        minute: timePoint.minute,
      };
    })
  );

  const flattened = doses.flat();

  return flattened.sort((a, b) => {
    const byTime = a.hour * 60 + a.minute - (b.hour * 60 + b.minute);
    if (byTime !== 0) return byTime;
    const byName = a.medicineName.localeCompare(b.medicineName);
    if (byName !== 0) return byName;
    return (a.targetMemberNames[0] ?? "").localeCompare(b.targetMemberNames[0] ?? "");
  });
}

async function readState(): Promise<DoseTrackerState | null> {
  try {
    const raw = await AsyncStorage.getItem(DOSE_TRACKER_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DoseTrackerState>;
    if (!parsed || typeof parsed.date !== "string" || !Array.isArray(parsed.doneDoseIds)) {
      return null;
    }

    return {
      date: parsed.date,
      doneDoseIds: parsed.doneDoseIds.filter((id): id is string => typeof id === "string"),
    };
  } catch {
    return null;
  }
}

async function writeState(state: DoseTrackerState): Promise<void> {
  await AsyncStorage.setItem(DOSE_TRACKER_KEY, JSON.stringify(state));
}

export async function loadTodayDoseDoneIds(): Promise<Set<string>> {
  const today = dateKeyLocal();
  const state = await readState();

  if (!state || state.date !== today) {
    await writeState({ date: today, doneDoseIds: [] });
    return new Set();
  }

  return new Set(state.doneDoseIds);
}

export async function toggleDoseDone(doseId: string): Promise<Set<string>> {
  const today = dateKeyLocal();
  const state = await readState();

  const done = new Set(state?.date === today ? state.doneDoseIds : []);

  if (done.has(doseId)) done.delete(doseId);
  else done.add(doseId);

  await writeState({
    date: today,
    doneDoseIds: Array.from(done.values()).sort(),
  });

  return done;
}
