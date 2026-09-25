// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { FileSystemSource, servo } from "../src/index.ts";
import { listen } from "./helpers/server.ts";
import { createWww } from "./helpers/www.ts";

/**
 * Raw request paths with the status servo must answer. Every one of them must
 * stay away from `package.json` and `outside/`, which live next to the root.
 */
const kCorpus: [path: string, status: number][] = [
  ["/../package.json", 403],
  ["/..%2fpackage.json", 403],
  ["/%2e%2e/package.json", 403],
  ["/%2E%2E%2Fpackage.json", 403],
  ["/..%5cpackage.json", 403],
  ["/..\\package.json", 403],
  ["/docs/../../package.json", 403],
  ["/a/%00.txt", 400],
  ["/C:/Windows/win.ini", 403],
  ["/c%3A%5CWindows%5Cwin.ini", 403],
  ["//etc/passwd", 403],
  ["/%2Fetc/passwd", 403],
  ["/CON", 403],
  ["/con.txt", 403],
  ["/file.txt::$DATA", 403],
  ["/index.html.", 403],
  ["/index.html%20", 403],
  ["/.git/config", 404],
  ["/%2egit/config", 404],
  ["/%E0%A4%A", 400],
  ["/escape/secret.txt", 404],
  ["/escape/", 404]
];

describe("traversal corpus", () => {
  for (const [path, status] of kCorpus) {
    it(`should answer ${status} to ${path}`, async() => {
      await using www = await createWww();
      await using server = await listen(servo(www.root));
      const res = await server.request(path);

      assert.strictEqual(res.status, status);
      assert.strictEqual(res.body.length, 0);
    });
  }

  it("should serve /.well-known/security.txt", async() => {
    await using www = await createWww();
    await using server = await listen(servo(www.root));

    assert.strictEqual((await server.request("/.well-known/security.txt")).status, 200);
  });

  it("should keep the corpus rejected under a prefix", async() => {
    await using www = await createWww();
    await using server = await listen(servo(www.root, { prefix: "/assets" }));

    assert.strictEqual((await server.request("/assets/../package.json")).status, 403);
    assert.strictEqual((await server.request("/assets/..%2f..%2fpackage.json")).status, 403);
  });

  it("should apply rejectionStatus overrides", async() => {
    await using www = await createWww();
    await using server = await listen(servo(www.root, {
      rejectionStatus: { traversal: 404, invalid: 422 }
    }));

    assert.strictEqual((await server.request("/../package.json")).status, 404);
    assert.strictEqual((await server.request("/%E0%A4%A")).status, 422);
    assert.strictEqual((await server.request("/CON")).status, 403);
  });
});

describe("symlinks", () => {
  it("should answer 404 for a link escaping the root", async() => {
    await using www = await createWww();
    await using server = await listen(servo(www.root));

    assert.strictEqual((await server.request("/escape/secret.txt")).status, 404);
  });

  it("should serve a link escaping the root with followSymlinks", async() => {
    await using www = await createWww();
    await using server = await listen(servo(new FileSystemSource(www.root, { followSymlinks: true })));
    const res = await server.request("/escape/secret.txt");

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.text, "secret");
  });

  it("should serve a link that stays inside the root", async() => {
    await using www = await createWww();
    await using server = await listen(servo(www.root));

    assert.strictEqual((await server.request("/alias/index.html")).text, "<h1>docs</h1>");
  });
});
