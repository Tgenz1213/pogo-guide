import { eq, and } from "drizzle-orm";
import { guideReports } from "../../db/schema";
import { useDB } from "../../utils/db";

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const sanityDocId = getRouterParam(event, "sanityDocId");

  if (!sanityDocId) {
    throw createError({ statusCode: 400, message: "Missing guide ID" });
  }

  const db = useDB(event);

  const existing = await db
    .select({ id: guideReports.id })
    .from(guideReports)
    .where(
      and(
        eq(guideReports.reporterId, session.user.id),
        eq(guideReports.sanityDocId, sanityDocId),
      ),
    )
    .limit(1);

  return { hasReported: existing.length > 0 };
});
