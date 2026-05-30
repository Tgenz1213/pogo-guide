import { describe, it, expect } from "vitest";
import { submitGuideSchema, suggestionSchema } from "@pogo/shared-utils";

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
        const hasMessage = result.error.issues.some((issue) =>
          issue.message.includes("at least 10 characters"),
        );
        expect(hasMessage).toBe(true);
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
        const titleIssue = result.error.issues.find(
          (issue) => issue.path[0] === "title",
        );
        expect(titleIssue).toBeDefined();
        expect(titleIssue?.message).toContain("at least 3 characters");
      }
    });

    it("rejects missing category info", () => {
      // The schema now uses a refine rule to reject missing categoryId/suggestedCategory
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const categoryIssue = result.error.issues.find(
          (issue) => issue.path[0] === "categoryId",
        );
        expect(categoryIssue).toBeDefined();
        expect(categoryIssue?.message).toContain(
          "Either an existing category or a suggested category must be provided.",
        );
      }
    });

    it("rejects punctuation-only suggestedCategory", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
        suggestedCategory: "!!!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const categoryIssue = result.error.issues.find(
          (issue) => issue.path[0] === "suggestedCategory",
        );
        expect(categoryIssue).toBeDefined();
        expect(categoryIssue?.message).toContain(
          "Suggested category must contain at least one letter or number",
        );
      }
    });

    it("treats whitespace-only categoryId as missing when suggestedCategory is valid", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "   ",
        suggestedCategory: "Valid Category",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categoryId).toBeUndefined();
        expect(result.data.suggestedCategory).toBe("Valid Category");
      }
    });

    it("treats whitespace-only suggestedCategory as missing when categoryId is valid", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "existing-category-id",
        suggestedCategory: "   ",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categoryId).toBe("existing-category-id");
        expect(result.data.suggestedCategory).toBeUndefined();
      }
    });

    it("rejects when both category fields are whitespace-only", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "   ",
        suggestedCategory: "   ",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const categoryIssue = result.error.issues.find(
          (issue) => issue.path[0] === "categoryId",
        );
        expect(categoryIssue).toBeDefined();
        expect(categoryIssue?.message).toContain(
          "Either an existing category or a suggested category must be provided.",
        );
      }
    });

    it("rejects more than 10 existing tags", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "some-id",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
        tagIds: Array(11).fill("tag-id"),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const tagIssue = result.error.issues.find(
          (issue) => issue.path[0] === "tagIds",
        );
        expect(tagIssue).toBeDefined();
        expect(tagIssue?.message).toContain(
          "Maximum of 10 existing tags allowed",
        );
      }
    });

    it("rejects more than 5 suggestedTags", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "some-id",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
        suggestedTags: ["1", "2", "3", "4", "5", "6"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const tagIssue = result.error.issues.find(
          (issue) => issue.path[0] === "suggestedTags",
        );
        expect(tagIssue).toBeDefined();
        expect(tagIssue?.message).toContain("Maximum of 5 new tags allowed");
      }
    });

    it("rejects suggestedTags with invalid characters", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "some-id",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
        suggestedTags: ["Invalid@Tag!"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const tagIssue = result.error.issues.find(
          (issue) => issue.path[0] === "suggestedTags" && issue.path[1] === 0,
        );
        expect(tagIssue).toBeDefined();
        expect(tagIssue?.message).toContain(
          "Tags can only contain letters, numbers, spaces, and hyphens",
        );
      }
    });

    it("rejects whitespace-only suggestedTags entries", () => {
      const result = submitGuideSchema.safeParse({
        title: "Valid Title",
        categoryId: "some-id",
        htmlContent: "<p>Valid content here with more than 10 chars</p>",
        suggestedTags: ["   "],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const tagIssue = result.error.issues.find(
          (issue) => issue.path[0] === "suggestedTags" && issue.path[1] === 0,
        );
        expect(tagIssue).toBeDefined();
        expect(tagIssue?.message).toContain("Tag name cannot be empty");
      }
    });
  });
});
