import type { CommerceProvider } from './types';
import { mockProvider } from './mock';

export * from './types';

/**
 * Single place where the active provider is chosen.
 * Phase 1: mock only. Add `square` here when the adapter exists.
 */
const providers: Record<string, CommerceProvider> = {
  mock: mockProvider,
};

const selected = import.meta.env.PUBLIC_COMMERCE_PROVIDER ?? 'mock';
export const commerce: CommerceProvider = providers[selected] ?? mockProvider;
