// Import Third-party Dependencies
import stylisticPlugin from "@stylistic/eslint-plugin";
import globals from "globals";
import tsEslint, { ConfigWithExtends } from "typescript-eslint";
import * as tsParser from "@typescript-eslint/parser";
import { SourceType } from "@typescript-eslint/types";

// Import Internal Dependencies
import bestPractices from "./rules/best-practices.js";
import ecmascript6 from "./rules/ecmascript6.js";
import eslintv9 from "./rules/eslintv9.js";
import possibleErrors from "./rules/possible-errors.js";
import styles from "./rules/styles.js";
import variables from "./rules/variables.js";
import stylistic from "./rules/stylistic.js";
import typescript from "./rules/typescript.js";

const kLanguageOptions = {
  sourceType: "script",
  globals: {
    ...globals.node
  }
};
const kTypescriptLanguageOptions = {
  ...kLanguageOptions,
  sourceType: "module" as SourceType,
  parser: tsParser
};
const kRules: Record<string, any> = {
  ...bestPractices,
  ...possibleErrors,
  ...styles,
  ...ecmascript6,
  ...eslintv9,
  ...variables,
  ...stylistic
};
const kBaseTypeScriptConfigs: ConfigWithExtends[] = [
  {
    plugins: {
      "@stylistic": stylisticPlugin
    },
    rules: {
      ...kRules,
      ...typescript as any,
      "no-undef": "off",
      "no-redeclare": "off"
    },
    languageOptions: kTypescriptLanguageOptions,
    files: ["**/*.ts"]
  },
  {
    ignores: [
      "**/*.d.ts",
      "**/dist"
    ]
  }
];

export const ESLintConfig = [{
  plugins: {
    "@stylistic": stylisticPlugin
  },
  rules: kRules,
  languageOptions: kLanguageOptions
}];

export function typescriptConfig(config?: ConfigWithExtends) {
  if (config) {
    return tsEslint.config(...kBaseTypeScriptConfigs, config);
  }

  return tsEslint.config(...kBaseTypeScriptConfigs);
}
