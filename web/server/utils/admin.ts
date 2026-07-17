import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { users } from "../db/schema";
import { useDB } from "./db";

export function isEmailAdmin(email: string): boolean {
  if (!email) return false;

  const initialAdminsStr = process.env.INITIAL_ADMIN_EMAILS || "";
  const initialAdmins = initialAdminsStr
    .replace(/['"]/g, "") // Strip any accidental quotes
    .split(",")
    .map((e) => e.trim());

  return initialAdmins.includes(email);
}

export function isSuperAdminId(id: string): boolean {
  if (!id) return false;

  const superAdminIdsStr = process.env.SUPER_ADMIN_IDS || "";
  const superAdminIds = superAdminIdsStr
    .replace(/['"]/g, "")
    .split(",")
    .map((v) => v.trim());

  return superAdminIds.includes(id);
}

interface AdminProvenanceState {
  isAdmin: boolean;
  adminGrantedVia: "bootstrap" | "admin_panel" | "super_admin" | null;
}

export async function reconcileBootstrapAdmin(
  db: ReturnType<typeof useDB>,
  userId: string,
  currentUser: AdminProvenanceState,
  isOnAllowlist: boolean,
): Promise<boolean> {
  if (!currentUser.isAdmin && isOnAllowlist) {
    await db
      .update(users)
      .set({ isAdmin: true, adminGrantedVia: "bootstrap" })
      .where(eq(users.id, userId));
    return true;
  }

  if (
    currentUser.isAdmin &&
    !isOnAllowlist &&
    currentUser.adminGrantedVia === "bootstrap"
  ) {
    await db
      .update(users)
      .set({ isAdmin: false, adminGrantedVia: null })
      .where(eq(users.id, userId));
    return false;
  }

  return currentUser.isAdmin;
}

export async function enforceSuperAdmin(
  db: ReturnType<typeof useDB>,
  userId: string,
  currentUser: AdminProvenanceState,
): Promise<boolean> {
  if (!isSuperAdminId(userId)) return false;

  if (!currentUser.isAdmin || currentUser.adminGrantedVia !== "super_admin") {
    await db
      .update(users)
      .set({ isAdmin: true, adminGrantedVia: "super_admin" })
      .where(eq(users.id, userId));
  }

  return true;
}

/**
 * Guards `/api/admin/*` routes. `session.user.isAdmin` is baked into the
 * sealed session cookie at login time, so demoting a user in D1 (see
 * `/api/admin/users/action.post.ts`) does not by itself revoke an already
 * -issued session. This re-reads the user's current `isAdmin` from D1 on
 * every admin request so demotion takes effect immediately, without
 * requiring a server-side session store to invalidate by user id.
 */
export async function requireAdmin(event: H3Event) {
  const session = await getUserSession(event);

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const db = useDB(event);
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!currentUser?.isAdmin) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  return session;
}
