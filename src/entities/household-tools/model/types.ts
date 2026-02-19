export type ShoppingPriority = "normal" | "high";

export type ShoppingItem = {
  id: string;
  title: string;
  quantity?: string;
  done: boolean;
  priority: ShoppingPriority;
  createdByUid: string;
  createdAt: number;
  updatedAt: number;
};

export type EmergencyProfile = {
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  address?: string;
  notes?: string;
  updatedAt?: number;
};
