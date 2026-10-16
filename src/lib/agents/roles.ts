/** Pure role-ranking helpers (no server/auth imports, so they stay unit-testable). */
export type Role = "ADMIN" | "SCHOLAR" | "EDITOR";

const RANK: Record<Role, number> = { EDITOR: 1, SCHOLAR: 2, ADMIN: 3 };

export function roleAtLeast(role: string | undefined, min: Role): boolean {
  const r = (role ?? "EDITOR") as Role;
  return (RANK[r] ?? 0) >= RANK[min];
}
