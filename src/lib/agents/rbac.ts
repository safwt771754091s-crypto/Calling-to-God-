import { auth } from "@/auth";
import { roleAtLeast, type Role } from "./roles";

/**
 * Server-side role checks for the agent dashboard and its API. The UI also
 * hides controls, but authorisation is enforced here — never by the client.
 */
export type { Role };

export interface StaffSession {
  id: string;
  email: string;
  role: Role;
}

/** Returns the signed-in staff member, or null when unauthenticated. */
export async function currentStaff(): Promise<StaffSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: ((session.user as { role?: string }).role ?? "EDITOR") as Role,
  };
}

/** Require at least `min` role. Returns null when the caller is not permitted. */
export async function requireRole(min: Role): Promise<StaffSession | null> {
  const staff = await currentStaff();
  if (!staff || !roleAtLeast(staff.role, min)) return null;
  return staff;
}
