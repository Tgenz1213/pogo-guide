import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import type { EventHandler, H3Event } from "h3";

// 1. Explicitly structure standard Sanity payloads for test asset definitions
interface SanityMutation {
  create?: {
    _id: string;
    _type: string;
    category?: { _ref: string };
    tags?: { _ref: string }[];
  };
  createIfNotExists?: {
    _id: string;
    _type: string;
    title?: string;
    name?: string;
    slug?: { current: string };
    isUserSubmitted?: boolean;
    description?: string;
  };
}

interface SanityPayload {
  mutations: SanityMutation[];
}

// Strictly type the global fetch mock utility
const mockFetch = vi.fn().mockResolvedValue({ success: true });
vi.stubGlobal("$fetch", mockFetch);

// 2. Safely type dynamic wrappers inside the hoisted isolation ecosystem
const {
  mockReadBody,
  mockUseRuntimeConfig,
  mockDefineEventHandler,
  mockCreateError,
} = vi.hoisted(() => {
  return {
    mockReadBody: vi.fn(),
    mockUseRuntimeConfig: vi.fn().mockReturnValue({
      sanityWriteToken: "test-token",
      public: {
        sanity: {
          projectId: "test-project",
          dataset: "test-dataset",
        },
      },
    }),
    mockDefineEventHandler: <T extends EventHandler>(handler: T): T => handler,
    mockCreateError: (err: {
      statusCode: number;
      statusMessage: string;
      data?: unknown;
    }) => err,
  };
});

// Polyfill runtime environments safely using explicit structural configuration boundaries
Object.assign(globalThis, {
  defineEventHandler: mockDefineEventHandler,
  readBody: mockReadBody,
  createError: mockCreateError,
  useRuntimeConfig: mockUseRuntimeConfig,
});

// Mock imports using strict functional signatures
vi.mock("#imports", () => ({
  defineEventHandler: mockDefineEventHandler,
  readBody: mockReadBody,
  createError: mockCreateError,
  useRuntimeConfig: mockUseRuntimeConfig,
}));

vi.mock("../../../server/utils/portableText", () => ({
  htmlToPortableTextBlocks: vi.fn().mockReturnValue([{ _type: "block" }]),
}));

vi.mock("sanitize-html", () => {
  return {
    default: (html: string): string => html,
  };
});

// Define structure for explicit Zod formatting payloads caught inside tests
interface ZodValidationErrorData {
  statusCode: number;
  data: Record<
    string,
    { _errors: string[] } | Record<number, { _errors: string[] }>
  >;
}

describe("Submit Guide API Handler", () => {
  let submitGuideHandler: EventHandler;

  const getMutationPayload = (): SanityPayload => {
    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    const fetchOptions = call?.[1] as { body: SanityPayload } | undefined;
    expect(fetchOptions?.body).toBeDefined();
    return fetchOptions!.body;
  };

  beforeAll(async () => {
    // Dynamically import the handler after mocks are fully set up
    const module = await import("../../../server/api/submit-guide.post");
    submitGuideHandler = module.default as EventHandler;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    const g = globalThis as Record<string, unknown>;
    delete g.defineEventHandler;
    delete g.readBody;
    delete g.createError;
    delete g.useRuntimeConfig;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Strictly type mock events mapping directly into standard H3 types
  const createEvent = (body: Record<string, unknown>): H3Event => {
    mockReadBody.mockResolvedValue(body);
    return {} as H3Event;
  };

  it("rejects suggestedTags exceeding max count", async () => {
    const invalidBody = {
      title: "Valid Title",
      htmlContent: "Valid Content with more than 10 characters",
      suggestedTags: ["1", "2", "3", "4", "5", "6"],
    };

    try {
      await submitGuideHandler(createEvent(invalidBody));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as ZodValidationErrorData;
      expect(error.statusCode).toBe(400);
      const field = error.data.suggestedTags as { _errors: string[] };
      expect(field._errors[0]).toContain("Maximum of 5");
    }
  });

  it("rejects suggestedTags with invalid characters", async () => {
    const invalidCharactersBody = {
      title: "Valid Title",
      htmlContent: "Valid Content with more than 10 characters",
      suggestedTags: ["Invalid@Tag!"],
    };

    try {
      await submitGuideHandler(createEvent(invalidCharactersBody));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as ZodValidationErrorData;
      expect(error.statusCode).toBe(400);
      const tagArray = error.data.suggestedTags as Record<
        number,
        { _errors: string[] }
      >;
      const firstTagIssue = tagArray[0];
      expect(firstTagIssue).toBeDefined();
      expect(firstTagIssue!._errors[0]).toContain("only contain letters");
    }
  });

  it("rejects when neither categoryId nor suggestedCategory is provided", async () => {
    const missingCategoryBody = {
      title: "Valid Title",
      htmlContent: "Valid Content with more than 10 characters",
    };

    try {
      await submitGuideHandler(createEvent(missingCategoryBody));
      expect.unreachable("Should have thrown");
    } catch (err) {
      const error = err as ZodValidationErrorData;
      expect(error.statusCode).toBe(400);
      const field = error.data.categoryId as { _errors: string[] };
      expect(field._errors[0]).toContain(
        "Either an existing category or a suggested category must be provided.",
      );
    }
  });

  it("falls through to suggestedCategory when categoryId is whitespace-only", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "   ",
      suggestedCategory: "Valid Category",
    };

    await submitGuideHandler(createEvent(body));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const payload = getMutationPayload();

    // categoryId was whitespace-only, so a suggested category mutation should be generated
    const categoryMutation = payload.mutations.find(
      (m) => m.createIfNotExists && m.createIfNotExists._type === "category",
    );
    expect(categoryMutation).toBeDefined();
    expect(categoryMutation?.createIfNotExists?._id).toBe(
      "category-suggested-valid-category",
    );

    // The guide should reference the suggested category, NOT " "
    const guideMutation = payload.mutations.find((m) => m.create);
    expect(guideMutation?.create?.category?._ref).toBe(
      "category-suggested-valid-category",
    );
  });

  it("(1) handles existing categoryId vs suggestedCategory correctly", async () => {
    const bodyWithExisting = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "existing-cat-id",
      suggestedCategory: "Ignored Suggestion",
    };

    await submitGuideHandler(createEvent(bodyWithExisting));

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const payload = getMutationPayload();

    const categoryMutation = payload.mutations.find(
      (m) => m.createIfNotExists && m.createIfNotExists._type === "category",
    );
    expect(categoryMutation).toBeUndefined();

    const guideMutation = payload.mutations.find((m) => m.create);
    expect(guideMutation?.create?.category?._ref).toBe("existing-cat-id");
  });

  it("handles missing categoryId by creating a new suggested category", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      suggestedCategory: "New Category!",
    };

    await submitGuideHandler(createEvent(body));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const payload = getMutationPayload();

    const categoryMutation = payload.mutations.find(
      (m) => m.createIfNotExists && m.createIfNotExists._type === "category",
    );
    expect(categoryMutation).toBeDefined();

    const catDoc = categoryMutation?.createIfNotExists;
    expect(catDoc?._id).toBe("category-suggested-new-category");
    expect(catDoc?.title).toBe("New Category!");
    expect(catDoc?.slug?.current).toBe("new-category");
    expect(catDoc?.isUserSubmitted).toBe(true);
    expect(catDoc?.description).toBe(
      "Category suggested by user during guide submission.",
    );

    const guideMutation = payload.mutations.find((m) => m.create);
    expect(guideMutation?.create?.category?._ref).toBe(
      "category-suggested-new-category",
    );
  });

  it("(2) normalizes and dedupes suggestedTags", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "existing-cat-id",
      suggestedTags: ["apple", "apple"],
    };

    await submitGuideHandler(createEvent(body));

    const payload = getMutationPayload();

    const tagMutations = payload.mutations.filter(
      (m) => m.createIfNotExists && m.createIfNotExists._type === "tag",
    );

    expect(tagMutations).toHaveLength(1);
    const firstTagMutation = tagMutations[0];
    expect(firstTagMutation).toBeDefined();
    expect(firstTagMutation!.createIfNotExists?.name).toBe("apple");
    expect(firstTagMutation!.createIfNotExists?._id).toBe(
      "tag-suggested-apple",
    );
  });

  it("(3) handles slug collisions creating the same tagId by deduping the derived IDs", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "existing-cat-id",
      suggestedTags: ["Foo", "foo"],
    };

    await submitGuideHandler(createEvent(body));

    const payload = getMutationPayload();

    const tagMutations = payload.mutations.filter(
      (m) => m.createIfNotExists && m.createIfNotExists._type === "tag",
    );

    expect(tagMutations).toHaveLength(1);
    const firstTagMutation = tagMutations[0];
    expect(firstTagMutation).toBeDefined();
    expect(firstTagMutation!.createIfNotExists?._id).toBe("tag-suggested-foo");

    const guideMutation = payload.mutations.find((m) => m.create);
    expect(guideMutation?.create?.tags).toHaveLength(1);
    expect(guideMutation?.create?.tags?.[0]?._ref).toBe("tag-suggested-foo");
  });

  it("(4) dedupes tagIds before creating guide tag references", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "existing-cat-id",
      tagIds: ["existing-tag", "existing-tag", "existing-tag-2"],
    };

    await submitGuideHandler(createEvent(body));

    const payload = getMutationPayload();
    const guideMutation = payload.mutations.find((m) => m.create);
    const tagRefs = guideMutation?.create?.tags?.map((t) => t._ref);

    expect(tagRefs).toEqual(["existing-tag", "existing-tag-2"]);
  });

  it("(5) skips suggestedTags that collide with existing tagIds", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "existing-cat-id",
      tagIds: ["tag-suggested-foo", "existing-tag"],
      suggestedTags: ["Foo", "Bar"],
    };

    await submitGuideHandler(createEvent(body));

    const payload = getMutationPayload();
    const tagMutations = payload.mutations.filter(
      (m) => m.createIfNotExists && m.createIfNotExists._type === "tag",
    );

    const createdTagIds = tagMutations
      .map((m) => m.createIfNotExists?._id)
      .filter((id): id is string => Boolean(id));

    expect(createdTagIds).toEqual(["tag-suggested-bar"]);

    const guideMutation = payload.mutations.find((m) => m.create);
    const tagRefs = guideMutation?.create?.tags?.map((t) => t._ref);
    expect(tagRefs).toEqual([
      "tag-suggested-foo",
      "existing-tag",
      "tag-suggested-bar",
    ]);
  });

  it("(6) keeps final guide tags duplicate-free when tagIds and suggestedTags overlap", async () => {
    const body = {
      title: "Valid Title",
      htmlContent: "Valid HTML content to pass validation",
      categoryId: "existing-cat-id",
      tagIds: ["tag-suggested-foo", " tag-suggested-foo "],
      suggestedTags: ["foo", "Foo", "bar"],
    };

    await submitGuideHandler(createEvent(body));

    const payload = getMutationPayload();
    const guideMutation = payload.mutations.find((m) => m.create);
    const tagRefs = guideMutation?.create?.tags?.map((t) => t._ref) ?? [];

    expect(tagRefs).toEqual(["tag-suggested-foo", "tag-suggested-bar"]);
    expect(new Set(tagRefs).size).toBe(tagRefs.length);
  });
});
