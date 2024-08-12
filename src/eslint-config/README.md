<p align="center"><h1 align="center">
  Eslint Config
</h1>

<div align="center">OpenAlly Node.js Eslint configuration (Work for both JavaScript and TypeScript projects).</div>

## Requirements
- [Node.js](https://nodejs.org/en/) v20 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i -D @openally/eslint-config
# or
$ yarn add @openally/eslint-config -D
```

## Usage

Create a `eslint.config.mjs` file in the root of your project and extend the `@openally/eslint-config` configuration.

### TypeScript
```js
// eslint.config.mjs
import { typescriptConfig } from "@openally/eslint-config";

export default typescriptConfig({
  // Your custom configuration
});
```

### JavaScript
```js
// eslint.config.mjs
import { ESLintConfig } from "@openally/eslint-config";

export default [
  ...ESLintConfig,
  // Your custom configuration
];
```

## License
MIT
