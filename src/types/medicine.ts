export type MedicineForm = {
  name: string;
  dosage?: string;
  quantity?: string;
  notes?: string;

  // NEW:
  expiresAt?: string; // ISO (например "2026-02-10T00:00:00.000Z")
  remindDaysBefore?: number; // за сколько дней напомнить
};

export type Medicine = MedicineForm & {
  id: string;
  createdAt: number;
  updatedAt: number;

  // NEW: чтобы можно было отменять уведомления при удалении/редактировании
  notificationIds?: string[];
};
