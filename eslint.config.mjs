import { typescriptConfig } from "@openally/config.eslint";

export default [
  {
    ignores: [
      "src/**/coverage",
      "src/**/temp"
    ]
  },
  ...typescriptConfig()
];
