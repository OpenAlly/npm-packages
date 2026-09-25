// Import Node.js Dependencies
import assert from "node:assert";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import { describe, it } from "node:test";

// Import Internal Dependencies
import { isFresh } from "../../src/index.ts";
import { ifRangeMatches } from "../../src/http/conditional.ts";

// CONSTANTS
const kMtime = new Date("2026-01-01T10:00:00.750Z");
const kLastModified = kMtime.toUTCString();

function request(
  headers: IncomingHttpHeaders
): IncomingMessage {
  return { headers } as IncomingMessage;
}

describe("isFresh", () => {
  it("should be stale without conditional headers", () => {
    assert.strictEqual(isFresh(request({}), { etag: "\"a\"", mtime: kMtime }), false);
  });

  it("should match an identical entity tag", () => {
    assert.strictEqual(isFresh(request({ "if-none-match": "\"a\"" }), { etag: "\"a\"" }), true);
  });

  it("should use weak comparison", () => {
    assert.strictEqual(isFresh(request({ "if-none-match": "W/\"a\"" }), { etag: "\"a\"" }), true);
    assert.strictEqual(isFresh(request({ "if-none-match": "\"a\"" }), { etag: "W/\"a\"" }), true);
  });

  it("should match any tag of a list", () => {
    const ifNoneMatch = "\"x\", W/\"a\" ,\"y\"";

    assert.strictEqual(isFresh(request({ "if-none-match": ifNoneMatch }), { etag: "W/\"a\"" }), true);
    assert.strictEqual(isFresh(request({ "if-none-match": "\"x\", \"y\"" }), { etag: "\"a\"" }), false);
  });

  it("should match a wildcard", () => {
    assert.strictEqual(isFresh(request({ "if-none-match": "*" }), { etag: "\"a\"" }), true);
  });

  it("should be stale when If-None-Match is sent but there is no etag", () => {
    assert.strictEqual(isFresh(request({ "if-none-match": "*" }), { mtime: kMtime }), false);
  });

  it("should ignore If-Modified-Since when If-None-Match is present", () => {
    assert.strictEqual(isFresh(request({
      "if-none-match": "\"other\"",
      "if-modified-since": kLastModified
    }), { etag: "\"a\"", mtime: kMtime }), false);
  });

  it("should match If-Modified-Since with second precision", () => {
    assert.strictEqual(isFresh(request({ "if-modified-since": kLastModified }), { mtime: kMtime }), true);
  });

  it("should be stale when the file is newer than If-Modified-Since", () => {
    const since = new Date(kMtime.getTime() - 2000).toUTCString();

    assert.strictEqual(isFresh(request({ "if-modified-since": since }), { mtime: kMtime }), false);
  });

  it("should be stale on an invalid date or without mtime", () => {
    assert.strictEqual(isFresh(request({ "if-modified-since": "nope" }), { mtime: kMtime }), false);
    assert.strictEqual(isFresh(request({ "if-modified-since": kLastModified }), {}), false);
  });
});

describe("ifRangeMatches", () => {
  it("should match without If-Range", () => {
    assert.strictEqual(ifRangeMatches(request({}), {}), true);
  });

  it("should strong-match an entity tag", () => {
    assert.strictEqual(ifRangeMatches(request({ "if-range": "\"a\"" }), { etag: "\"a\"" }), true);
    assert.strictEqual(ifRangeMatches(request({ "if-range": "\"b\"" }), { etag: "\"a\"" }), false);
  });

  it("should never match weak tags", () => {
    assert.strictEqual(ifRangeMatches(request({ "if-range": "W/\"a\"" }), { etag: "W/\"a\"" }), false);
    assert.strictEqual(ifRangeMatches(request({ "if-range": "\"a\"" }), { etag: "W/\"a\"" }), false);
    assert.strictEqual(ifRangeMatches(request({ "if-range": "\"a\"" }), {}), false);
  });

  it("should match a date equal to Last-Modified", () => {
    assert.strictEqual(ifRangeMatches(request({ "if-range": kLastModified }), { mtime: kMtime }), true);
  });

  it("should not match a different or invalid date", () => {
    const other = new Date(kMtime.getTime() - 5000).toUTCString();

    assert.strictEqual(ifRangeMatches(request({ "if-range": other }), { mtime: kMtime }), false);
    assert.strictEqual(ifRangeMatches(request({ "if-range": "nope" }), { mtime: kMtime }), false);
    assert.strictEqual(ifRangeMatches(request({ "if-range": kLastModified }), {}), false);
  });
});
