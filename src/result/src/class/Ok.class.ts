// Import Internal Dependencies
import { ErrImpl } from "./Err.class.js";
import { Result } from "../index.js";

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

  map<T2>(mapper: (val: T) => T2): OkImpl<T2> {
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
}

export function Ok<T>(value: T) {
  return new OkImpl<T>(value);
}
