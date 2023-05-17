// Import Internal Dependencies
import { Err, ErrImpl } from "./Err.class.js";

export class NoneImpl {
  readonly some = false;
  readonly none = true;

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  unwrap(): never {
    throw new Error("Tried to unwrap None");
  }

  map(_mapper: unknown): None {
    return this;
  }

  andThen(op: unknown): None {
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
