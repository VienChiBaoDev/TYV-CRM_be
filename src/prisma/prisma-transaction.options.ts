/** Default 5s is too tight for Supabase over the network — interactive txs need headroom. */
export const PRISMA_TRANSACTION_OPTIONS = {
  maxWait: 5_000,
  timeout: 15_000,
} as const;
