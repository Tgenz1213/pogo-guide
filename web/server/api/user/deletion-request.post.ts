import { accountDeletionRequests } from "../../db/schema";
import { useDB } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const db = useDB(event);

  const newId = crypto.randomUUID();

  await db.insert(accountDeletionRequests).values({
    id: newId,
    userId: session.id,
    status: "pending",
    createdAt: new Date(),
  });

  return { success: true, id: newId };
});
