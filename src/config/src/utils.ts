// Import Third-party Dependencies
import { type ErrorObject } from "ajv";

export function formatAjvErrors(ajvErrors: ErrorObject[]) {
  if (!Array.isArray(ajvErrors)) {
    return "";
  }
  const stdout: string[] = [];
  for (const ajvError of ajvErrors) {
    const isProperty = ajvError.instancePath === "" ? "" : `property ${ajvError.instancePath} `;

    stdout.push(`${isProperty}${ajvError.message}\n`);
  }

  return stdout.join("");
}

export function limitObjectDepth<T = any>(
  obj: Record<string, any>,
  depth = 0
): T {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (depth === 0) {
    return Object.keys(obj) as T;
  }

  for (const [key, value] of Object.entries(obj)) {
    Reflect.set(obj, key, limitObjectDepth(value, depth - 1));
  }

  return obj as T;
}

/**
 * Get a value in a deep object
 *
 * @example
 * ```ts
 * const obj = { a: { b: { c: 1 } } };
 * const value = deepGet(obj, "a.b.c");
 * console.log(value); // 1
 * ```
 */
export function deepGet<T = any>(obj: Record<string, any>, path: string): T | null {
  const keys = path.split(".");
  let value = obj;
  for (const key of keys) {
    if (!Reflect.has(value, key)) {
      return null;
    }
    value = Reflect.get(value, key);
  }

  return value as T;
}

/**
 * Set a value in a deep object
 *
 * @example
 * ```ts
 * const obj = { a: { b: { c: 1 } } };
 * deepSet(obj, "a.b.c", 2);
 * console.log(obj); // { a: { b: { c: 2 } } }
 * ```
 */
export function deepSet<T extends Record<string, any>>(obj: T, path: string, value: any): T {
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  let current = obj;
  for (const key of keys) {
    if (!Reflect.has(current, key)) {
      Reflect.set(current, key, {});
    }
    current = Reflect.get(current, key);
  }

  Reflect.set(current, lastKey, value);

  return obj;
}
