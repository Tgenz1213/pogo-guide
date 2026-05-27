import { z } from "zod";
import { eq } from "drizzle-orm";
import { accountDeletionRequests, users } from "../../../db/schema";
import { useDB } from "../../../utils/db";

const actionSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject"]),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session || !session.user || !session.user.isAdmin) {
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
