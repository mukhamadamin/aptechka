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
  expiresAt?: string;
  remindDaysBefore?: number;
};

export type Medicine = MedicineForm & {
  id: string;
  createdAt: number;
  updatedAt: number;
  notificationIds?: string[];
};
