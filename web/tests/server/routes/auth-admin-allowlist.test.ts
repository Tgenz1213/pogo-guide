import { describe, it, expect, vi, afterEach } from "vitest";
import type { H3Event } from "h3";

function stubOAuthGlobals() {
  vi.stubGlobal("defineOAuthDiscordEventHandler", (config: unknown) => config);
  vi.stubGlobal("defineOAuthGoogleEventHandler", (config: unknown) => config);
  vi.stubGlobal("getCookie", vi.fn().mockReturnValue(undefined));
  vi.stubGlobal("deleteCookie", vi.fn());
  vi.stubGlobal(
    "sendRedirect",
    vi.fn((_event: unknown, url: string) => url),
  );
  vi.stubGlobal("setUserSession", vi.fn().mockResolvedValue(true));
  vi.stubGlobal("useRuntimeConfig", () => ({
    session: { password: "test-password" },
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

type OnSuccessHandler = {
  onSuccess: (
    event: H3Event,
    data: { user: Record<string, unknown> },
  ) => Promise<unknown>;
};

describe("OAuth admin-allowlist parity (Discord vs Google)", () => {
  it("regression: Discord first login with a whitespace-padded allowlisted email grants admin, matching Google's isEmailAdmin()", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", " admin@example.com ");
    stubOAuthGlobals();

    const insertedValues: Array<Record<string, unknown>> = [];
    vi.doMock("../../../server/utils/db", () => ({
      useDB: () => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]), // not banned, no existing user
        insert: vi.fn().mockReturnThis(),
        values: vi.fn((v: Record<string, unknown>) => {
          insertedValues.push(v);
          return Promise.resolve([{}]);
        }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      }),
    }));

    const { default: discordHandler } =
      await import("../../../server/routes/auth/discord.get");

    const mockEvent = {} as unknown as H3Event;
    await (discordHandler as OnSuccessHandler).onSuccess(mockEvent, {
      user: { id: "12345", email: "admin@example.com", username: "tester" },
    });

    expect(insertedValues[0]?.isAdmin).toBe(true);
  });

  it("regression: Discord returning user whose email is newly added to the allowlist is self-healed to admin on login, matching Google", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin@example.com");
    stubOAuthGlobals();

    const existingUser = {
      id: "discord:12345",
      username: "tester",
      status: "active",
      createdAt: new Date(),
      isAdmin: false,
    };

    const setCalls: Array<Record<string, unknown>> = [];
    const whereMock = vi
      .fn()
      .mockResolvedValueOnce([]) // banned_identities check
      .mockResolvedValueOnce([existingUser]) // users lookup
      .mockResolvedValue(undefined); // update(...).set(...).where(...)

    const dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: whereMock,
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{}]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn((v: Record<string, unknown>) => {
        setCalls.push(v);
        return dbMock;
      }),
    };

    vi.doMock("../../../server/utils/db", () => ({
      useDB: () => dbMock,
    }));

    const { default: discordHandler } =
      await import("../../../server/routes/auth/discord.get");

    const mockEvent = {} as unknown as H3Event;
    await (discordHandler as OnSuccessHandler).onSuccess(mockEvent, {
      user: { id: "12345", email: "admin@example.com", username: "tester" },
    });

    expect(setCalls).toContainEqual({ isAdmin: true });
  });

  it("Discord first login with a non-allowlisted email does not grant admin", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "admin@example.com");
    stubOAuthGlobals();

    const insertedValues: Array<Record<string, unknown>> = [];
    vi.doMock("../../../server/utils/db", () => ({
      useDB: () => ({
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn((v: Record<string, unknown>) => {
          insertedValues.push(v);
          return Promise.resolve([{}]);
        }),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      }),
    }));

    const { default: discordHandler } =
      await import("../../../server/routes/auth/discord.get");

    const mockEvent = {} as unknown as H3Event;
    await (discordHandler as OnSuccessHandler).onSuccess(mockEvent, {
      user: {
        id: "12345",
        email: "not-an-admin@example.com",
        username: "tester",
      },
    });

    expect(insertedValues[0]?.isAdmin).toBe(false);
  });
});
