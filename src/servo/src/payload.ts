// Import Node.js Dependencies
import { Buffer } from "node:buffer";
import type {
  IncomingMessage,
  ServerResponse
} from "node:http";

// Import Internal Dependencies
import type { CacheControlOptions } from "./http/cacheControl.ts";
import { contentEtag } from "./http/etag.ts";
import { DEFAULT_CONTENT_TYPE } from "./mime/contentTypes.ts";
import { send } from "./send.ts";
import { bytesEntry } from "./sources/bytesSource.ts";

export interface SendPayloadOptions extends CacheControlOptions {
  /**
   * A `Uint8Array` reused across calls is hashed once for `etag: true`; a
   * string is encoded and hashed on every call.
   */
  body: string | Uint8Array;
  /**
   * @default "application/octet-stream" ("application/json; charset=utf-8" for sendJson)
   */
  contentType?: string;
  /**
   * Sent as is, replacing any `Cache-Control` already set. Takes precedence
   * over `dev`, `maxAge`, `private` and `immutable`.
   */
  cacheControl?: string;
  /**
   * `true` adds a strong ETag hashed from the payload, a string is sent as the
   * ETag as is. Either way a matching `If-None-Match` answers 304.
   * @default false
   */
  etag?: boolean | string;
}

/**
 * Sends a small in-memory payload through `send()`, so HEAD, byte ranges and
 * conditional requests behave as for a file.
 */
export function sendPayload(
  req: IncomingMessage,
  res: ServerResponse,
  options: SendPayloadOptions
): Promise<void> {
  const {
    body,
    contentType = DEFAULT_CONTENT_TYPE,
    cacheControl,
    etag = false,
    dev,
    maxAge,
    private: isPrivate,
    immutable
  } = options;

  if (cacheControl !== undefined) {
    res.setHeader("Cache-Control", cacheControl);
  }

  const bytes = typeof body === "string" ? Buffer.from(body) : body;

  return send(req, res, {
    dev,
    maxAge,
    private: isPrivate,
    immutable,
    entry: bytesEntry(bytes, {
      etag: etag === true ? contentEtag(bytes) : etag || undefined
    }),
    contentType
  });
}

export interface SendJsonOptions extends Omit<SendPayloadOptions, "body"> {
  body: unknown;
}

export function sendJson(
  req: IncomingMessage,
  res: ServerResponse,
  options: SendJsonOptions
): Promise<void> {
  return sendPayload(req, res, {
    contentType: "application/json; charset=utf-8",
    ...options,
    body: JSON.stringify(options.body)
  });
}
