import type { FamilyMember } from "../../../types/family";

export function createFamilyMember(name: string, relation?: string): FamilyMember {
  const now = Date.now();

  return {
    id: `${now}-${Math.random().toString(16).slice(2)}`,
    name: name.trim(),
    relation: relation?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateFamilyMember(
  member: FamilyMember,
  name: string,
  relation?: string
): FamilyMember {
  return {
    ...member,
    name: name.trim(),
    relation: relation?.trim() || undefined,
    updatedAt: Date.now(),
  };
}
