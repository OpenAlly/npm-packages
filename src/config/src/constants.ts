export const SYMBOLS = {
  schema: Symbol("schema"),
  payload: Symbol("payload")
} as const;

export const SUPPORTED_EXT = new Set([
  ".json",
  ".toml"
]);

export const DEFAULT_EXT = ".json";

export const DEFAULT_SCHEMA = {
  title: "Default config",
  type: "object",
  additionalProperties: true
};
