import { expect, test } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import * as schema from "../../../server/db/schema";

test("can insert and query user and infraction", async () => {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL, status TEXT DEFAULT 'active' NOT NULL, created_at INTEGER NOT NULL, is_admin INTEGER DEFAULT 0 NOT NULL, admin_granted_via TEXT)",
  );

  const db = drizzle(env.DB, { schema });

  await db.insert(schema.users).values({
    id: "test_user_1",
    username: "TestUser",
    createdAt: new Date(),
  });

  const result = await db.select().from(schema.users);
  expect(result.length).toBe(1);
  expect(result[0]!.id).toBe("test_user_1");
});
