export type SupportMessageVisibility = "public" | "internal" | "note";

export function normalizeMessageVisibility(value: unknown): SupportMessageVisibility {
  if (value === "internal" || value === "note") return value;
  return "public";
}

export function isConversationMessage(visibility: SupportMessageVisibility): boolean {
  return visibility === "public";
}

export function isCustomerNote(visibility: SupportMessageVisibility): boolean {
  return visibility === "note";
}

export function isTeamInternalNote(visibility: SupportMessageVisibility): boolean {
  return visibility === "internal";
}
