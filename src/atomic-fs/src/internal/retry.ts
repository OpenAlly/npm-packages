// Import Internal Dependencies
import { errorCode } from "./fs.ts";
import type { RetryOptions } from "../types.ts";

const kRetryableCodes = new Set(["EPERM", "EBUSY", "EACCES"]);

export const defaultRetry: Required<RetryOptions> = {
  attempts: 5,
  delay: 10,
  factor: 2
};

export type ResolvedRetry = Required<RetryOptions> | null;

export function resolveRetry(
  retry: RetryOptions | false | undefined
): ResolvedRetry {
  if (retry === false) {
    return null;
  }
  if (retry === undefined) {
    return process.platform === "win32" ? defaultRetry : null;
  }

  return { ...defaultRetry, ...retry };
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  retry: ResolvedRetry
): Promise<T> {
  if (retry === null || retry.attempts <= 1) {
    return operation();
  }

  let delay = retry.delay;
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    }
    catch (error) {
      const code = errorCode(error);
      if (
        attempt >= retry.attempts ||
        code === undefined ||
        !kRetryableCodes.has(code)
      ) {
        throw error;
      }
    }

    await sleep(delay);
    delay *= retry.factor;
  }
}

function sleep(
  ms: number
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref();
  });
}
