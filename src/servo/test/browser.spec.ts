// Import Node.js Dependencies
import assert from "node:assert";
import { builtinModules } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";

// Import Third-party Dependencies
import * as esbuild from "esbuild";

// CONSTANTS
const kPackageRoot = path.join(import.meta.dirname, "..");
const kBuiltins = new Set(builtinModules);

/**
 * Bundles a package specifier for the browser and returns every Node.js
 * builtin the bundle reached. Builtins are kept external so that a single
 * run reports all of them instead of stopping at the first resolve error.
 */
async function bundleForBrowser(
  specifier: string
): Promise<{ builtins: string[]; code: string; }> {
  const builtins: string[] = [];

  const result = await esbuild.build({
    stdin: {
      contents: `export * from "${specifier}";`,
      resolveDir: kPackageRoot,
      loader: "js"
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    logLevel: "silent",
    plugins: [
      {
        name: "detect-node-builtins",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.startsWith("node:") || kBuiltins.has(args.path)) {
              builtins.push(args.path);

              return { path: args.path, external: true };
            }

            return undefined;
          });
        }
      }
    ]
  });

  return {
    builtins,
    code: result.outputFiles[0].text
  };
}

describe("browser compatibility", () => {
  it("should bundle @openally/servo/paths without any Node.js builtin", async() => {
    const { builtins, code } = await bundleForBrowser("@openally/servo/paths");

    assert.deepStrictEqual(builtins, []);
    for (const name of ["safePath", "normalizePosix", "isDotfilePath", "decodeRequestPath"]) {
      assert.match(code, new RegExp(`\\b${name}\\b`));
    }
    assert.doesNotMatch(code, /\bcontainedPath\b/);
  });

  it("should detect Node.js builtins reached from the root entry", async() => {
    const { builtins } = await bundleForBrowser("@openally/servo");

    assert.ok(builtins.includes("node:fs/promises"));
  });
});
