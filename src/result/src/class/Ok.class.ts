// Import Internal Dependencies
import { ErrImpl } from "./Err.class.ts";
import type { Result } from "../types.ts";

export class OkImpl<T> {
  readonly ok: true;
  readonly err: false;
  readonly val: T;

  constructor(val: T) {
    this.ok = true;
    this.err = false;
    this.val = val;
  }

  unwrap(): T {
    return this.val;
  }

  unwrapOr(_val: unknown): T {
    return this.val;
  }

  unwrapOrElse(_mapper: unknown): T {
    return this.val;
  }

  safeUnwrap(): T {
    return this.val;
  }

  map<T2>(
    mapper: (val: T) => T2
  ): OkImpl<T2> {
    return new OkImpl(mapper(this.val));
  }

  mapOr<U>(
    _default_: U,
    mapper: (val: T) => U
  ): U {
    return mapper(this.val);
  }

  mapOrElse<U>(
    _default_: (error: unknown) => U,
    mapper: (val: T) => U
  ): U {
    return mapper(this.val);
  }

  mapErr(_mapper: unknown): OkImpl<T> {
    return this;
  }

  andThen<T2>(mapper: (val: T) => OkImpl<T2>): OkImpl<T2>;
  andThen<E2>(mapper: (val: T) => ErrImpl<E2>): Result<T, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2> {
    return mapper(this.val);
  }

  orElse(_mapper: unknown): OkImpl<T> {
    return this;
  }

  isOk(): true {
    return true;
  }

  isErr(): false {
    return false;
  }

  match<A, B>(
    okMapper: (val: T) => A,
    _errMapper: (err: unknown) => B
  ): A | B {
    return okMapper(this.val);
  }

  andTee(
    mapper: (val: T) => unknown
  ): OkImpl<T> {
    mapper(this.val);

    return this;
  }

  orTee(_mapper: unknown): OkImpl<T> {
    return this;
  }

  andThrough<E2>(
    mapper: (val: T) => Result<unknown, E2>
  ): Result<T, E2> {
    const result = mapper(this.val);

    return result.err ? result : this;
  }
}

export function Ok<T>(value: T) {
  return new OkImpl<T>(value);
}
