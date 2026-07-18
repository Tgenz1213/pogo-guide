import { z } from "zod";
import { eq } from "drizzle-orm";
import { accountDeletionRequests, users } from "../../../db/schema";
import { useDB } from "../../../utils/db";
import { requireAdmin, assertNotProtected } from "../../../utils/admin";

const actionSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject"]),
});

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event);

  const body = await readValidatedBody(event, actionSchema.parse);
  const db = useDB(event);

  const [request] = await db
    .select()
    .from(accountDeletionRequests)
    .where(eq(accountDeletionRequests.id, body.requestId));

  if (!request || request.status !== "pending") {
    throw createError({
      statusCode: 404,
      message: "Pending request not found",
    });
  }

  if (body.action === "reject") {
    await db
      .update(accountDeletionRequests)
      .set({ status: "rejected" })
      .where(eq(accountDeletionRequests.id, body.requestId));
    return { success: true, message: "Request rejected" };
  }

  if (body.action === "approve") {
    // A protected admin may always approve their OWN deletion request (GDPR
    // self-service erasure) — a super admin's account is recreated with
    // super-admin status on their next login regardless, so this isn't a
    // lockout. Approving someone ELSE's deletion still respects the hierarchy.
    const isSelfAction = request.userId === session.user.id;
    if (request.userId && !isSelfAction) {
      const [targetUser] = await db
        .select({ id: users.id, isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, request.userId));

      if (targetUser) {
        assertNotProtected(session.user.id, targetUser);
      }
    }

    // 1. Mark request as approved
    await db
      .update(accountDeletionRequests)
      .set({ status: "approved" })
      .where(eq(accountDeletionRequests.id, body.requestId));

    // 2. Delete the user (cascades or sets null depending on schema)
    if (request.userId) {
      await db.delete(users).where(eq(users.id, request.userId));
    }

    return { success: true, message: "Account deleted" };
  }

  return { success: false };
});
