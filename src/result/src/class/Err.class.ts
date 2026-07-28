// Import Internal Dependencies
import { toString } from "../utils.ts";
import type { Result } from "../types.ts";

export class ErrImpl<E> {
  readonly ok: false;
  readonly err: true;
  readonly val: E;

  private readonly _stack: string;

  constructor(val: E) {
    this.ok = false;
    this.err = true;
    this.val = val;

    const stackLines = new Error().stack!.split("\n").slice(2);
    if (stackLines && stackLines.length > 0 && stackLines[0].includes("Err")) {
      stackLines.shift();
    }

    this._stack = stackLines.join("\n");
  }

  unwrap(): never {
    if (this.val instanceof Error) {
      throw this.val;
    }

    throw new Error(`Tried to unwrap Error: ${toString(this.val)}\n${this._stack}`);
  }

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  unwrapOrElse<T2>(
    mapper: (val: E) => T2
  ): T2 {
    return mapper(this.val);
  }

  map(_mapper: unknown): ErrImpl<E> {
    return this;
  }

  mapOr<U>(
    default_: U,
    _mapper: unknown
  ): U {
    return default_;
  }

  mapOrElse<U>(
    default_: (error: E) => U,
    _mapper: unknown
  ): U {
    return default_(this.val);
  }

  mapErr<E2>(
    mapper: (err: E) => E2
  ): ErrImpl<E2> {
    return new ErrImpl(mapper(this.val));
  }

  andThen(_op: unknown): ErrImpl<E> {
    return this;
  }

  orElse<T2, E2>(
    mapper: (err: E) => Result<T2, E2>
  ): Result<T2, E2> {
    return mapper(this.val);
  }

  isOk(): false {
    return false;
  }

  isErr(): true {
    return true;
  }

  match<A, B>(
    _okMapper: (val: unknown) => A,
    errMapper: (err: E) => B
  ): A | B {
    return errMapper(this.val);
  }

  andTee(_mapper: unknown): ErrImpl<E> {
    return this;
  }

  orTee(
    mapper: (err: E) => unknown
  ): ErrImpl<E> {
    mapper(this.val);

    return this;
  }

  andThrough(_mapper: unknown): ErrImpl<E> {
    return this;
  }

  get stack(): string {
    return `${this}\n${this._stack}`;
  }
}

export function Err<E>(value: E) {
  return new ErrImpl<E>(value);
}
