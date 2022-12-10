// Import Internal Dependencies
import { TimeStoreIdentifier, ITimeStoreAddOptions } from "./index";

// CONSTANTS
export const TSV_SYMBOL = Symbol.for("TimeStoreValue");

export type tSvIdentifier<T = any> = TimeStoreIdentifier | [TimeStoreIdentifier, T];
export type tSvResponse<T = any> = {
  value: tSvIdentifier<T>;
  ttl: number | undefined;
  [TSV_SYMBOL]: boolean;
}

export function tSv<T = any>(
  options: ITimeStoreAddOptions = {}
) {
  const { ttl } = options;

  return (value: tSvIdentifier<T>): tSvResponse<T> => {
    return {
      value, ttl, [TSV_SYMBOL]: true
    };
  };
}
