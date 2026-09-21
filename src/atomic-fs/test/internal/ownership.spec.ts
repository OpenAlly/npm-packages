// Import Node.js Dependencies
import assert from "node:assert";
import { describe, it } from "node:test";

// Import Internal Dependencies
import type { AtomicFs } from "../../src/internal/fs.ts";
import { isOwnershipErrOk, resolveOwnership } from "../../src/internal/ownership.ts";

const kStats = { mode: 0o644, uid: 501, gid: 20 };
const kSkipOnWindows = { skip: process.platform === "win32" };
const kOnlyOnWindows = { skip: process.platform !== "win32" };

type StatFs = Pick<AtomicFs, "stat">;

function statsFs(
  stats: typeof kStats | null
): StatFs {
  return {
    stat: () => (stats === null
      ? Promise.reject(new Error("ENOENT"))
      : Promise.resolve(stats))
  };
}

describe("resolveOwnership", () => {
  it("should not stat when both mode and chown are explicit", async() => {
    let stated = false;
    const fs: StatFs = {
      stat: () => {
        stated = true;

        return Promise.resolve(kStats);
      }
    };

    const resolved = await resolveOwnership(fs, "/target", {
      mode: 0o600,
      chown: { uid: 1, gid: 2 }
    });

    assert.strictEqual(stated, false);
    assert.deepStrictEqual(resolved, {
      mode: 0o600,
      chown: { uid: 1, gid: 2 }
    });
  });

  it("should inherit the mode of an existing target", async() => {
    const resolved = await resolveOwnership(statsFs(kStats), "/target", {});

    assert.strictEqual(resolved.mode, 0o644);
  });

  it("should leave the mode undefined when the target is missing", async() => {
    const resolved = await resolveOwnership(statsFs(null), "/target", {});

    assert.strictEqual(resolved.mode, undefined);
    assert.strictEqual(resolved.chown, null);
  });

  it("should prefer an explicit mode over the inherited one", async() => {
    const resolved = await resolveOwnership(statsFs(kStats), "/target", {
      mode: 0o600
    });

    assert.strictEqual(resolved.mode, 0o600);
  });

  it("should drop the chown when the option is false", async() => {
    const resolved = await resolveOwnership(statsFs(kStats), "/target", {
      chown: false
    });

    assert.strictEqual(resolved.chown, null);
    assert.strictEqual(resolved.mode, 0o644);
  });

  it("should keep an explicit chown even when the target is missing", async() => {
    const resolved = await resolveOwnership(statsFs(null), "/target", {
      chown: { uid: 7, gid: 8 }
    });

    assert.deepStrictEqual(resolved.chown, { uid: 7, gid: 8 });
  });

  it("should inherit the ownership of an existing target", kSkipOnWindows, async() => {
    const resolved = await resolveOwnership(statsFs(kStats), "/target", {});

    assert.deepStrictEqual(resolved.chown, { uid: 501, gid: 20 });
  });

  it("should never inherit ownership on a platform without uids", kOnlyOnWindows, async() => {
    const resolved = await resolveOwnership(statsFs(kStats), "/target", {});

    assert.strictEqual(resolved.chown, null);
  });
});

describe("isOwnershipErrOk", () => {
  it("should tolerate a filesystem that does not implement chown", () => {
    assert.strictEqual(isOwnershipErrOk({ code: "ENOSYS" }), true);
  });

  it("should never tolerate an unrelated failure", () => {
    assert.strictEqual(isOwnershipErrOk({ code: "EIO" }), false);
  });

  it("should tolerate nothing thrown at it that has no code", () => {
    assert.strictEqual(isOwnershipErrOk(new Error("plain")), false);
    assert.strictEqual(isOwnershipErrOk(undefined), false);
  });

  it("should tolerate EPERM and EINVAL for a non-root process", kSkipOnWindows, () => {
    const expected = !process.getuid || process.getuid() !== 0;

    assert.strictEqual(isOwnershipErrOk({ code: "EPERM" }), expected);
    assert.strictEqual(isOwnershipErrOk({ code: "EINVAL" }), expected);
  });

  it("should tolerate EPERM and EINVAL where uids do not exist", kOnlyOnWindows, () => {
    assert.strictEqual(isOwnershipErrOk({ code: "EPERM" }), true);
    assert.strictEqual(isOwnershipErrOk({ code: "EINVAL" }), true);
  });
});
