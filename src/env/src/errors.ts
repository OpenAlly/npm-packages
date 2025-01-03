declare const __brand: unique symbol;
type Brand<B> = { [__brand]: B };
type Branded<T, B> = T & Brand<B>;

function createBranded<T, B>(instance: T): T & Brand<B> {
  return instance as T & Brand<B>;
}

export class EnvNotFound extends Error {
  static create(envName: string): SafeEnvNotFound {
    return createBranded(new EnvNotFound(envName));
  }

  private constructor(envName: string) {
    super(`Unable to find and load '${envName}'.`);
  }
}
export type SafeEnvNotFound = Branded<EnvNotFound, "EnvNotFound">;

export class UnknowEnvType extends Error {
  static create(): SafeUnknowEnvType {
    return createBranded(new UnknowEnvType());
  }

  private constructor() {
    super(`Unknown Env type`);
  }
}
export type SafeUnknowEnvType = Branded<UnknowEnvType, "UnknowEnvType">;
