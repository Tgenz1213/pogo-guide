import { eq, desc, count } from "drizzle-orm";
import { guideReports, users } from "../../db/schema";
import { useDB } from "../../utils/db";
import { requireAdmin } from "../../utils/admin";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const status = (query.status as string) || "all";
  const limit = 20;
  const offset = (page - 1) * limit;

  const db = useDB(event);

  const whereClause =
    status !== "all"
      ? eq(guideReports.status, status as "pending" | "reviewed" | "dismissed")
      : undefined;

  const reportsList = await db
    .select({
      id: guideReports.id,
      sanityDocId: guideReports.sanityDocId,
      reason: guideReports.reason,
      details: guideReports.details,
      status: guideReports.status,
      createdAt: guideReports.createdAt,
      reporterId: guideReports.reporterId,
      reporterUsername: users.username,
    })
    .from(guideReports)
    .leftJoin(users, eq(guideReports.reporterId, users.id))
    .where(whereClause)
    .orderBy(desc(guideReports.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ total: count() })
    .from(guideReports)
    .where(whereClause);

  const total = totalResult[0]?.total ?? 0;

  return {
    reports: reportsList,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
});
