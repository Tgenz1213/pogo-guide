import { eq } from "drizzle-orm";
import type { H3Event } from "h3";
import type { User } from "#auth-utils";
import { users } from "../db/schema";
import { useDB } from "./db";

function parseCommaSeparatedEnvList(value: string | undefined): string[] {
  return (value || "")
    .replace(/['"]/g, "") // Strip any accidental quotes
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function isEmailAdmin(email: string): boolean {
  if (!email) return false;

  const normalized = email.toLowerCase();
  return parseCommaSeparatedEnvList(process.env.INITIAL_ADMIN_EMAILS)
    .map((e) => e.toLowerCase())
    .includes(normalized);
}

export function isSuperAdminId(id: string): boolean {
  if (!id) return false;

  return parseCommaSeparatedEnvList(process.env.SUPER_ADMIN_IDS).includes(id);
}

export interface AdminProvenanceState {
  isAdmin: boolean;
  adminGrantedVia: (typeof users.$inferSelect)["adminGrantedVia"];
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
 * Resolves and self-heals a returning user's admin status on login: super
 * admin status always wins over (and short-circuits) the allowlist check.
 * Shared by both OAuth handlers so this precedence can't drift between
 * providers the way the individual grant/demote primitives could if each
 * handler re-sequenced them independently.
 */
export async function resolveReturningUserAdmin(
  db: ReturnType<typeof useDB>,
  userId: string,
  currentUser: AdminProvenanceState,
  isOnAllowlist: boolean,
): Promise<boolean> {
  const isSuperAdmin = await enforceSuperAdmin(db, userId, currentUser);
  if (isSuperAdmin) return true;
  return reconcileBootstrapAdmin(db, userId, currentUser, isOnAllowlist);
}

/**
 * Shared authorization primitive for every admin-panel route that mutates
 * another account: a super admin can never be acted on by anyone else, and a
 * regular admin can only be acted on by a super admin. This has NO
 * self-action exemption — a self-ban would insert a row into
 * `bannedIdentities`, which the OAuth login flow checks *before*
 * `enforceSuperAdmin` runs, so it would permanently lock the account out
 * with no self-heal (unlike a self-demotion, which only touches `isAdmin`
 * and heals on the next login). Callers that want to allow a specific
 * self-directed action (self-demote via `make_admin`, self-approve a GDPR
 * deletion request) must exempt `actingUserId === target.id` themselves,
 * scoped to that one action — never as a blanket bypass of this function.
 */
export function isProtectedFromActor(
  actingUserId: string,
  target: { id: string; isAdmin: boolean },
): boolean {
  const superAdminIds = parseCommaSeparatedEnvList(process.env.SUPER_ADMIN_IDS);
  if (superAdminIds.includes(target.id)) return true;
  if (target.isAdmin && !superAdminIds.includes(actingUserId)) return true;
  return false;
}

/**
 * Throws the standard 403 for every admin-mutation route that guards a
 * restricted action behind `isProtectedFromActor`.
 */
export function assertNotProtected(
  actingUserId: string,
  target: { id: string; isAdmin: boolean },
): void {
  if (isProtectedFromActor(actingUserId, target)) {
    throw createError({
      statusCode: 403,
      message: "This account is protected and cannot be modified.",
    });
  }
}

/**
 * Guards `/api/admin/*` routes. `session.user.isAdmin` is baked into the
 * sealed session cookie at login time, so demoting a user in D1 (see
 * `/api/admin/users/action.post.ts`) does not by itself revoke an already
 * -issued session. This re-reads the user's current `isAdmin` from D1 on
 * every admin request so demotion takes effect immediately, without
 * requiring a server-side session store to invalidate by user id.
 */
export async function requireAdmin(event: H3Event): Promise<{ user: User }> {
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

  return { user: session.user };
}
