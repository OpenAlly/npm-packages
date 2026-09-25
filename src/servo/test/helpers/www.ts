// Import Node.js Dependencies
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

export const kDigits = "0123456789".repeat(100);
export const kAppJs = "console.log('app');\n".repeat(20);

export interface Www extends AsyncDisposable {
  /**
   * Temporary folder holding `www/` and `outside/`.
   */
  base: string;
  /**
   * The served root.
   */
  root: string;
  resolve(...segments: string[]): string;
}

/**
 * Builds a served tree in a temporary folder:
 *
 * ```
 * package.json             outside the root, traversal target
 * outside/secret.txt       reached through www/escape
 * www/
 *   index.html about.html app.js(.br|.gz) style.css data.json digits.txt ...
 *   docs/index.html docs/guide.htm
 *   .env .git/config .well-known/security.txt
 *   escape -> ../outside   (junction on Windows)
 *   alias  -> docs         (junction on Windows)
 * ```
 */
export async function createWww(): Promise<Www> {
  const base = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "servo-"))
  );
  const root = path.join(base, "www");

  async function write(
    relative: string,
    content: string | Buffer
  ): Promise<void> {
    const absolute = path.join(base, relative);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, content);
  }

  await write("package.json", "{\"name\":\"outside\"}");
  await write("outside/secret.txt", "secret");
  await write("www/index.html", "<h1>home</h1>");
  await write("www/about.html", "<h1>about</h1>");
  await write("www/app.js", kAppJs);
  await write("www/app.js.br", zlib.brotliCompressSync(kAppJs));
  await write("www/app.js.gz", zlib.gzipSync(kAppJs));
  await write("www/style.css", "body{}");
  await write("www/data.json", "{\"ok\":true}");
  await write("www/digits.txt", kDigits);
  await write("www/empty.txt", "");
  await write("www/unknown.xyz", "???");
  await write("www/docs/index.html", "<h1>docs</h1>");
  await write("www/docs/guide.htm", "<h1>guide</h1>");
  await write("www/.env", "SECRET=1");
  await write("www/.git/config", "[core]");
  await write("www/.well-known/security.txt", "Contact: mailto:security@example.com");
  await write("www/.well-known/.hidden", "hidden");
  await write("www/100%.txt", "percent");
  await write("www/with space.txt", "space");

  await fs.symlink(path.join(base, "outside"), path.join(root, "escape"), "junction");
  await fs.symlink(path.join(root, "docs"), path.join(root, "alias"), "junction");

  return {
    base,
    root,
    resolve(...segments) {
      return path.join(root, ...segments);
    },
    async [Symbol.asyncDispose]() {
      await fs.rm(base, { recursive: true, force: true });
    }
  };
}
