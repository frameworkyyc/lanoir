/**
 * The one place that touches the Cloudflare Worker environment (vars + secrets).
 * Server-side only — importing this into client code would (correctly) fail to build.
 * Kept separate so the pure Square modules stay testable in plain Node.
 */
import { env } from 'cloudflare:workers';
import type { RawSquareEnv } from './commerce/square/config.ts';

export interface RuntimeEnv extends RawSquareEnv {
  /** "square" (default) or "mock" (local design work only; refused in production). */
  COMMERCE_PROVIDER?: string;
}

export const runtimeEnv = (): RuntimeEnv => env as unknown as RuntimeEnv;
