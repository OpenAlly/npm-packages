// Import Node.js Dependencies
import type {
  IncomingMessage,
  ServerResponse
} from "node:http";

// Import Internal Dependencies
import { acceptsEncoding } from "./http/acceptEncoding.ts";
import { decodePath, splitTarget } from "./paths/decodeRequestPath.ts";
import { isDotfilePath } from "./paths/isDotfilePath.ts";
import { safePath, type PathRejection } from "./paths/safePath.ts";
import { encodePath, hasExtension, joinPath } from "./paths/segments.ts";
import {
  allowMethods,
  end,
  pass,
  redirectTo
} from "./respond.ts";
import { send, type SendOptions } from "./send.ts";
import { FileSystemSource } from "./sources/FileSystemSource.ts";
import type { ServoEntry, ServoSource } from "./sources/types.ts";
import type { Next, ServoHandler } from "./types.ts";

// CONSTANTS
const kDefaultRejectionStatus: Readonly<Record<PathRejection, number>> = {
  invalid: 400,
  absolute: 403,
  traversal: 403,
  reserved: 403
};
const kEncodings = [
  { option: "brotli", coding: "br", suffix: ".br" },
  { option: "gzip", coding: "gzip", suffix: ".gz" }
] as const;

export interface ServoOptions extends Pick<
  SendOptions,
  "dev" | "maxAge" | "immutable" | "etag" | "lastModified" | "contentTypes" | "setHeaders"
> {
  /**
   * URL prefix the folder is mounted under. `/assets` and `/assets/` are
   * equivalent. Compared on the raw URL, before decoding.
   * @default "/"
   */
  prefix?: string;
  /**
   * What to do with methods other than GET and HEAD: call `next()`, or answer
   * 405 with `Allow: GET, HEAD`. Without `next`, "next" answers 405 too.
   * @default "next"
   */
  methodNotAllowed?: "next" | "reject";
  /**
   * File served for directory requests, `false` to disable. Throws a
   * `TypeError` when it could leave the directory.
   * @default "index.html"
   */
  index?: string | false;
  /**
   * Extensions tried, in order, when the exact path misses. Throws a
   * `TypeError` when one could change more than the last segment.
   * @default ["html", "htm"]
   */
  extensions?: string[];
  /**
   * Answer 302 to the trailing-slash URL when a directory is requested
   * without one.
   * @default true
   */
  redirect?: boolean;
  /**
   * SPA fallback file served with 200 when nothing matches and the last
   * segment has no extension. `true` uses `index`.
   * @default false
   */
  single?: boolean | string;
  /**
   * `"ignore"` answers 404, `"deny"` answers 403. `.well-known` is always
   * allowed.
   * @default "ignore"
   */
  dotfiles?: "ignore" | "allow" | "deny";
  /** Receives normalized paths without a leading slash; matches return 404. */
  ignore?: (path: string) => boolean;
  /** Serve accepted `.br` and `.gz` siblings. */
  precompressed?: { brotli?: boolean; gzip?: boolean; };
  rejectionStatus?: Partial<Record<PathRejection, number>>;
  onNoMatch?: (req: IncomingMessage, res: ServerResponse) => void;
  onError?: (error: unknown, req: IncomingMessage, res: ServerResponse) => void;
}

interface Encoding {
  coding: string;
  suffix: string;
}

interface Resolved {
  entry: ServoEntry;
  path: string;
  encoding?: string;
}

/**
 * Creates a static file handler. `servo("./dist")` is shorthand for
 * `servo(new FileSystemSource("./dist"))`.
 */
export function servo(
  root: string | ServoSource,
  options: ServoOptions = {}
): ServoHandler {
  const {
    prefix = "/",
    methodNotAllowed = "next",
    index = "index.html",
    extensions = ["html", "htm"],
    redirect = true,
    single = false,
    dotfiles = "ignore",
    ignore,
    precompressed = {},
    rejectionStatus,
    onNoMatch,
    onError,
    ...headerOptions
  } = options;

  const source = typeof root === "string" ? new FileSystemSource(root) : root;
  const mount = normalizePrefix(prefix);
  const indexFile = index === false ? null : fileOption("index file", index);
  const suffixes = extensions.map(extensionSuffix);
  const fallback = single === false ?
    null :
    fileOption("SPA fallback file", single === true ? indexFile ?? "index.html" : single);
  const rejection = {
    ...kDefaultRejectionStatus,
    ...rejectionStatus
  };
  const encodings: Encoding[] = kEncodings.filter(
    ({ option }) => precompressed[option]
  );
  const sendDefaults = { ...headerOptions, vary: encodings.length > 0 };

  function hiddenStatus(
    path: string
  ): number | null {
    if (dotfiles !== "allow" && isDotfilePath(path)) {
      return dotfiles === "deny" ? 403 : 404;
    }
    if (path !== "" && ignore?.(path)) {
      return 404;
    }

    return null;
  }

  async function lookup(
    path: string,
    accepted: Encoding[]
  ): Promise<Resolved | "directory" | null> {
    for (const { coding, suffix } of accepted) {
      const variant = await source.lookup(`${path}${suffix}`);
      if (variant !== null && variant !== "directory") {
        return {
          entry: variant,
          path,
          encoding: coding
        };
      }
    }

    const found = await source.lookup(path);

    return found === null || found === "directory"
      ? found
      : { entry: found, path };
  }

  function* fallbackPaths(
    path: string,
    isDirectory: boolean,
    hasTrailingSlash: boolean
  ): Generator<string> {
    if (isDirectory && indexFile !== null) {
      yield joinPath(path, indexFile);
    }
    if (!hasTrailingSlash) {
      for (const suffix of suffixes) {
        yield `${path}${suffix}`;
      }
    }
    if (fallback !== null && !hasExtension(path)) {
      yield fallback;
    }
  }

  async function resolve(
    path: string,
    hasTrailingSlash: boolean,
    accepted: Encoding[]
  ): Promise<Resolved | "redirect" | null> {
    const found = hasTrailingSlash
      ? "directory"
      : await lookup(path, accepted);
    if (found === "directory" && !hasTrailingSlash && redirect) {
      return "redirect";
    }
    if (found !== null && found !== "directory") {
      return found;
    }

    for (const candidate of fallbackPaths(path, found === "directory", hasTrailingSlash)) {
      if (hiddenStatus(candidate) !== null) {
        continue;
      }

      const file = await lookup(candidate, accepted);
      if (file !== null && file !== "directory") {
        return file;
      }
    }

    return null;
  }

  async function handle(
    req: IncomingMessage,
    res: ServerResponse,
    next: Next | undefined
  ): Promise<void> {
    const { path: rawPath, search } = splitTarget(req.url ?? "/");
    const target = stripPrefix(rawPath, mount);
    if (target === null) {
      pass(res, next);

      return;
    }

    if (
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      methodNotAllowed === "next" &&
      next !== undefined
    ) {
      next();

      return;
    }
    if (!allowMethods(req, res)) {
      return;
    }

    if (target.bare && redirect) {
      redirectTo(res, `${mount}${search}`);

      return;
    }

    const decoded = decodePath(target.relative);
    if (decoded === null) {
      end(res, rejection.invalid);

      return;
    }

    const safe = safePath(decoded);
    if (!safe.ok) {
      end(res, rejection[safe.reason]);

      return;
    }

    const hidden = hiddenStatus(safe.path);
    if (hidden !== null) {
      end(res, hidden);

      return;
    }

    const acceptEncoding = req.headers["accept-encoding"];
    const accepted = encodings.filter(
      ({ coding }) => acceptsEncoding(acceptEncoding, coding)
    );
    const resolved = await resolve(
      safe.path,
      safe.directory,
      accepted
    );

    if (resolved === "redirect") {
      redirectTo(res, `${mount}${encodePath(safe.path)}/${search}`);
    }
    else if (resolved !== null) {
      await send(req, res, {
        ...sendDefaults,
        ...resolved
      });
    }
    else if (onNoMatch === undefined) {
      pass(res, next);
    }
    else {
      onNoMatch(req, res);
    }
  }

  function fail(
    error: unknown,
    req: IncomingMessage,
    res: ServerResponse
  ): void {
    if (res.headersSent || res.destroyed) {
      res.destroy();

      return;
    }

    if (onError === undefined) {
      end(res, 500);

      return;
    }

    try {
      onError(error, req, res);
    }
    catch {
      res.destroy();
    }
  }

  return function servoHandler(req, res, next) {
    handle(req, res, next)
      .catch((error) => fail(error, req, res));
  };
}

function normalizePrefix(
  prefix: string
): string {
  const leading = prefix.startsWith("/")
    ? prefix
    : `/${prefix}`;

  return leading.endsWith("/")
    ? leading
    : `${leading}/`;
}

function stripPrefix(
  rawPath: string,
  mount: string
): { relative: string; bare: boolean; } | null {
  if (rawPath.startsWith(mount)) {
    return {
      relative: rawPath.slice(mount.length),
      bare: false
    };
  }

  if (
    mount !== "/" &&
    rawPath === mount.slice(0, -1)
  ) {
    return {
      relative: "",
      bare: true
    };
  }

  return null;
}

function fileOption(
  name: string,
  file: string
): string {
  const safe = safePath(file);
  if (!safe.ok || safe.directory) {
    throw new TypeError(`Invalid ${name}: ${file}`);
  }

  return safe.path;
}

function extensionSuffix(
  extension: string
): string {
  const suffix = `.${extension.replace(/^\./, "")}`;
  const safe = safePath(`file${suffix}`);
  if (
    !safe.ok ||
    safe.path !== `file${suffix}` ||
    safe.path.includes("/")
  ) {
    throw new TypeError(`Invalid extension: ${extension}`);
  }

  return suffix;
}
