// Import Internal Dependencies
import { Err, ErrImpl } from "./Err.class.ts";

export class NoneImpl {
  readonly some = false;
  readonly none = true;

  unwrap(): never {
    throw new Error("Tried to unwrap None");
  }

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  unwrapOrElse<T2>(f: () => T2): T2 {
    return f();
  }

  map(_mapper: unknown): None {
    return this;
  }

  mapOr<T2>(
    default_: T2,
    _mapper: unknown): T2 {
    return default_;
  }

  mapOrElse<U>(
    default_: () => U,
    _mapper: unknown
  ): U {
    return default_();
  }

  andThen(_op: unknown): None {
    return this;
  }

  toResult<E>(error: E): ErrImpl<E> {
    return Err(error);
  }

  toString(): string {
    return "None";
  }
}

export const None = new NoneImpl();
export type None = NoneImpl;
Object.freeze(None);
