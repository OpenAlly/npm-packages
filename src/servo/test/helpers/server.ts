// Import Node.js Dependencies
import http from "node:http";
import type { AddressInfo } from "node:net";
import { once } from "node:events";

export interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  text: string;
}

export interface RequestOptions {
  method?: string;
  headers?: http.OutgoingHttpHeaders;
}

export interface TestServer extends AsyncDisposable {
  server: http.Server;
  port: number;
  /**
   * Sends `path` verbatim: unlike `fetch`, `http.request` does not normalize
   * `..` or `%2e%2e`, so traversal attempts reach the handler unchanged.
   */
  request(path: string, options?: RequestOptions): Promise<RawResponse>;
}

export async function listen(
  listener: http.RequestListener
): Promise<TestServer> {
  const server = http.createServer(listener);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = server.address() as AddressInfo;

  return {
    server,
    port,
    request(path, options = {}) {
      const { promise, resolve, reject } = Promise.withResolvers<RawResponse>();

      const req = http.request({
        host: "127.0.0.1",
        port,
        path,
        method: options.method ?? "GET",
        headers: options.headers,
        agent: false
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("error", reject);
        res.on("end", () => {
          const body = Buffer.concat(chunks);
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body,
            text: body.toString("utf8")
          });
        });
      });
      req.on("error", reject);
      req.end();

      return promise;
    },
    async [Symbol.asyncDispose]() {
      server.closeAllConnections();
      server.close();
      await once(server, "close");
    }
  };
}
