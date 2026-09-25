// Import Node.js Dependencies
import type {
  IncomingMessage,
  ServerResponse
} from "node:http";

export type Next = () => void;

/**
 * Connect-style handler, usable with `http.createServer`, Vite
 * `server.middlewares.use()`, Polka or Express.
 */
export type ServoHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: Next
) => void;
