const CONNECT_RETRIES = 3;
const CONNECT_RETRY_DELAY_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ponytail: Supabase pooler (:6543) can be flaky on first handshake — retry before crashing boot */
export async function connectPrismaWithRetry(connect: () => Promise<void>): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
    try {
      await connect();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < CONNECT_RETRIES) {
        await sleep(CONNECT_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}
