// Import Node.js Dependencies
import assert from "node:assert";
import fs from "node:fs/promises";
import http from "node:http";
import { once } from "node:events";
import { describe, it } from "node:test";
import type { Readable } from "node:stream";

// Import Internal Dependencies
import {
  FileSystemSource,
  servo,
  type ServoSource
} from "../src/index.ts";
import { listen } from "./helpers/server.ts";
import { createWww } from "./helpers/www.ts";

interface Spy extends ServoSource {
  opened: number;
  closed: number;
  streams: Readable[];
}

/**
 * Wraps a FileSystemSource and counts every open handle and how it is
 * released: through async disposal, or through the body stream closing.
 */
function spy(
  root: string
): Spy {
  const inner = new FileSystemSource(root);
  const state: Spy = {
    opened: 0,
    closed: 0,
    streams: [],
    async lookup(path) {
      const entry = await inner.lookup(path);
      if (entry === null || entry === "directory") {
        return entry;
      }

      state.opened++;
      let streamed = false;

      return {
        ...entry,
        async body(range) {
          const stream = await entry.body(range) as Readable;
          streamed = true;
          state.streams.push(stream);
          stream.once("close", () => state.closed++);

          return stream;
        },
        async [Symbol.asyncDispose]() {
          // Once streamed, the stream releases the handle: disposal is a no-op.
          if (!streamed) {
            state.closed++;
          }
          await entry[Symbol.asyncDispose]();
        }
      };
    }
  };

  return state;
}

describe("resources", () => {
  it("should release the handle on HEAD, 304, 416 and 200", async() => {
    await using www = await createWww();
    const source = spy(www.root);
    await using server = await listen(servo(source));

    const { headers } = await server.request("/digits.txt");
    await server.request("/digits.txt", { method: "HEAD" });
    await server.request("/digits.txt", { headers: { "if-none-match": headers.etag } });
    await server.request("/digits.txt", { headers: { range: "bytes=5000-" } });
    await server.request("/empty.txt");

    assert.strictEqual(source.opened, 5);
    assert.strictEqual(source.closed, 5);
  });

  it("should close the handle when the client aborts mid-stream", async() => {
    await using www = await createWww();
    await fs.writeFile(www.resolve("big.bin"), Buffer.alloc(8 * 1024 * 1024, 1));
    const source = spy(www.root);
    await using server = await listen(servo(source));

    const req = http.request({ host: "127.0.0.1", port: server.port, path: "/big.bin", agent: false });
    req.on("error", () => undefined);
    req.end();
    const [res] = await once(req, "response") as [http.IncomingMessage];
    await once(res, "data");
    req.destroy();

    const [stream] = source.streams;
    if (!stream.closed) {
      // events.once would reject on the premature-close error emitted first.
      const { promise, resolve } = Promise.withResolvers<void>();
      stream.once("close", resolve);
      await promise;
    }
    assert.strictEqual(source.opened, 1);
    assert.strictEqual(source.closed, 1);
  });
});
