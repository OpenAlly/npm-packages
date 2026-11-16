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

type ContentTypeTable = Readonly<Record<string, string>>;

interface CompiledTable {
  /** Lowercased suffix to final MIME, charset included. */
  types: Map<string, string>;
  /** Distinct suffix lengths, longest first. */
  lengths: number[];
}

const kEmptyTable: ContentTypeTable = Object.freeze({});
const kCompiled = new WeakMap<ContentTypeTable, CompiledTable>();
const kMergedOverDefaults = new WeakMap<ContentTypeTable, CompiledTable>();

/**
 * Resolves the Content-Type of `path` by longest-suffix match on its basename.
 * Textual types get `; charset=utf-8` unless the table entry already carries
 * parameters. Unknown suffixes resolve to `application/octet-stream`.
 *
 * The table is compiled once and cached by identity, so reuse the same object
 * across calls and do not mutate it afterwards.
 */
export function contentType(
  path: string,
  table: ContentTypeTable = DEFAULT_CONTENT_TYPES
): string {
  return lookup(compiled(table), path);
}

/**
 * `contentType` with `overrides` merged over `DEFAULT_CONTENT_TYPES`, or
 * alone when `defaults` is false. The merge is cached per `overrides` object.
 * @internal
 */
export function resolveContentType(
  path: string,
  overrides: ContentTypeTable | undefined,
  defaults = true
): string {
  if (!defaults) {
    return contentType(path, overrides ?? kEmptyTable);
  }
  if (overrides === undefined) {
    return contentType(path);
  }

  let table = kMergedOverDefaults.get(overrides);
  if (table === undefined) {
    table = compile({ ...DEFAULT_CONTENT_TYPES, ...overrides });
    kMergedOverDefaults.set(overrides, table);
  }

  return lookup(table, path);
}

function compiled(
  table: ContentTypeTable
): CompiledTable {
  let result = kCompiled.get(table);
  if (result === undefined) {
    result = compile(table);
    kCompiled.set(table, result);
  }

  return result;
}

function compile(
  table: ContentTypeTable
): CompiledTable {
  const types = new Map<string, string>();
  for (const [suffix, mime] of Object.entries(table)) {
    const key = suffix.toLowerCase();
    // Keys that only differ by case: the first one wins.
    if (!types.has(key)) {
      types.set(key, withCharset(mime));
    }
  }

  const lengths = [...new Set(Array.from(types.keys(), (key) => key.length))]
    .sort((left, right) => right - left);

  return { types, lengths };
}

function lookup(
  { types, lengths }: CompiledTable,
  path: string
): string {
  const name = basename(path).toLowerCase();
  for (const length of lengths) {
    if (length >= name.length) {
      continue;
    }

    const mime = types.get(name.slice(name.length - length));
    if (mime !== undefined) {
      return mime;
    }
  }

  return DEFAULT_CONTENT_TYPE;
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
