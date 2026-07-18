import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import * as schema from "../../../server/db/schema";
import {
  reconcileBootstrapAdmin,
  enforceSuperAdmin,
  isSuperAdminId,
} from "../../../server/utils/admin";

const db = drizzle(env.DB, { schema });

beforeEach(async () => {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, username TEXT NOT NULL, status TEXT DEFAULT 'active' NOT NULL, created_at INTEGER NOT NULL, is_admin INTEGER DEFAULT 0 NOT NULL, admin_granted_via TEXT)",
  );
  await env.DB.exec("DELETE FROM users");
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function insertUser(row: {
  id: string;
  isAdmin: boolean;
  adminGrantedVia:
    "bootstrap" | "admin_panel" | "super_admin" | "revoked" | null;
}) {
  await db.insert(schema.users).values({
    id: row.id,
    username: "integration-test-user",
    createdAt: new Date(),
    isAdmin: row.isAdmin,
    adminGrantedVia: row.adminGrantedVia,
  });
}

async function loadUser(id: string) {
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return row;
}

test("reconcileBootstrapAdmin demotes a real persisted bootstrap-granted admin when off the allowlist", async () => {
  await insertUser({
    id: "discord:real-demote-1",
    isAdmin: true,
    adminGrantedVia: "bootstrap",
  });

  const result = await reconcileBootstrapAdmin(
    db,
    "discord:real-demote-1",
    { isAdmin: true, adminGrantedVia: "bootstrap" },
    false,
  );

  expect(result).toBe(false);

  const row = await loadUser("discord:real-demote-1");
  expect(row?.isAdmin).toBe(false);
  expect(row?.adminGrantedVia).toBeNull();
});

test("reconcileBootstrapAdmin does not touch a real persisted admin_panel-granted admin when off the allowlist", async () => {
  await insertUser({
    id: "discord:real-protect-1",
    isAdmin: true,
    adminGrantedVia: "admin_panel",
  });

  const result = await reconcileBootstrapAdmin(
    db,
    "discord:real-protect-1",
    { isAdmin: true, adminGrantedVia: "admin_panel" },
    false,
  );

  expect(result).toBe(true);

  const row = await loadUser("discord:real-protect-1");
  expect(row?.isAdmin).toBe(true);
  expect(row?.adminGrantedVia).toBe("admin_panel");
});

test("reconcileBootstrapAdmin grants a real persisted non-admin whose email joins the allowlist", async () => {
  await insertUser({
    id: "discord:real-grant-1",
    isAdmin: false,
    adminGrantedVia: null,
  });

  const result = await reconcileBootstrapAdmin(
    db,
    "discord:real-grant-1",
    { isAdmin: false, adminGrantedVia: null },
    true,
  );

  expect(result).toBe(true);

  const row = await loadUser("discord:real-grant-1");
  expect(row?.isAdmin).toBe(true);
  expect(row?.adminGrantedVia).toBe("bootstrap");
});

test("enforceSuperAdmin persists isAdmin=true and adminGrantedVia='super_admin' for a real row matching SUPER_ADMIN_IDS", async () => {
  vi.stubEnv("SUPER_ADMIN_IDS", "google:real-super-1");
  await insertUser({
    id: "google:real-super-1",
    isAdmin: false,
    adminGrantedVia: null,
  });

  const handled = await enforceSuperAdmin(db, "google:real-super-1", {
    isAdmin: false,
    adminGrantedVia: null,
  });

  expect(handled).toBe(true);

  const row = await loadUser("google:real-super-1");
  expect(row?.isAdmin).toBe(true);
  expect(row?.adminGrantedVia).toBe("super_admin");
});

test("enforceSuperAdmin leaves a real non-protected row completely untouched", async () => {
  vi.stubEnv("SUPER_ADMIN_IDS", "google:someone-else");
  await insertUser({
    id: "google:real-not-super",
    isAdmin: true,
    adminGrantedVia: "bootstrap",
  });

  const handled = await enforceSuperAdmin(db, "google:real-not-super", {
    isAdmin: true,
    adminGrantedVia: "bootstrap",
  });

  expect(handled).toBe(false);

  const row = await loadUser("google:real-not-super");
  expect(row?.isAdmin).toBe(true);
  expect(row?.adminGrantedVia).toBe("bootstrap");
});

test("reconcileBootstrapAdmin does not re-grant a real persisted panel-revoked user even when still on the allowlist (sticky revoke)", async () => {
  await insertUser({
    id: "discord:real-revoked-1",
    isAdmin: false,
    adminGrantedVia: "revoked",
  });

  const result = await reconcileBootstrapAdmin(
    db,
    "discord:real-revoked-1",
    { isAdmin: false, adminGrantedVia: "revoked" },
    true,
  );

  expect(result).toBe(false);

  const row = await loadUser("discord:real-revoked-1");
  expect(row?.isAdmin).toBe(false);
  expect(row?.adminGrantedVia).toBe("revoked");
});

test("isSuperAdminId reads the real process.env.SUPER_ADMIN_IDS value", () => {
  vi.stubEnv("SUPER_ADMIN_IDS", "discord:abc, google:def ");
  expect(isSuperAdminId("discord:abc")).toBe(true);
  expect(isSuperAdminId("google:def")).toBe(true);
  expect(isSuperAdminId("discord:xyz")).toBe(false);
});
