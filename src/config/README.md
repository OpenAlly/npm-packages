<p align="center"><h1 align="center">
  Config
</h1>

<p align="center">
  Reactive configuration loader with safe hot reload configuration upon <a href="https://json-schema.org/" target="_blank">JSON Schema</a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v20 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/config
# or
$ yarn add @openally/config
```

## Features

- Hot-reloading of configuration
- Reactive with observable key(s)
- Safe with [JSON Schema](https://json-schema.org/) validation
- Support [TOML](https://github.com/toml-lang/toml) as input (enable the parser when the file extension end with **.toml**)
- Read configuration with no extension that start with a dot (like `.nodesecurerc` for example).


## Usage example

Create a simple json file for your project

```json
{
  "loglevel": 5,
  "logsize": 4048,
  "login": "administrator"
}
```

Now, create a new Configuration instance and read it

```js
import { AsynchronousConfig } from "@openally/config";

const config = new AsynchronousConfig("./path/to/config.json");
await config.read();
console.log(cfg.get("loglevel")); // stdout: 5

// Observe (with an Observable Like) the update made to login property
config.observableOf("login").subscribe(console.log);
config.set("login", "admin");

// Payload getter will return a deepClone with all configuration properties
console.log(config.payload);

config.close();
```

> [!IMPORTANT]
> `config.json` should exists otherwise it will throw an Error. Look at `createOnNoEntry` option for more information !

## API

- [AsynchronousConfig](./docs/AsynchronousConfig.md)
- [SynchronousConfig](./docs/SynchronousConfig.md)

## License
MIT
