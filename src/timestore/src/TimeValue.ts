// Import Internal Dependencies
import { TimeStoreIdentifier } from "./index";

// CONSTANTS
const kTimeStoreValueSymbol = Symbol.for("TimeStoreValueUniqueRef");

export function createTimeStoreValue(
  value: TimeStoreIdentifier | [TimeStoreIdentifier, any],
  ttl?: number
) {
  return {
    value, ttl, [kTimeStoreValueSymbol]: true
  };
}
