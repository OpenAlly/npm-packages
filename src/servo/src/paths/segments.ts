export function joinPath(
  directory: string,
  name: string
): string {
  return directory === "" ? name : `${directory}/${name}`;
}

/** A leading dot alone is not an extension. */
export function hasExtension(
  path: string
): boolean {
  const name = path.slice(
    path.lastIndexOf("/") + 1
  );

  return name.lastIndexOf(".") > 0;
}

export function encodePath(
  path: string
): string {
  return path
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}
