import {
  ConfigurationError,
  DownstreamContractError,
  DuplicateMessageError,
  TransientMessageError,
  PermanentMessageError,
} from "./errors";

export interface Env {
  SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
  SANITY_WRITE_TOKEN?: string;
  SANITY_API_WRITE_TOKEN?: string;
  NUXT_SANITY_PROJECT_ID?: string;
  NUXT_SANITY_DATASET?: string;
  NUXT_SANITY_WRITE_TOKEN?: string;
  NUXT_SANITY_API_WRITE_TOKEN?: string;
  /** Set via wrangler.jsonc `vars` per-environment: "development" | "preview" | "production". */
  ENVIRONMENT?: string;
  /**
   * Secret bearer token required to call the `/__debug/process` HTTP debug
   * route. Provisioned with `wrangler secret put DEBUG_PROCESS_TOKEN`, never
   * committed. See docs/adr/0010-inter-service-endpoint-authentication.md.
   */
  DEBUG_PROCESS_TOKEN?: string;
}

interface ResolvedSanityEnv {
  projectId: string;
  dataset: string;
  writeToken: string;
}

function resolveSanityEnv(env: Env): ResolvedSanityEnv {
  const projectId = env.SANITY_PROJECT_ID || env.NUXT_SANITY_PROJECT_ID;
  const dataset = env.SANITY_DATASET || env.NUXT_SANITY_DATASET || "production";
  const writeToken =
    env.SANITY_WRITE_TOKEN ||
    env.NUXT_SANITY_WRITE_TOKEN ||
    env.SANITY_API_WRITE_TOKEN ||
    env.NUXT_SANITY_API_WRITE_TOKEN;

  if (!projectId) throw new ConfigurationError("Missing SANITY_PROJECT_ID");
  if (!dataset) throw new ConfigurationError("Missing SANITY_DATASET");
  if (!writeToken) {
    throw new ConfigurationError(
      "Missing SANITY write token. Set one of: SANITY_WRITE_TOKEN, NUXT_SANITY_WRITE_TOKEN, SANITY_API_WRITE_TOKEN, NUXT_SANITY_API_WRITE_TOKEN",
    );
  }

  return { projectId, dataset, writeToken };
}

export function validateEnv(env: Env): void {
  resolveSanityEnv(env);
}

export async function mutateSanity(
  env: Env,
  mutations: Record<string, unknown>[],
): Promise<void> {
  const resolved = resolveSanityEnv(env);
  const url = `https://${resolved.projectId}.api.sanity.io/v2023-08-01/data/mutate/${resolved.dataset}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolved.writeToken}`,
    },
    body: JSON.stringify({ mutations }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();

    if (status === 409) {
      // 409 means a document with this ID already exists (idempotency hit).
      throw new DuplicateMessageError("Document already exists (409)");
    }

    if (status === 429 || (status >= 500 && status < 600)) {
      throw new TransientMessageError(
        `Sanity API transient error (${status}): ${text}`,
      );
    }

    if (status === 401 || status === 403) {
      // Auth/Config failure must be raised as a config error so it halts or alerts
      throw new ConfigurationError(
        `Sanity Auth/Config Error (${status}): ${text}`,
      );
    }

    if (status >= 400 && status < 500) {
      // Bad request indicating our payload was malformed according to Sanity
      throw new DownstreamContractError(
        `Sanity API contract error (${status}): ${text}`,
      );
    }

    throw new PermanentMessageError(
      `Unknown Sanity API error (${status}): ${text}`,
    );
  }
}
