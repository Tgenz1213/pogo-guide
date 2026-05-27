import { useDB } from "../../utils/db";
import { guideSubmissions } from "../../db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (body?._type === "guide" && body._id) {
    const db = useDB(event);

    // Determine D1 status based on Sanity state
    const newStatus = body.isHiddenByModeration ? "rejected" : "published";

    await db
      .update(guideSubmissions)
      .set({ status: newStatus })
      .where(eq(guideSubmissions.sanityDocId, body._id));
  }

  return { success: true };
});
