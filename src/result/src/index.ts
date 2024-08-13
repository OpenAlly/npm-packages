// Import Internal Dependencies
import { Ok, OkImpl } from "./class/Ok.class.js";
import { Err, ErrImpl } from "./class/Err.class.js";

export { type Option, Some } from "./class/Some.class.js";
export { None } from "./class/None.class.js";
export { Ok, Err };

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
    catch (e: any) {
      return new ErrImpl<E>(e);
    }
  }

  export function isResult<T = any, E = any>(
    val: unknown
  ): val is Result<T, E> {
    return val instanceof ErrImpl || val instanceof OkImpl;
  }
}
