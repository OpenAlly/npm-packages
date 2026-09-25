export function errorCode(
  error: unknown
): string | undefined {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return undefined;
  }

  const { code } = error;

  return typeof code === "string" ? code : undefined;
}

export function isMissingError(
  error: unknown
): boolean {
  const code = errorCode(error);

  return code === "ENOENT" || code === "ENOTDIR";
}
