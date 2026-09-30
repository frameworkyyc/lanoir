/// <reference path="../.astro/types.d.ts" />

// Worker environment (vars + secrets). Provided at runtime by Cloudflare; see src/lib/runtime-env.ts.
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
