// Import Internal Dependencies
import * as utils from "./utils.js";

export type autoURLTransformCallback = (value: string) => string;
export type autoURLTransformConfig<T extends string> = Record<T, autoURLTransformCallback>;

export function autoURL<T extends string>(
  source: string | URL,
  payload?: Record<T, any> | Iterable<[T, any]>,
  transformersConfig: autoURLTransformConfig<T> = Object.create(null)
): URL {
  if (!source) {
    throw new Error(`source argument must be provided`);
  }

  const clonedURL = new URL(source);
  const entries = utils.isIterable<[T, any]>(payload) ?
    payload :
    Object.entries(payload ?? {}) as [T, any];

  for (const [key, value] of entries) {
    const stringifiedValue = utils.stringifyValue(value);

    if (key in transformersConfig) {
      const transform = transformersConfig[key];
      clonedURL.searchParams.set(key, transform(stringifiedValue));
    }
    else {
      clonedURL.searchParams.set(key, stringifiedValue);
    }
  }

  return clonedURL;
}

export default autoURL;
