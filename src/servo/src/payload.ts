// Import Node.js Dependencies
import { Buffer } from "node:buffer";
import type {
  IncomingMessage,
  ServerResponse
} from "node:http";

// Import Internal Dependencies
import { DEFAULT_CONTENT_TYPE } from "./mime/contentTypes.ts";
import { send } from "./send.ts";
import { bytesEntry } from "./sources/bytesSource.ts";

export interface SendPayloadOptions {
  body: string | Uint8Array;
  /**
   * @default "application/octet-stream" ("application/json; charset=utf-8" for sendJson)
   */
  contentType?: string;
  cacheControl?: string;
  /**
   * Adds a strong ETag hashed from the payload and answers 304 on a match.
   * @default false
   */
  etag?: boolean;
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
    etag = false
  } = options;

  if (cacheControl !== undefined) {
    res.setHeader("Cache-Control", cacheControl);
  }

  return send(req, res, {
    entry: bytesEntry(
      typeof body === "string" ? Buffer.from(body) : body,
      etag
    ),
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
