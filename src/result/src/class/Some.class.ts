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

  expect(_msg: string): T {
    return this.val;
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

  map<T2>(mapper: (_val: T) => T2): SomeImpl<T2> {
    return Some(mapper(this.val));
  }

  mapOr<T2>(
    _default_: T2,
    mapper: (_val: T) => T2
  ): T2 {
    return mapper(this.val);
  }

  mapOrElse<U>(
    default_: () => U,
    _mapper: (_val: T) => U
  ): U {
    return default_();
  }

  andThen<T2>(
    mapper: (_val: T) => Option<T2>
  ): Option<T2> {
    return mapper(this.val);
  }

  toResult<E>(_error: E): OkImpl<T> {
    return Ok(this.val);
  }

  toString(): string {
    return `Some(${toString(this.val)})`;
  }
}

export function Some<T>(value: T) {
  return new SomeImpl<T>(value);
}
