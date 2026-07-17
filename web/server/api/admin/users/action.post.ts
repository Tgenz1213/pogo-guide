import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, infractions, bannedIdentities } from "../../../db/schema";
import { useDB } from "../../../utils/db";
import { computeIdentityHash } from "../../../utils/identity-hash";
import { requireAdmin, isSuperAdminId } from "../../../utils/admin";

const actionSchema = z.object({
  userId: z.string(),
  action: z.enum(["warn", "ban", "make_admin"]),
  reason: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event);
  // requireAdmin already throws if the session lacks an admin user, but its
  // return type (nuxt-auth-utils' UserSession) still types `user` as
  // optional, so narrow it here for strict-TypeScript compliance.
  if (!session.user) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const body = await readValidatedBody(event, actionSchema.parse);
  const db = useDB(event);

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, body.userId));

  if (!targetUser) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const wouldRevokeAdmin = body.action === "make_admin" && targetUser.isAdmin;
  const isRestrictedAction =
    body.action === "warn" || body.action === "ban" || wouldRevokeAdmin;

  if (isRestrictedAction) {
    if (isSuperAdminId(targetUser.id)) {
      throw createError({
        statusCode: 403,
        message: "This account is protected and cannot be modified.",
      });
    }

    if (targetUser.isAdmin && !isSuperAdminId(session.user.id)) {
      throw createError({
        statusCode: 403,
        message:
          "Only a super admin can take this action against another admin.",
      });
    }
  }

  if (body.action === "make_admin") {
    const nextIsAdmin = !targetUser.isAdmin;
    await db
      .update(users)
      .set({
        isAdmin: nextIsAdmin,
        adminGrantedVia: nextIsAdmin ? "admin_panel" : null,
      })
      .where(eq(users.id, body.userId));
    return { success: true, message: `Admin status toggled` };
  }

  const identityHash = await computeIdentityHash(targetUser.id);

  if (body.action === "warn") {
    await db
      .update(users)
      .set({ status: "warned" })
      .where(eq(users.id, body.userId));

    await db.insert(infractions).values({
      id: crypto.randomUUID(),
      userId: targetUser.id,
      identityHash,
      type: "minor",
      issuedAt: new Date(),
    });
    return { success: true, message: "User warned" };
  }

  if (body.action === "ban") {
    await db
      .update(users)
      .set({ status: "banned" })
      .where(eq(users.id, body.userId));

    await db.insert(infractions).values({
      id: crypto.randomUUID(),
      userId: targetUser.id,
      identityHash,
      type: "spam",
      issuedAt: new Date(),
    });

    // Also insert into bannedIdentities
    await db
      .insert(bannedIdentities)
      .values({
        id: crypto.randomUUID(),
        hashedIdentity: identityHash,
        bannedAt: new Date(),
        reason: body.reason || "Banned by admin",
      })
      .onConflictDoNothing();

    return { success: true, message: "User banned" };
  }

  return { success: false };
});
