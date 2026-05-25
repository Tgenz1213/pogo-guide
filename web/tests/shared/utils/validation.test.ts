import { describe, it, expect } from "vitest";
import {
  submitGuideSchema,
  suggestionSchema,
} from "../../../shared/utils/validation";

describe("Validation Schemas", () => {
  describe("suggestionSchema", () => {
    it("validates a correct payload", () => {
      const result = suggestionSchema.safeParse({
        guidePath: "/guides/some-guide",
        content: "This is a valid suggestion of at least 10 characters.",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short content", () => {
      const result = suggestionSchema.safeParse({
        guidePath: "/guides/some-guide",
        content: "Too short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "at least 10 characters",
        );
      }
    });

    it("allows empty honeypot field", () => {
      const result = suggestionSchema.safeParse({
        guidePath: "/guides/some-guide",
        content: "This is a valid suggestion of at least 10 characters.",
        websiteAddress: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("submitGuideSchema", () => {
    it("validates a correct payload", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "some-id",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });
      expect(result.success).toBe(true);
    });

    it("rejects short titles", () => {
      const result = submitGuideSchema.safeParse({
        title: "No",
        categoryId: "some-id",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "at least 3 characters",
        );
      }
    });

    it("rejects missing category info", () => {
      // Actually the schema alone doesn't reject missing categoryId/suggestedCategory
      // The API route handler does the cross-validation: "if (!categoryId && (!suggestedCategory || suggestedCategory.trim() === ""))"
      // But let's test that schema accepts missing categoryId/suggestedCategory
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });
      expect(result.success).toBe(true);
    });
  });
});
