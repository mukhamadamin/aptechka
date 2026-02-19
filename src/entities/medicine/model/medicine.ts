import type { Medicine, MedicineForm } from "../../../types/medicine";

function safeTrim(value?: string) {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeQuantityValue(value?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.round(value * 100) / 100);
}

export function normalizeMedicineForm(input: MedicineForm): MedicineForm {
  const remindDaysBefore =
    typeof input.remindDaysBefore === "number" && Number.isFinite(input.remindDaysBefore)
      ? Math.max(0, Math.min(365, Math.floor(input.remindDaysBefore)))
      : undefined;

  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const expiresISO =
    expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt.toISOString() : undefined;

  const quantityValue = normalizeQuantityValue(input.quantityValue);
  const quantityUnit = input.quantityUnit;
  const legacyQuantity = safeTrim(input.quantity);
  const quantityText =
    quantityValue !== undefined
      ? `${quantityValue} ${quantityUnit ?? ""}`.trim()
      : legacyQuantity;

  return {
    name: (input.name ?? "").trim(),
    dosageForm: input.dosageForm,
    dosage: safeTrim(input.dosage),
    quantityValue,
    quantityUnit,
    quantity: quantityText,
    notes: safeTrim(input.notes),
    manufacturerCountry: safeTrim(input.manufacturerCountry),
    barcode: safeTrim(input.barcode),
    intakeTimes: safeTrim(input.intakeTimes),
    expiresAt: expiresISO,
    remindDaysBefore,
  };
}

export function validateMedicineForm(form: MedicineForm) {
  if (!form.name || form.name.trim().length < 2) {
    return "validation.medicineName";
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
