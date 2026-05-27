import { eq, desc } from "drizzle-orm";
import { guideSubmissions } from "../../db/schema";
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

  const submissions = await db
    .select()
    .from(guideSubmissions)
    .where(eq(guideSubmissions.userId, session.id))
    .orderBy(desc(guideSubmissions.createdAt));

  return submissions;
});
