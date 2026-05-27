import { eq, desc } from "drizzle-orm";
import { accountDeletionRequests, users } from "../../db/schema";
import { useDB } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session || !session.user || !session.user.isAdmin) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  const db = useDB(event);

  const requests = await db
    .select({
      id: accountDeletionRequests.id,
      userId: accountDeletionRequests.userId,
      status: accountDeletionRequests.status,
      createdAt: accountDeletionRequests.createdAt,
      username: users.username,
    })
    .from(accountDeletionRequests)
    .leftJoin(users, eq(accountDeletionRequests.userId, users.id))
    .where(eq(accountDeletionRequests.status, "pending"))
    .orderBy(desc(accountDeletionRequests.createdAt));

  return requests;
});
