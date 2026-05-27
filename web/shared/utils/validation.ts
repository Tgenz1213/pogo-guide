import { z } from "zod";

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

export const submitGuideSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(200).optional(),
  categoryId: z.string().optional(),
  suggestedCategory: z.string().max(50).optional(),
  tagIds: z.array(z.string()).optional(),
  suggestedTags: z.array(z.string().max(30)).optional(),
  htmlContent: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(50000),
  websiteAddress: z.string().optional(), // Honeypot
});

export type SubmitGuidePayload = z.infer<typeof submitGuideSchema>;
