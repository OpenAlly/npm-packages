// Import Third-party Dependencies
import { type Result } from "@openally/result";

// Import Internal Dependencies
import {
  SafeEnvNotFound,
  SafeUnknowEnvType
} from "./errors.js";
import { EnvLoader } from "./class/EnvLoader.class.js";
import {
  type EnvType,
  type EnvTypeDescriptor,
  type ExtractDescriptorSymbol,
  type ExtractDescriptorType,
  Types
} from "./types.js";

export interface PickOptions {
  env?: NodeJS.ProcessEnv;
}

export function pick<
  T extends EnvType = typeof Types.string
  >(
  name: string,
  descriptor: T = Types.string as T,
  options: PickOptions = {}
): Result<ExtractDescriptorType<T>, SafeEnvNotFound | SafeUnknowEnvType> {
  const finalizedDescriptor: EnvTypeDescriptor<ExtractDescriptorSymbol<T>> = typeof descriptor === "function" ?
    descriptor() :
    descriptor;

  return new EnvLoader()
    .parse(name, finalizedDescriptor, options);
}

export { Types };
