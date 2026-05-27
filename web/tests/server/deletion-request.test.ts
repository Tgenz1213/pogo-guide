import { describe, it, expect } from "vitest";

describe("POST /api/user/deletion-request", () => {
  it("should return 401 if user is not authenticated", async () => {
    expect(true).toBe(false); // Force failing test to establish RED
  });
});
