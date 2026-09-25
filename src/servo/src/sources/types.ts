// Import Node.js Dependencies
import type { Readable } from "node:stream";

// Import Internal Dependencies
import type { ByteRange } from "../http/range.ts";

export type EntryBody = Readable | Uint8Array;

export interface ServoEntry extends AsyncDisposable {
  size: number;
  mtime?: Date;
  /** Overrides the ETag derived from `size` and `mtime`. */
  etag?: string;
  body(range?: ByteRange): EntryBody | Promise<EntryBody>;
  /** Called once after sending, even without `body()`; returned streams have ended. */
  [Symbol.asyncDispose](): PromiseLike<void>;
}

export type Lookup = ServoEntry | "directory" | null;

export interface ServoSource {
  /** `path` is normalized without surrounding slashes; `""` is the root. */
  lookup(path: string): Promise<Lookup>;
}
