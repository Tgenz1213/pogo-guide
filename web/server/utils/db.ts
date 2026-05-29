import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { H3Event } from "h3";
import type { D1Database } from "@cloudflare/workers-types";

export function useDB(event: H3Event) {
  const dbBinding = event.context.cloudflare?.env?.DB as D1Database | undefined;
  if (!dbBinding) {
    throw new Error("D1 database binding not found");
  }
  return drizzle(dbBinding, { schema });
}
