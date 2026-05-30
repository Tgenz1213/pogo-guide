import { z } from "zod";
import { submitGuideSchema, suggestionSchema } from "./validation";

export const queueMessageSchema = z.discriminatedUnion("type", [
  z.object({
    version: z.literal(1),
    type: z.literal("guide"),
    messageId: z.string().uuid(),
    idempotencyKey: z.string(),
    submittedAt: z.string().datetime(),
    requestId: z.string(),
    data: submitGuideSchema,
  }),
  z.object({
    version: z.literal(1),
    type: z.literal("suggestion"),
    messageId: z.string().uuid(),
    idempotencyKey: z.string(),
    submittedAt: z.string().datetime(),
    requestId: z.string(),
    data: suggestionSchema,
  }),
]);

export type QueueMessagePayload = z.infer<typeof queueMessageSchema>;
