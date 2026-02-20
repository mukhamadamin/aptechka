export type MedicineForm = {
  name: string;
  dosageForm?: "tablet" | "capsule" | "liquid" | "powder" | "other";
  dosage?: string;
  quantityValue?: number;
  quantityUnit?: "pcs" | "ml" | "g";
  quantity?: string;
  notes?: string;
  manufacturerCountry?: string;
  barcode?: string;
  intakeTimes?: string;
  intakeMemberUids?: string[];
  intakeMembersByTime?: Record<string, string[]>;
  expiresAt?: string;
  remindDaysBefore?: number;
};

export type Medicine = MedicineForm & {
  id: string;
  createdAt: number;
  updatedAt: number;
  notificationIds?: string[];
};

export type MedicineIntakeLog = {
  id: string;
  medicineId: string;
  actorUid: string;
  actorName: string;
  amount: number;
  unit?: "pcs" | "ml" | "g";
  takenAt: number;
  createdAt: number;
};
