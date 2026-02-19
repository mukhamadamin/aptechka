export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  householdId: string | null;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  address?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
