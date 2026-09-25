export const DEFAULT_CONTENT_TYPE = "application/octet-stream";

/**
 * Suffix-to-MIME table used by `contentType`. Keys are matched against the
 * lowercased basename, and the longest matching suffix wins.
 */
export const DEFAULT_CONTENT_TYPES: Readonly<Record<string, string>> = Object.freeze({
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".cjs": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".pdf": "application/pdf",
  ".zip": "application/zip"
});

const kTextualApplicationTypes = new Set([
  "application/javascript",
  "application/json",
  "application/xml"
]);

/**
 * Resolves the Content-Type of `path` by longest-suffix match on its basename.
 * Textual types get `; charset=utf-8` unless the table entry already carries
 * parameters. Unknown suffixes resolve to `application/octet-stream`.
 */
export function contentType(
  path: string,
  table: Readonly<Record<string, string>> = DEFAULT_CONTENT_TYPES
): string {
  const name = basename(path).toLowerCase();

  let longest: string | null = null;
  for (const suffix of Object.keys(table)) {
    if (
      name.length > suffix.length &&
      name.endsWith(suffix.toLowerCase()) &&
      (longest === null || suffix.length > longest.length)
    ) {
      longest = suffix;
    }
  }

  return longest === null
    ? DEFAULT_CONTENT_TYPE
    : withCharset(table[longest]);
}

export function isTextual(
  mime: string
): boolean {
  const essence = mime.split(";", 1)[0].trim().toLowerCase();

  return essence.startsWith("text/") ||
    essence.endsWith("+json") ||
    essence.endsWith("+xml") ||
    kTextualApplicationTypes.has(essence);
}

function withCharset(
  mime: string
): string {
  return mime.includes(";") || !isTextual(mime)
    ? mime
    : `${mime}; charset=utf-8`;
}

function basename(
  path: string
): string {
  const slash = Math.max(
    path.lastIndexOf("/"),
    path.lastIndexOf("\\")
  );

  return slash === -1
    ? path
    : path.slice(slash + 1);
}
