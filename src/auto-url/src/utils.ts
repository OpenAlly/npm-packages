export function stringifyValue(value: any): string {
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

export function isIterable<T>(obj: any): obj is Iterable<T> {
  // eslint-disable-next-line no-eq-null
  return obj == null ? false : typeof obj[Symbol.iterator] === "function";
}
