// Import Internal Dependencies
import { OkImpl } from "./class/Ok.class.js";
import { ErrImpl } from "./class/Err.class.js";

export function Ok<T>(value: T) {
  return new OkImpl<T>(value);
}

export function Err<E>(value: E) {
  return new ErrImpl<E>(value);
}

export type Result<T, E> = OkImpl<T> | ErrImpl<E>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Result {
  /**
   * Wrap an operation that may throw an Error (`try-catch` style) into checked exception style
   * @param op The operation function
   */
  export function wrap<T, E = unknown>(op: () => T): Result<T, E> {
    try {
      return new OkImpl(op());
    }
    catch (e) {
      return new ErrImpl<E>(e as E);
    }
  }

  /**
   * Wrap an async operation that may throw an Error (`try-catch` style) into checked exception style
   * @param op The operation function
   */
  export async function wrapAsync<T, E = unknown>(
    op: () => Promise<T>
  ): Promise<Result<T, E>> {
    try {
      const val = await op();

      return new OkImpl(val);
    }
    catch (e) {
      return new ErrImpl(e);
    }
  }

  export function isResult<T = any, E = any>(
    val: unknown
  ): val is Result<T, E> {
    return val instanceof ErrImpl || val instanceof OkImpl;
  }
}
