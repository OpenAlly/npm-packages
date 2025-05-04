// Import Internal Dependencies
import { ITimeStoreAddOptions } from "./index";

// CONSTANTS
export const TSV_SYMBOL = Symbol.for("TimeStoreValue");

export type tSvResponse<T = any> = {
  value: T;
  ttl: number | undefined;
  [TSV_SYMBOL]: boolean;
};

export function tSv<T = any>(
  options: ITimeStoreAddOptions = {}
) {
  const { ttl } = options;

  return (value: T): tSvResponse<T> => {
    return {
      value, ttl, [TSV_SYMBOL]: true
    };
  };
}
