import { z } from "zod";
import { eq } from "drizzle-orm";
import { accountDeletionRequests, users } from "../../../db/schema";
import { useDB } from "../../../utils/db";
import { requireAdmin, isProtectedFromActor } from "../../../utils/admin";

const actionSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject"]),
});

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event);
  if (!session.user) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

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
    if (request.userId) {
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId));

      if (targetUser && isProtectedFromActor(session.user.id, targetUser)) {
        throw createError({
          statusCode: 403,
          message: "This account is protected and cannot be modified.",
        });
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
