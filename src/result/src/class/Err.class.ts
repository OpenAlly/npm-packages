// Import Internal Dependencies
import { toString } from "../utils.js";

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

  unwrapOrElse<T2>(mapper: (_val: E) => T2): T2 {
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

  mapErr<E2>(mapper: (err: E) => E2): ErrImpl<E2> {
    return new ErrImpl(mapper(this.val));
  }

  andThen(op: unknown): ErrImpl<E> {
    return this;
  }

  get stack(): string {
    return `${this}\n${this._stack}`;
  }
}

export function Err<E>(value: E) {
  return new ErrImpl<E>(value);
}
