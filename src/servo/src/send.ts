// Import Node.js Dependencies
import { Buffer } from "node:buffer";
import type {
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse
} from "node:http";
import { pipeline } from "node:stream/promises";

// Import Internal Dependencies
import { cacheControl, type CacheControlOptions } from "./http/cacheControl.ts";
import { ifRangeMatches, isFresh, type Validators } from "./http/conditional.ts";
import { weakEtag } from "./http/etag.ts";
import { parseRange, type ByteRange } from "./http/range.ts";
import { contentType, DEFAULT_CONTENT_TYPES } from "./mime/contentTypes.ts";
import type { ServoEntry } from "./sources/types.ts";

// CONSTANTS
const kBodyHeaders = [
  "content-type",
  "content-length",
  "content-range",
  "content-encoding"
];

export interface SendOptions extends CacheControlOptions {
  entry: ServoEntry;
  /**
   * Name of the served file, used for the Content-Type lookup and passed to
   * `setHeaders`. For a precompressed variant, this is the original name.
   * @default ""
   */
  path?: string;
  contentType?: string;
  /**
   * Suffix-to-MIME entries merged over the defaults for the lookup on `path`.
   */
  contentTypes?: Readonly<Record<string, string>>;
  encoding?: string;
  vary?: boolean;
  /**
   * @default true
   */
  etag?: boolean;
  /**
   * @default true
   */
  lastModified?: boolean;
  /** Runs last and may override generated headers. */
  setHeaders?: (
    res: ServerResponse,
    path: string,
    entry: ServoEntry
  ) => void;
}

/**
 * Sends 200, 206, 304 or 416; HEAD sends headers only. Keeps caller headers
 * except Content-Length, Content-Range and Content-Encoding. `setHeaders` runs last.
 *
 * Before headers are sent, a body error restores caller headers and rejects.
 * A later stream error destroys the response.
 */
export async function send(
  req: IncomingMessage,
  res: ServerResponse,
  options: SendOptions
): Promise<void> {
  await using entry = options.entry;
  const initialHeaders = res.getHeaders();

  try {
    writeHeaders(res, entry, options);

    const validators = finalValidators(res);
    if (isFresh(req, validators)) {
      res.statusCode = 304;
      for (const name of kBodyHeaders) {
        res.removeHeader(name);
      }
      res.end();

      return;
    }

    let range: ByteRange | undefined;
    const rangeHeader = req.headers.range;
    if (
      req.method === "GET" &&
      rangeHeader !== undefined &&
      ifRangeMatches(req, validators)
    ) {
      const parsed = parseRange(rangeHeader, entry.size);
      if (parsed === "unsatisfiable") {
        res.statusCode = 416;
        res.setHeader("Content-Range", `bytes */${entry.size}`);
        res.setHeader("Content-Length", "0");
        res.removeHeader("content-type");
        res.end();

        return;
      }
      range = parsed ?? undefined;
    }

    const length = range === undefined
      ? entry.size
      : range.end - range.start + 1;
    res.statusCode = range === undefined ? 200 : 206;
    res.setHeader("Content-Length", String(length));
    if (range !== undefined) {
      res.setHeader(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${entry.size}`
      );
    }

    if (req.method === "HEAD" || length === 0) {
      res.end();

      return;
    }

    const body = await entry.body(range);
    if (body instanceof Uint8Array) {
      res.end(
        Buffer.from(
          body.buffer,
          body.byteOffset,
          body.byteLength
        )
      );

      return;
    }

    try {
      await pipeline(body, res);
    }
    catch {
      res.destroy();
    }
  }
  catch (error) {
    if (!res.headersSent) {
      restoreHeaders(
        res,
        initialHeaders
      );
    }

    throw error;
  }
}

function writeHeaders(
  res: ServerResponse,
  entry: ServoEntry,
  options: SendOptions
): void {
  const {
    path = "",
    encoding,
    vary = false,
    etag = true,
    lastModified = true
  } = options;

  const type = options.contentType ??
    contentType(path, {
      ...DEFAULT_CONTENT_TYPES,
      ...options.contentTypes
    });
  setDefault(
    res,
    "Content-Type",
    type
  );
  if (lastModified && entry.mtime !== undefined) {
    setDefault(
      res,
      "Last-Modified",
      entry.mtime.toUTCString()
    );
  }
  if (etag) {
    const tag = entry.etag ?? (
      entry.mtime === undefined ? undefined : weakEtag(entry.size, entry.mtime)
    );
    if (tag !== undefined) {
      setDefault(res, "ETag", tag);
    }
  }

  const cache = cacheControl(options);
  if (cache !== null) {
    setDefault(res, "Cache-Control", cache);
  }
  setDefault(res, "Accept-Ranges", "bytes");
  setDefault(res, "X-Content-Type-Options", "nosniff");
  if (vary) {
    appendVary(res, "Accept-Encoding");
  }

  if (encoding === undefined) {
    res.removeHeader("content-encoding");
  }
  else {
    res.setHeader("Content-Encoding", encoding);
  }

  options.setHeaders?.(res, path, entry);
}

function finalValidators(
  res: ServerResponse
): Validators {
  const etag = res.getHeader("etag");
  const lastModified = res.getHeader("last-modified");

  return {
    etag: typeof etag === "string"
      ? etag
      : undefined,
    mtime: typeof lastModified === "string"
      ? new Date(lastModified)
      : undefined
  };
}

function restoreHeaders(
  res: ServerResponse,
  headers: OutgoingHttpHeaders
): void {
  for (const name of res.getHeaderNames()) {
    res.removeHeader(name);
  }
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(name, value);
    }
  }
}

function setDefault(
  res: ServerResponse,
  name: string,
  value: string
): void {
  if (!res.hasHeader(name)) {
    res.setHeader(name, value);
  }
}

function appendVary(
  res: ServerResponse,
  field: string
): void {
  const current = res.getHeader("vary");
  if (current === undefined) {
    res.setHeader("Vary", field);

    return;
  }

  const fields = String(current)
    .split(",")
    .map((value) => value.trim().toLowerCase());
  if (
    !fields.includes("*") &&
    !fields.includes(field.toLowerCase())
  ) {
    res.setHeader("Vary", `${current}, ${field}`);
  }
}
