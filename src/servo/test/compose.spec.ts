// Import Node.js Dependencies
import assert from "node:assert";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { compose, servo, type Next } from "../src/index.ts";
import { listen } from "./helpers/server.ts";
import { createWww } from "./helpers/www.ts";

describe("compose", () => {
  it("should mount several folders under their own prefix", async() => {
    await using www = await createWww();
    await using server = await listen(compose(
      servo(www.resolve("docs"), { prefix: "/editors/docs", dev: true }),
      servo(www.root, { prefix: "/editors/site", dev: true })
    ));

    assert.strictEqual((await server.request("/editors/docs/")).text, "<h1>docs</h1>");
    assert.strictEqual((await server.request("/editors/site/about")).text, "<h1>about</h1>");
    assert.strictEqual((await server.request("/editors/docs")).headers.location, "/editors/docs/");
  });

  it("should answer 404 after the last handler without next", async() => {
    await using server = await listen(compose(
      (_req, _res, next) => next?.()
    ));

    assert.strictEqual((await server.request("/")).status, 404);
  });

  it("should call the outer next after the last handler", async() => {
    const order: string[] = [];
    function handler(
      _req: IncomingMessage,
      _res: ServerResponse,
      next?: Next
    ): void {
      order.push("first");
      next?.();
    }

    await using server = await listen((req, res) => {
      compose(handler, handler)(req, res, () => {
        order.push("outer");
        res.end("outer");
      });
    });

    assert.strictEqual((await server.request("/")).text, "outer");
    assert.deepStrictEqual(order, ["first", "first", "outer"]);
  });

  it("should stop at the handler that answers", async() => {
    await using server = await listen(compose(
      (_req, res) => res.end("first"),
      () => assert.fail("must not run")
    ));

    assert.strictEqual((await server.request("/")).text, "first");
  });
});
