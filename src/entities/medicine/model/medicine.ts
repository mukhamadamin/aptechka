import type { Medicine, MedicineForm } from "../../../types/medicine";

function safeTrim(value?: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : undefined;
}

export function normalizeMedicineForm(input: MedicineForm): MedicineForm {
  const remindDaysBefore =
    typeof input.remindDaysBefore === "number" && Number.isFinite(input.remindDaysBefore)
      ? Math.max(0, Math.min(365, Math.floor(input.remindDaysBefore)))
      : undefined;

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const expiresISO =
    expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.toISOString() : undefined;

  return {
    name: (input.name ?? "").trim(),
    dosage: safeTrim(input.dosage),
    quantity: safeTrim(input.quantity),
    notes: safeTrim(input.notes),
    expiresAt: expiresISO,
    remindDaysBefore,
  };
}

export function validateMedicineForm(form: MedicineForm) {
  if (!form.name || form.name.trim().length < 2) {
    return "Please enter a medicine name (at least 2 characters).";
  }

  return null;
}

export function createMedicine(form: MedicineForm): Medicine {
  const now = Date.now();

  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    ...normalizeMedicineForm(form),
    createdAt: now,
    updatedAt: now,
    notificationIds: [],
  };
}

export function updateMedicine(previous: Medicine, patch: MedicineForm): Medicine {
  return {
    ...previous,
    ...normalizeMedicineForm(patch),
    updatedAt: Date.now(),
  };
}
