import {
  ConfigurationError,
  DownstreamContractError,
  DuplicateMessageError,
  TransientMessageError,
  PermanentMessageError,
} from "./errors";

export interface Env {
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_WRITE_TOKEN: string;
}

export function validateEnv(env: Env): void {
  if (!env.SANITY_PROJECT_ID)
    throw new ConfigurationError("Missing SANITY_PROJECT_ID");
  if (!env.SANITY_DATASET)
    throw new ConfigurationError("Missing SANITY_DATASET");
  if (!env.SANITY_WRITE_TOKEN)
    throw new ConfigurationError("Missing SANITY_WRITE_TOKEN");
}

export async function mutateSanity(
  env: Env,
  mutations: Record<string, unknown>[],
): Promise<void> {
  const url = `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v2023-08-01/data/mutate/${env.SANITY_DATASET}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
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
