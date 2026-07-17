import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import { users } from "../db/schema";
import { useDB } from "./db";

function parseCommaSeparatedEnvList(value: string | undefined): string[] {
  return (value || "")
    .replace(/['"]/g, "") // Strip any accidental quotes
    .split(",")
    .map((v) => v.trim());
}

export function isEmailAdmin(email: string): boolean {
  if (!email) return false;

  return parseCommaSeparatedEnvList(process.env.INITIAL_ADMIN_EMAILS).includes(
    email,
  );
}

export function isSuperAdminId(id: string): boolean {
  if (!id) return false;

  return parseCommaSeparatedEnvList(process.env.SUPER_ADMIN_IDS).includes(id);
}

export interface AdminProvenanceState {
  isAdmin: boolean;
  adminGrantedVia:
    "bootstrap" | "admin_panel" | "super_admin" | "revoked" | null;
}

/**
 * Determines initial admin state for a brand-new user row at first login.
 * Shared by both OAuth handlers so the insert-path precedence (super admin
 * wins over allowlist) can't drift between providers.
 */
export function resolveNewUserAdminState(
  providerAccountId: string,
  isOnAllowlist: boolean,
): AdminProvenanceState {
  const isSuperAdmin = isSuperAdminId(providerAccountId);

  return {
    isAdmin: isSuperAdmin || isOnAllowlist,
    adminGrantedVia: isSuperAdmin
      ? "super_admin"
      : isOnAllowlist
        ? "bootstrap"
        : null,
  };
}

export async function reconcileBootstrapAdmin(
  db: ReturnType<typeof useDB>,
  userId: string,
  currentUser: AdminProvenanceState,
  isOnAllowlist: boolean,
): Promise<boolean> {
  if (
    !currentUser.isAdmin &&
    isOnAllowlist &&
    currentUser.adminGrantedVia !== "revoked"
  ) {
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
 * Shared authorization primitive for every admin-panel route that mutates
 * another account: a super admin can never be acted on by anyone, and a
 * regular admin can only be acted on by a super admin. Callers decide which
 * of their actions are restricted enough to check this (e.g. granting admin
 * to a non-admin is never restricted).
 */
export function isProtectedFromActor(
  actingUserId: string,
  target: { id: string; isAdmin: boolean },
): boolean {
  if (isSuperAdminId(target.id)) return true;
  if (target.isAdmin && !isSuperAdminId(actingUserId)) return true;
  return false;
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
