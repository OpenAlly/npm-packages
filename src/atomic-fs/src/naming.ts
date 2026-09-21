// Import Node.js Dependencies
import { randomBytes } from "node:crypto";
import path from "node:path";

/**
 * Generates temporary file names and recognizes the ones it generated.
 */
export interface TemporaryNaming {
  /**
   * Builds an absolute temporary path sibling to `target`.
   */
  create(target: string): string;
  /**
   * Whether `basename` is a temporary artifact produced by `create`.
   */
  match(basename: string): boolean;
}

export interface TemporaryNamingOptions {
  /**
   * Prepended to the target basename.
   * @default "."
   */
  prefix?: string;
  /**
   * Appended after the random token.
   * @default ".tmp"
   */
  suffix?: string;
  /**
   * Number of random bytes in the token, rendered as hexadecimal.
   * @default 6
   */
  entropy?: number;
  /**
   * Token factory, mostly useful to make tests deterministic. Must return
   * `entropy * 2` lowercase hexadecimal characters, which is what `match`
   * recognizes.
   */
  random?: () => string;
}

export function temporaryNaming(
  options: TemporaryNamingOptions = {}
): TemporaryNaming {
  const {
    prefix = ".",
    suffix = ".tmp",
    entropy = 6,
    random = () => randomBytes(entropy).toString("hex")
  } = options;

  if (
    prefix === "" &&
    suffix === ""
  ) {
    throw new Error("temporaryNaming requires a non-empty prefix or suffix");
  }

  const hex = `[0-9a-f]{${entropy * 2}}`;
  const tokenPattern = new RegExp(`^${hex}$`);
  const pattern = new RegExp(
    `^${escape(prefix)}.+\\.${hex}${escape(suffix)}$`
  );

  return {
    create(target) {
      const absolute = path.resolve(target);
      const token = random();
      if (!tokenPattern.test(token)) {
        throw new Error(
          `temporaryNaming random must return ${entropy * 2} lowercase hexadecimal characters`
        );
      }

      return path.join(
        path.dirname(absolute),
        `${prefix}${path.basename(absolute)}.${token}${suffix}`
      );
    },
    match(basename) {
      return pattern.test(basename);
    }
  };
}

export const defaultTemporaryNaming: TemporaryNaming = temporaryNaming();

export type TemporaryNamingInput = TemporaryNaming | TemporaryNamingOptions;

export function resolveTemporaryNaming(
  input: TemporaryNamingInput = defaultTemporaryNaming
): TemporaryNaming {
  return "create" in input ? input : temporaryNaming(input);
}

function escape(
  value: string
): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
