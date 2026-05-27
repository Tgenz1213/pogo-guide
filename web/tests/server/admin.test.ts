import { describe, it, expect, vi, beforeEach } from "vitest";
import { isEmailAdmin } from "../../server/utils/admin";

describe("isEmailAdmin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return false if no INITIAL_ADMIN_EMAILS env variable is set", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "");
    expect(isEmailAdmin("test@example.com")).toBe(false);
  });

  it("should return true if email is in INITIAL_ADMIN_EMAILS", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com,admin2@example.com");
    expect(isEmailAdmin("admin2@example.com")).toBe(true);
  });

  it("should return false if email is not in INITIAL_ADMIN_EMAILS", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com");
    expect(isEmailAdmin("user@example.com")).toBe(false);
  });

  it("should handle spaces around emails in the env var", () => {
    vi.stubEnv(
      "INITIAL_ADMIN_EMAILS",
      " admin1@example.com , admin2@example.com ",
    );
    expect(isEmailAdmin("admin2@example.com")).toBe(true);
  });

  it("should return false for empty email", () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin1@example.com");
    expect(isEmailAdmin("")).toBe(false);
  });
});
