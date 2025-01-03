// Import Third-party Dependencies
import { Err, Ok, Some, None, type Result } from "@openally/result";
import { match } from "ts-pattern";

// Import Internal Dependencies
import {
  SafeEnvNotFound,
  EnvNotFound,
  SafeUnknowEnvType,
  UnknowEnvType
} from "../errors.js";
import {
  type ExtractDescriptorType,
  type AllEnvTypeDescriptor,
  type StringTypeParameters,
  ENV_STRING,
  ENV_BOOLEAN,
  ENV_NUMBER
} from "../types.js";
import * as utils from "../utils/index.js";

// CONSTANTS
function kNoopParsingHook() {
  return void 0;
}

export type ParsingState = "found" | "notFound" | "parsingError";
export type ParsingHookFunction = (envName: string, state: ParsingState, value?: any) => void;

export interface EnvLoaderOptions {
  parseHook?: ParsingHookFunction;
  /**
   * Avoid leaking secrets and password values
   * @default true
   */
  redact?: boolean;
  prefix?: string;
}

export interface EnvLoaderParsingOptions {
  env?: NodeJS.ProcessEnv;
  prefix?: string;
}

export class EnvLoader {
  private parseHook: ParsingHookFunction;
  private prefix: string | undefined;

  constructor(
    options: EnvLoaderOptions = {}
  ) {
    const {
      parseHook = kNoopParsingHook,
      prefix
    } = options;

    this.parseHook = parseHook;
    this.prefix = prefix;
  }

  unsafeParse<T extends AllEnvTypeDescriptor>(
    name: string,
    descriptor: T,
    options: EnvLoaderParsingOptions = {}
  ): ExtractDescriptorType<T> {
    return this.parse(name, descriptor, options).unwrap();
  }

  parse<T extends AllEnvTypeDescriptor>(
    name: string,
    descriptor: T,
    options: EnvLoaderParsingOptions = {}
  ): Result<ExtractDescriptorType<T>, SafeEnvNotFound | SafeUnknowEnvType> {
    const {
      env = process.env,
      prefix = this.prefix
    } = options;

    const finalizedName = prefix && name.startsWith(prefix) ?
      name : `${prefix}${name}`;
    const rawEnv = env[finalizedName];

    if (typeof rawEnv === "undefined") {
      this.parseHook(finalizedName, "notFound");

      return Err(EnvNotFound.create(finalizedName));
    }

    const parsingResult = match(descriptor.type)
      .with(ENV_STRING, () => this.#parseString(rawEnv, descriptor.parameters))
      .with(ENV_BOOLEAN, () => this.#parseBoolean(rawEnv))
      .with(ENV_NUMBER, () => this.#parseNumber(rawEnv))
      .otherwise(() => None);

    if (parsingResult.some) {
      const parsedValue = parsingResult.safeUnwrap();
      this.parseHook(
        finalizedName, "found", utils.redactEnv(finalizedName, parsedValue)
      );

      // TODO: not sure how to fix type here
      return Ok(parsedValue as any);
    }

    this.parseHook(
      finalizedName, "parsingError", utils.redactEnv(finalizedName, rawEnv)
    );

    return Err(UnknowEnvType.create());
  }

  #parseString(
    value: string,
    parameters: StringTypeParameters
  ) {
    const { format } = parameters;

    const trimedValue = value.trim();
    if (format && !format.test(trimedValue)) {
      return None;
    }

    return Some(trimedValue);
  }

  #parseBoolean(value: string) {
    return Some(/^(?:y|yes|true|1|on)$/i.test(value.trim()));
  }

  #parseNumber(value: string) {
    const castedValue = Number(value);

    return Number.isNaN(castedValue) ? None : Some(castedValue);
  }
}
