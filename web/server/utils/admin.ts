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
