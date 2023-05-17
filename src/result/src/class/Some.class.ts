// Import Internal Dependencies
import { Ok, OkImpl } from "./Ok.class.js";
import { None } from "./None.class.js";
import { toString } from "../utils.js";

export type Option<T> = SomeImpl<T> | None;

export class SomeImpl<T> {
  static readonly EMPTY = new SomeImpl<void>(undefined);

  readonly some!: true;
  readonly none!: false;
  readonly val!: T;

  constructor(val: T) {
    this.some = true;
    this.none = false;
    this.val = val;
  }

  unwrapOr(_val: unknown): T {
    return this.val;
  }

  expect(_msg: string): T {
    return this.val;
  }

  unwrap(): T {
    return this.val;
  }

  map<T2>(mapper: (val: T) => T2): SomeImpl<T2> {
    return Some(mapper(this.val));
  }

  andThen<T2>(mapper: (val: T) => Option<T2>): Option<T2> {
    return mapper(this.val);
  }

  // eslint-disable-next-line handle-callback-err
  toResult<E>(error: E): OkImpl<T> {
    return Ok(this.val);
  }

  safeUnwrap(): T {
    return this.val;
  }

  toString(): string {
    return `Some(${toString(this.val)})`;
  }
}

export function Some<T>(value: T) {
  return new SomeImpl<T>(value);
}
