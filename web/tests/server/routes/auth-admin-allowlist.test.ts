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
  vi.doUnmock("../../../server/utils/db");
  vi.resetModules();
});

type OnSuccessHandler = {
  onSuccess: (
    event: H3Event,
    data: { user: Record<string, unknown> },
  ) => Promise<unknown>;
};

const providers = [
  {
    name: "Discord",
    modulePath: "../../../server/routes/auth/discord.get",
    userId: "discord:12345",
    oauthUser: (email: string) => ({
      id: "12345",
      email,
      username: "tester",
    }),
  },
  {
    name: "Google",
    modulePath: "../../../server/routes/auth/google.get",
    userId: "google:12345",
    oauthUser: (email: string) => ({
      sub: "12345",
      email,
      name: "tester",
    }),
  },
] as const;

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

    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "bootstrap",
    });
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

describe.each(providers)(
  "OAuth allowlist demotion ($name) — issue #52",
  (provider) => {
    it("new user, email on allowlist -> inserted with adminGrantedVia 'bootstrap'", async () => {
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

      const { default: handler } = await import(provider.modulePath);
      const mockEvent = {} as unknown as H3Event;
      await (handler as OnSuccessHandler).onSuccess(mockEvent, {
        user: provider.oauthUser("admin@example.com"),
      });

      expect(insertedValues[0]?.isAdmin).toBe(true);
      expect(insertedValues[0]?.adminGrantedVia).toBe("bootstrap");
    });

    it("new user, email not on allowlist -> inserted with adminGrantedVia null", async () => {
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

      const { default: handler } = await import(provider.modulePath);
      const mockEvent = {} as unknown as H3Event;
      await (handler as OnSuccessHandler).onSuccess(mockEvent, {
        user: provider.oauthUser("nobody@example.com"),
      });

      expect(insertedValues[0]?.isAdmin).toBe(false);
      expect(insertedValues[0]?.adminGrantedVia).toBe(null);
    });

    it("returning admin granted via bootstrap, email removed from allowlist -> demoted", async () => {
      vi.stubEnv("INITIAL_ADMIN_EMAILS", "someone-else@example.com");
      stubOAuthGlobals();

      const existingUser = {
        id: provider.userId,
        username: "tester",
        status: "active",
        createdAt: new Date(),
        isAdmin: true,
        adminGrantedVia: "bootstrap",
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

      const { default: handler } = await import(provider.modulePath);
      const mockEvent = {} as unknown as H3Event;
      const result = await (handler as OnSuccessHandler).onSuccess(mockEvent, {
        user: provider.oauthUser("removed@example.com"),
      });
      void result;

      expect(setCalls).toContainEqual({
        isAdmin: false,
        adminGrantedVia: null,
      });
    });

    it("returning admin granted via admin_panel, email not on allowlist -> NOT demoted (regression guard)", async () => {
      vi.stubEnv("INITIAL_ADMIN_EMAILS", "someone-else@example.com");
      stubOAuthGlobals();

      const existingUser = {
        id: provider.userId,
        username: "tester",
        status: "active",
        createdAt: new Date(),
        isAdmin: true,
        adminGrantedVia: "admin_panel",
      };

      const setCalls: Array<Record<string, unknown>> = [];
      const whereMock = vi
        .fn()
        .mockResolvedValueOnce([]) // banned_identities check
        .mockResolvedValueOnce([existingUser]); // users lookup

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

      const { default: handler } = await import(provider.modulePath);
      const mockEvent = {} as unknown as H3Event;
      await (handler as OnSuccessHandler).onSuccess(mockEvent, {
        user: provider.oauthUser("removed@example.com"),
      });

      expect(setCalls).toEqual([]);
    });

    it("returning admin with no tracked provenance (legacy row), email not on allowlist -> NOT demoted (safety-net regression guard)", async () => {
      vi.stubEnv("INITIAL_ADMIN_EMAILS", "someone-else@example.com");
      stubOAuthGlobals();

      const existingUser = {
        id: provider.userId,
        username: "tester",
        status: "active",
        createdAt: new Date(),
        isAdmin: true,
        adminGrantedVia: null,
      };

      const setCalls: Array<Record<string, unknown>> = [];
      const whereMock = vi
        .fn()
        .mockResolvedValueOnce([]) // banned_identities check
        .mockResolvedValueOnce([existingUser]); // users lookup

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

      const { default: handler } = await import(provider.modulePath);
      const mockEvent = {} as unknown as H3Event;
      await (handler as OnSuccessHandler).onSuccess(mockEvent, {
        user: provider.oauthUser("removed@example.com"),
      });

      expect(setCalls).toEqual([]);
    });
  },
);

describe.each(providers)("OAuth super-admin protection ($name)", (provider) => {
  it("new user matching SUPER_ADMIN_IDS is always granted, regardless of INITIAL_ADMIN_EMAILS", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "someone-else@example.com");
    vi.stubEnv("SUPER_ADMIN_IDS", provider.userId);
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

    const { default: handler } = await import(provider.modulePath);
    const mockEvent = {} as unknown as H3Event;
    await (handler as OnSuccessHandler).onSuccess(mockEvent, {
      user: provider.oauthUser("not-on-any-allowlist@example.com"),
    });

    expect(insertedValues[0]?.isAdmin).toBe(true);
    expect(insertedValues[0]?.adminGrantedVia).toBe("super_admin");
  });

  it("returning super-admin previously granted via bootstrap is normalized to 'super_admin' and NOT demoted, even off the allowlist", async () => {
    vi.stubEnv("INITIAL_ADMIN_EMAILS", "someone-else@example.com");
    vi.stubEnv("SUPER_ADMIN_IDS", provider.userId);
    stubOAuthGlobals();

    const existingUser = {
      id: provider.userId,
      username: "tester",
      status: "active",
      createdAt: new Date(),
      isAdmin: true,
      adminGrantedVia: "bootstrap",
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

    const { default: handler } = await import(provider.modulePath);
    const mockEvent = {} as unknown as H3Event;
    await (handler as OnSuccessHandler).onSuccess(mockEvent, {
      user: provider.oauthUser("removed-from-allowlist@example.com"),
    });

    expect(setCalls).toContainEqual({
      isAdmin: true,
      adminGrantedVia: "super_admin",
    });
    expect(setCalls).not.toContainEqual(
      expect.objectContaining({ isAdmin: false }),
    );
  });
});
