import { expect, test } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:test";
import * as schema from "../../../server/db/schema";

test("can insert and query user and infraction", async () => {
  const db = drizzle(env.DB, { schema });

  await db.insert(schema.users).values({
    id: "test_user_1",
    username: "TestUser",
    createdAt: new Date(),
  });

  const result = await db.select().from(schema.users);
  expect(result.length).toBe(1);
  expect(result[0].id).toBe("test_user_1");
});
