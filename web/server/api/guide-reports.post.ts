import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { guideReports } from "../db/schema";
import { useDB } from "../utils/db";

const bodySchema = z.object({
  sanityDocId: z.string().min(1).max(255),
  reason: z.enum(["inaccurate", "spam", "copyright", "inappropriate", "other"]),
  details: z.string().max(500).optional(),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }

  const { sanityDocId, reason, details } = parsed.data;
  const db = useDB(event);

  // Check for an existing report by this user for this guide
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

  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      message: "You have already reported this guide.",
    });
  }

  const id = crypto.randomUUID();

  await db.insert(guideReports).values({
    id,
    reporterId: session.user.id,
    sanityDocId,
    reason,
    details: details ?? null,
    status: "pending",
    createdAt: new Date(),
  });

  return { success: true, id };
});
