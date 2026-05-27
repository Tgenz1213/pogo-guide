import { like, desc, count } from "drizzle-orm";
import { users } from "../../db/schema";
import { useDB } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session || !session.user || !session.user.isAdmin) {
    throw createError({
      statusCode: 403,
      message: "Forbidden",
    });
  }

  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const search = (query.search as string) || "";
  const limit = 20;
  const offset = (page - 1) * limit;

  const db = useDB(event);

  const whereClause = search ? like(users.username, `%${search}%`) : undefined;

  const usersList = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ total: count() })
    .from(users)
    .where(whereClause);

  const total = totalResult[0]?.total ?? 0;

  return {
    users: usersList,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
});
