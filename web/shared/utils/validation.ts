import { z } from "zod";

const optionalTrimmedString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val !== "string") return val;
    const trimmed = val.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, schema.optional());

export const suggestionSchema = z.object({
  guidePath: z.string().min(1, "Guide path is required"),
  content: z
    .string()
    .min(10, "Suggestion must be at least 10 characters")
    .max(2000, "Suggestion must not exceed 2000 characters"),
  websiteAddress: z.string().optional(),
  turnstileToken: z.string().optional().default(""),
});

export type SuggestionPayload = z.infer<typeof suggestionSchema>;

export const submitGuideSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().max(200).optional(),
    categoryId: optionalTrimmedString(
      z.string().min(1, "Category ID is required"),
    ),
    suggestedCategory: optionalTrimmedString(
      z
        .string()
        .min(1, "Suggested category must not be empty")
        .max(50)
        .refine(
          (val) => /[a-zA-Z0-9]/.test(val),
          "Suggested category must contain at least one letter or number",
        ),
    ),
    tagIds: z
      .array(z.string().trim().min(1, "Tag ID cannot be empty"))
      .max(10, "Maximum of 10 existing tags allowed")
      .optional(),
    suggestedTags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Tag name cannot be empty")
          .max(30, "Tag name is too long")
          .regex(
            /^[a-zA-Z0-9\s-]+$/,
            "Tags can only contain letters, numbers, spaces, and hyphens",
          ),
      )
      .max(5, "Maximum of 5 new tags allowed")
      .optional(),
    htmlContent: z
      .string()
      .min(10, "Content must be at least 10 characters")
      .max(50000),
    websiteAddress: z.string().optional(), // Honeypot
  })
  .refine(
    (data) => {
      return (
        data.categoryId !== undefined || data.suggestedCategory !== undefined
      );
    },
    {
      message:
        "Either an existing category or a suggested category must be provided.",
      path: ["categoryId"], // Attach the error to the categoryId field for form handling
    },
  );

export type SubmitGuidePayload = z.infer<typeof submitGuideSchema>;
