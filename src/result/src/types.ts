// Import Internal Dependencies
import type { OkImpl } from "./class/Ok.class.ts";
import type { ErrImpl } from "./class/Err.class.ts";

export type Result<T, E> = OkImpl<T> | ErrImpl<E>;

export type InferOkTypes<R> = R extends Result<infer T, any> ? T : never;
export type InferErrTypes<R> = R extends Result<any, infer E> ? E : never;

/**
 * Result of Result.combine(): preserves each input Result's Ok type at its tuple position,
 * unions all the possible Err types.
 */
export type CombineResults<T extends readonly Result<any, any>[]> = Result<
  { [K in keyof T]: InferOkTypes<T[K]> },
  InferErrTypes<T[number]>
>;

/**
 * Result of Result.combineWithAllErrors(): same as CombineResults, but the Err side
 * is an array collecting every encountered error instead of a single union.
 */
export type CombineResultsWithAllErrors<T extends readonly Result<any, any>[]> = Result<
  { [K in keyof T]: InferOkTypes<T[K]> },
  InferErrTypes<T[number]>[]
>;
