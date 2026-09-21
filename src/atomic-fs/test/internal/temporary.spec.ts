// Import Node.js Dependencies
import assert from "node:assert";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";

// Import Internal Dependencies
import { tempWorkspace } from "../helpers/tempWorkspace.ts";

const run = promisify(execFile);
const kSourceDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "src"
);

describe("cleanup on exit", () => {
  it("should unlink the temporary file when the process exits mid-write", async() => {
    await using workspace = await tempWorkspace();

    await run(process.execPath, [
      "--input-type=module",
      "-e",
      script(workspace.resolve("note.txt"), true)
    ]);

    assert.deepStrictEqual(await workspace.entries(), []);
  });

  it("should leave the temporary file when cleanup is disabled", async() => {
    await using workspace = await tempWorkspace();

    await run(process.execPath, [
      "--input-type=module",
      "-e",
      script(workspace.resolve("note.txt"), false)
    ]);

    const entries = await workspace.entries();
    assert.strictEqual(entries.length, 1);
    assert.match(entries[0], /^\.note\.txt\.[0-9a-f]+\.tmp$/);
  });
});

function script(
  target: string,
  cleanupOnExit: boolean
): string {
  const entry = pathToUrl(
    path.join(kSourceDirectory, "operations", "writeFileAtomic.ts")
  );

  return `
    import { writeFileAtomic } from ${JSON.stringify(entry)};

    writeFileAtomic(${JSON.stringify(target)}, "ok", {
      cleanupOnExit: ${cleanupOnExit},
      tmpfileCreated: () => {
        setTimeout(() => process.exit(0), 50);

        return new Promise(() => void 0);
      }
    });
  `;
}

function pathToUrl(
  absolute: string
): string {
  return new URL(`file://${absolute.replace(/\\/g, "/")}`).href;
}
