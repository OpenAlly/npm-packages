// Import Internal Dependencies
import type { CollectedError } from "./types.ts";

export function isThenable(
  value: unknown
): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  ) && "then" in value && typeof value.then === "function";
}

export function serializeError(
  cause: unknown
): CollectedError {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      stack: cause.stack
    };
  }

  try {
    return { name: "Error", message: String(cause) };
  }
  catch {
    /*
     * Ignore values that throw during string coercion.
     */
    return { name: "Error" };
  }
}
