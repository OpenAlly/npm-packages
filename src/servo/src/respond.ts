// Import Node.js Dependencies
import type {
  IncomingMessage,
  ServerResponse
} from "node:http";

// Import Internal Dependencies
import type { Next } from "./types.ts";

/** Returns false and sends 405 with `Allow` for unlisted methods. */
export function allowMethods(
  req: IncomingMessage,
  res: ServerResponse,
  methods: string[] = ["GET", "HEAD"]
): boolean {
  if (
    req.method !== undefined &&
    methods.includes(req.method)
  ) {
    return true;
  }

  res.setHeader("Allow", methods.join(", "));
  end(res, 405);

  return false;
}

export function end(
  res: ServerResponse,
  statusCode: number
): void {
  res.statusCode = statusCode;
  res.end();
}

export function pass(
  res: ServerResponse,
  next: Next | undefined
): void {
  if (next === undefined) {
    end(res, 404);
  }
  else {
    next();
  }
}

export function redirectTo(
  res: ServerResponse,
  location: string
): void {
  res.setHeader("Location", location);
  res.setHeader("Content-Length", "0");
  end(res, 302);
}
