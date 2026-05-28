import { z } from "zod";
import { eq } from "drizzle-orm";
import { guideReports } from "../../../db/schema";
import { useDB } from "../../../utils/db";

const bodySchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(["reviewed", "dismissed"]),
});

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session?.user?.isAdmin) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const body = await readBody(event);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }

  const { reportId, action } = parsed.data;
  const db = useDB(event);

  const newStatus = action === "reviewed" ? "reviewed" : "dismissed";

  const result = await db
    .update(guideReports)
    .set({ status: newStatus })
    .where(eq(guideReports.id, reportId))
    .returning({ id: guideReports.id });

  if (result.length === 0) {
    throw createError({ statusCode: 404, message: "Report not found" });
  }

  return { success: true };
});
