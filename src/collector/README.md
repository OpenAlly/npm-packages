<p align="center"><h1 align="center">
  Collector
</h1>

<p align="center">
  Collect timings and failures of synchronous and asynchronous operations
</p>

<p align="center">
  <a href="https://github.com/OpenAlly/npm-packages/src/collector">
    <img src="https://img.shields.io/github/package-json/v/OpenAlly/npm-packages/main/src/collector?style=for-the-badge&label=version" alt="npm version">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/LICENSE">
    <img src="https://img.shields.io/github/license/OpenAlly/npm-packages?style=for-the-badge" alt="license">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/collector">
    <img src="https://img.shields.io/npm/dw/@openally/collector?style=for-the-badge" alt="download">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages/tree/main/src/collector">
    <img src="https://img.shields.io/github/actions/workflow/status/OpenAlly/npm-packages/collector.yml?style=for-the-badge">
  </a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) v24 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i @openally/collector
# or
$ yarn add @openally/collector
```

## Usage example

Wrap any operation with `track()`. The result is returned untouched, errors are rethrown, and one stat is recorded either way.

```ts
import { StatsCollector } from "@openally/collector";

const collector = new StatsCollector();

const user = await collector.track("fetch-user", () => fetch(url));
const parsed = collector.track("parse", () => JSON.parse(raw));

console.log(collector.stats);
// {
//   startedAt: 1755820800000,
//   executionTime: 42.5,
//   operationCount: 2,
//   operations: [...],
//   errorCount: 0,
//   errors: []
// }
```

Use `phase()` to attribute a group of operations, and the `Phase` type parameter to constrain the allowed values:

```ts
type Phase = "tree-walk" | "tarball-scan" | "metadata-fetch";

const collector = new StatsCollector<Phase>();
const fetching = collector.phase("metadata-fetch");

await Promise.all(
  packages.map((name) => fetching(name, () => registry.metadata(name)))
);
```

The collector is an [Emitter](../emitt), so operations can be streamed as they settle:

```ts
collector.on("operation", (stat) => {
  console.log(`${stat.name} ${stat.status} in ${stat.executionTime}ms`);
});
```

## API

- [`StatsCollector`](./docs/StatsCollector.md) tracks synchronous and asynchronous operations, and collects their timings and failures.
  - [`OperationStat`](./docs/StatsCollector.md#operationstat) is the record produced for each tracked operation.
  - [`CollectedError`](./docs/StatsCollector.md#collectederror) is the normalized shape of a captured failure.

## License
MIT
