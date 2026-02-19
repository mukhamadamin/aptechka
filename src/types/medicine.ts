export type MedicineForm = {
  name: string;
  dosage?: string;
  quantity?: string;
  notes?: string;
  expiresAt?: string;
  remindDaysBefore?: number;
};

export type Medicine = MedicineForm & {
  id: string;
  createdAt: number;
  updatedAt: number;
  notificationIds?: string[];
};
