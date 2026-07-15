import { z } from "zod";
import { eq } from "drizzle-orm";
import { users, infractions, banned_identities } from "../../../db/schema";
import { useDB } from "../../../utils/db";
import { computeIdentityHash } from "../../../utils/identity-hash";
import { requireAdmin } from "../../../utils/admin";

const actionSchema = z.object({
  userId: z.string(),
  action: z.enum(["warn", "ban", "make_admin"]),
  reason: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readValidatedBody(event, actionSchema.parse);
  const db = useDB(event);

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, body.userId));

  if (!targetUser) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  if (body.action === "make_admin") {
    await db
      .update(users)
      .set({ isAdmin: !targetUser.isAdmin })
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

    // Also insert into banned_identities
    await db
      .insert(banned_identities)
      .values({
        id: crypto.randomUUID(),
        hashed_identity: identityHash,
        banned_at: new Date(),
        reason: body.reason || "Banned by admin",
      })
      .onConflictDoNothing();

    return { success: true, message: "User banned" };
  }

  return { success: false };
});
