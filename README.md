<p align="center">
<img width="500" src="https://user-images.githubusercontent.com/4438263/196032102-1d43ad83-48ac-4cd3-82ca-3fd197313430.png" alt="openally">
</p>

<p align="center"><h1 align="center">
  NPM Packages
</h1>

<p align="center">
  OpenAlly monorepo to store common organization npm packages
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) version 16 or higher
- npm v7+ for [workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

## Available packages

Click on one of the links to access the documentation of the package:

| name | package and link |
| --- | --- |
| timestore | [@openally/timestore](./src/timestore/README.md) |

These packages are available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).
```bash
$ npm i @openally/timestore
# or
$ yarn add @openally/timestore
```

## Build

To install and compile all workspaces, just run the following command at the root

```bash
$ npm ci
$ npm run build
```
