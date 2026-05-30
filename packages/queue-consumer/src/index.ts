import type { ExecutionContext, MessageBatch } from "@cloudflare/workers-types";
import type { SubmitGuidePayload, SuggestionPayload } from "@pogo/shared-utils";
import {
  queueMessageSchema,
  sanitizeGuideHtml,
  htmlToPortableTextBlocks,
} from "@pogo/shared-utils";
import type { Env } from "./sanity";
import { validateEnv, mutateSanity } from "./sanity";
import {
  DuplicateMessageError,
  TransientMessageError,
  ConfigurationError,
  DownstreamContractError,
  PermanentMessageError,
} from "./errors";

function generateGuideMutations(
  idempotencyKey: string,
  payload: SubmitGuidePayload,
) {
  const guideId = `guide-${idempotencyKey}`;
  const mutations: Record<string, unknown>[] = [];
  const tagRefs: { _key: string; _ref: string }[] = [];

  let finalCategoryId = payload.categoryId;

  if (!finalCategoryId && payload.suggestedCategory) {
    // Generate a deterministic ID for the suggested category
    const slug = payload.suggestedCategory.toLowerCase().replace(/\s+/g, "-");
    finalCategoryId = `category-suggested-${slug}`;
    mutations.push({
      createIfNotExists: {
        _id: finalCategoryId,
        _type: "category",
        title: payload.suggestedCategory,
        slug: { current: slug },
        isUserSubmitted: true,
        description: "Category suggested by user during guide submission.",
      },
    });
  }

  // Handle existing tags
  if (payload.tagIds) {
    const uniqueTagIds = Array.from(new Set(payload.tagIds));
    for (const tagId of uniqueTagIds) {
      tagRefs.push({
        _key: crypto.randomUUID(),
        _ref: tagId,
      });
    }
  }

  // Handle suggested tags
  if (payload.suggestedTags) {
    const dedupedSuggestions = Array.from(
      new Set(payload.suggestedTags.map((t) => t.toLowerCase())),
    );
    for (const tagStr of dedupedSuggestions) {
      const slug = tagStr.replace(/\s+/g, "-");
      const suggestedTagId = `tag-suggested-${slug}`;

      mutations.push({
        createIfNotExists: {
          _id: suggestedTagId,
          _type: "tag",
          name: tagStr,
          slug: { current: slug },
          isUserSubmitted: true,
        },
      });

      // Avoid adding to tagRefs if already in existing tagIds to prevent duplicates
      if (!payload.tagIds?.includes(suggestedTagId)) {
        tagRefs.push({
          _key: crypto.randomUUID(),
          _ref: suggestedTagId,
        });
      }
    }
  }

  const cleanHtml = sanitizeGuideHtml(payload.htmlContent);
  const blocks = htmlToPortableTextBlocks(cleanHtml);

  mutations.push({
    createIfNotExists: {
      _id: guideId,
      _type: "guide",
      title: payload.title,
      description: payload.description,
      content: blocks,
      category: finalCategoryId
        ? { _type: "reference", _ref: finalCategoryId }
        : undefined,
      tags:
        tagRefs.length > 0
          ? tagRefs.map((ref) => ({
              _type: "reference",
              _key: ref._key,
              _ref: ref._ref,
            }))
          : undefined,
    },
  });

  return mutations;
}

function generateSuggestionMutations(
  idempotencyKey: string,
  payload: SuggestionPayload,
) {
  const suggestionId = `suggestion-${idempotencyKey}`;

  return [
    {
      createIfNotExists: {
        _id: suggestionId,
        _type: "suggestion",
        guidePath: payload.guidePath,
        content: payload.content,
      },
    },
  ];
}

type ParsedEnvelope = ReturnType<typeof queueMessageSchema.parse>;

async function processEnvelope(
  envelope: ParsedEnvelope,
  env: Env,
  traceCtx: Record<string, unknown>,
): Promise<void> {
  let mutations: Record<string, unknown>[];
  if (envelope.type === "guide") {
    mutations = generateGuideMutations(envelope.idempotencyKey, envelope.data);
  } else if (envelope.type === "suggestion") {
    mutations = generateSuggestionMutations(
      envelope.idempotencyKey,
      envelope.data,
    );
  } else {
    throw new PermanentMessageError(`Unknown message type`);
  }

  await mutateSanity(env, mutations);

  console.log(
    JSON.stringify({
      event: "message_processed_successfully",
      ...traceCtx,
    }),
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    if (
      request.method === "POST" &&
      new URL(request.url).pathname === "/__debug/process"
    ) {
      const envPresence = {
        SANITY_PROJECT_ID: Boolean(env.SANITY_PROJECT_ID),
        SANITY_DATASET: Boolean(env.SANITY_DATASET),
        SANITY_WRITE_TOKEN: Boolean(env.SANITY_WRITE_TOKEN),
        SANITY_API_WRITE_TOKEN: Boolean(env.SANITY_API_WRITE_TOKEN),
        NUXT_SANITY_PROJECT_ID: Boolean(env.NUXT_SANITY_PROJECT_ID),
        NUXT_SANITY_DATASET: Boolean(env.NUXT_SANITY_DATASET),
        NUXT_SANITY_WRITE_TOKEN: Boolean(env.NUXT_SANITY_WRITE_TOKEN),
        NUXT_SANITY_API_WRITE_TOKEN: Boolean(env.NUXT_SANITY_API_WRITE_TOKEN),
      };

      try {
        validateEnv(env);
        const body = await request.json();
        const parseResult = queueMessageSchema.safeParse(body);
        if (!parseResult.success) {
          return new Response(
            JSON.stringify({
              error: "Schema validation failed",
              details: parseResult.error.format(),
              envPresence,
            }),
            { status: 400 },
          );
        }

        const envelope = parseResult.data;
        const traceCtx = {
          messageId: "debug-http",
          queue: "debug-http",
          logicalMessageId: envelope.messageId,
          type: envelope.type,
          idempotencyKey: envelope.idempotencyKey,
        };

        await processEnvelope(envelope, env, traceCtx);
        return new Response(JSON.stringify({ success: true, envPresence }), {
          status: 200,
        });
      } catch (err) {
        if (err instanceof DuplicateMessageError) {
          return new Response(
            JSON.stringify({ success: true, duplicate: true, envPresence }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({ error: (err as Error).message, envPresence }),
          { status: 500 },
        );
      }
    }

    return new Response("Queue Consumer is running", { status: 200 });
  },

  async queue(
    batch: MessageBatch<unknown>,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      validateEnv(env);
    } catch (err) {
      // Configuration Error: We throw immediately. This halts processing
      // of the entire batch so it can be retried later with backoff
      // when the configuration is fixed.
      console.error(
        JSON.stringify({
          event: "config_validation_error",
          error: (err as Error).message,
        }),
      );
      throw err;
    }

    for (const message of batch.messages) {
      const traceCtx = { messageId: message.id, queue: batch.queue };
      try {
        const parseResult = queueMessageSchema.safeParse(message.body);
        if (!parseResult.success) {
          throw new PermanentMessageError(
            `Schema validation failed: ${parseResult.error.message}`,
          );
        }

        const envelope = parseResult.data;
        Object.assign(traceCtx, {
          logicalMessageId: envelope.messageId,
          type: envelope.type,
          idempotencyKey: envelope.idempotencyKey,
        });

        await processEnvelope(envelope, env, traceCtx);
        message.ack();
      } catch (err) {
        if (err instanceof DuplicateMessageError) {
          console.log(
            JSON.stringify({
              event: "message_duplicate_ignored",
              ...traceCtx,
              reason: err.message,
            }),
          );
          // Idempotent success
          message.ack();
        } else if (err instanceof ConfigurationError) {
          console.error(
            JSON.stringify({
              event: "message_config_error",
              ...traceCtx,
              error: err.message,
            }),
          );
          throw err;
        } else if (err instanceof TransientMessageError) {
          console.warn(
            JSON.stringify({
              event: "message_transient_error",
              ...traceCtx,
              error: err.message,
            }),
          );
          message.retry();
        } else if (
          err instanceof PermanentMessageError ||
          err instanceof DownstreamContractError
        ) {
          console.error(
            JSON.stringify({
              event: "message_permanent_error",
              ...traceCtx,
              error: err.message,
            }),
          );
          // Permanent Poison-Message Strategy:
          // We explicitly call message.retry() to exhaust the max_retries limit.
          // Cloudflare Queues will natively move this message to the configured DLQ
          // once max_retries is reached.
          message.retry();
        } else {
          // Unhandled unexpected errors
          console.error(
            JSON.stringify({
              event: "message_unexpected_error",
              ...traceCtx,
              error: String(err),
            }),
          );
          message.retry();
        }
      }
    }
  },
};
