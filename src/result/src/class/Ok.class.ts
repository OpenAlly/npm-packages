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

  unwrapOr(_val: unknown): T {
    return this.val;
  }

  unwrap(): T {
    return this.val;
  }

  map<T2>(mapper: (val: T) => T2): OkImpl<T2> {
    return new OkImpl(mapper(this.val));
  }

  andThen<T2>(mapper: (val: T) => OkImpl<T2>): OkImpl<T2>;
  andThen<E2>(mapper: (val: T) => ErrImpl<E2>): Result<T, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2> {
    return mapper(this.val);
  }

  mapErr(_mapper: unknown): OkImpl<T> {
    return this;
  }
}
