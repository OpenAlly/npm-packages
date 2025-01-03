
// CONSTANTS
export const ENV_STRING: unique symbol = Symbol("env.type.string");
export const ENV_BOOLEAN: unique symbol = Symbol("env.type.boolean");
export const ENV_NUMBER: unique symbol = Symbol("env.type.number");

export type AllEnvTypes = {
  [ENV_STRING]: string;
  [ENV_BOOLEAN]: boolean;
  [ENV_NUMBER]: number;
};

export type EnvTypeDescriptor<
  U extends symbol,
  P extends Record<string, any> = Record<string, any>
> = {
  type: U;
  parameters: P;
}
export type AllEnvTypeDescriptor = {
  [K in keyof AllEnvTypes]: EnvTypeDescriptor<K>;
}[keyof AllEnvTypes];

export type EnvType =
  ((parameters?: any) => EnvTypeDescriptor<any>) |
  EnvTypeDescriptor<any>;

export type ExtractPrimitiveType<T> =
  T extends keyof AllEnvTypes ? AllEnvTypes[T] :
  never;

export type ExtractDescriptorSymbol<T> =
  T extends () => EnvTypeDescriptor<infer U> ?
    U :
  T extends EnvTypeDescriptor<infer U> ?
    U :
  never;

export type ExtractDescriptorType<T> = ExtractPrimitiveType<ExtractDescriptorSymbol<T>>;

export type StringTypeParameters = {
  format?: RegExp;
}

export const Types = {
  string(
    parameters: StringTypeParameters = {}
  ): EnvTypeDescriptor<typeof ENV_STRING, StringTypeParameters> {
    return {
      type: ENV_STRING,
      parameters
    };
  },
  boolean(): EnvTypeDescriptor<typeof ENV_BOOLEAN> {
    return {
      type: ENV_BOOLEAN,
      parameters: {}
    };
  },
  number(): EnvTypeDescriptor<typeof ENV_NUMBER> {
    return {
      type: ENV_NUMBER,
      parameters: {}
    };
  }
} satisfies Record<string, () => EnvTypeDescriptor<symbol>>;
