export function redactEnv(name: string, value: any) {
  return name.includes("secret") || name.includes("password") ?
    "** REDACTED **" :
    value;
}
