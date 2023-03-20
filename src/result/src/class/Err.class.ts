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

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  unwrap(): never {
    const errorOptions = this.val instanceof Error ? { cause: this.val } : {};

    throw new Error(
      `Tried to unwrap Error: ${toString(this.val)}\n${this._stack}`,
      errorOptions
    );
  }

  map(_mapper: unknown): ErrImpl<E> {
    return this;
  }

  andThen(op: unknown): ErrImpl<E> {
    return this;
  }

  mapErr<E2>(mapper: (err: E) => E2): ErrImpl<E2> {
    return new ErrImpl(mapper(this.val));
  }

  get stack(): string {
    return `${this}\n${this._stack}`;
  }
}
