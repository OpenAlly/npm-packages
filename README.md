<p align="center">
<img width="500" src="https://user-images.githubusercontent.com/4438263/196032102-1d43ad83-48ac-4cd3-82ca-3fd197313430.png" alt="openally">
</p>

<p align="center">
  <h1 align="center">NPM Packages</h1>
</p>

<p align="center">
  OpenAlly monorepo to store common organization npm packages
</p>

<p align="center">
  <a href="https://github.com/OpenAlly/npm-packages">
    <img src="https://img.shields.io/github/license/OpenAlly/npm-packages?style=for-the-badge" alt="license">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages">
    <img src="https://img.shields.io/maintenance/yes/2023?style=for-the-badge" alt="maintained">
  </a>
  <a href="https://api.securityscorecards.dev/projects/github.com/OpenAlly/npm-packages">
    <img src="https://api.securityscorecards.dev/projects/github.com/OpenAlly/npm-packages/badge?style=for-the-badge" alt="ossf scorecard">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages">
    <img src="https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript" alt="typescript">
  </a>
  <a href="https://github.com/OpenAlly/npm-packages">
    <img src="https://img.shields.io/static/v1?&label=module&message=ESM%20and%20CJS&color=9cf&style=for-the-badge" alt="esm-cjs">
  </a>
</p>

## Requirements
- [Node.js](https://nodejs.org/en/) version 16 or higher
- npm v7+ for [workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)

## Available packages

Click on one of the links to access the documentation of the package:

| name | package and link |
| --- | --- |
| timestore | [@openally/timestore](./src/timestore) |
| ephemeral-map | [@openally/ephemeral-map](./src/ephemeral-map) |
| mutex | [@openally/mutex](./src/mutex) |
| result | [@openally/result](./src/result) |

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

## Test
Running test with npm workspace:

```bash
$ npm run test -w <workspace>
```

## Publishing package
Each packages has his own `prepublishOnly` to build TypeScript source before publishing.

```bash
$ npm publish -w <workspace>
```

## Contributors ✨

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/thomas-gentilhomme/"><img src="https://avatars.githubusercontent.com/u/4438263?v=4?s=100" width="100px;" alt="Gentilhomme"/><br /><sub><b>Gentilhomme</b></sub></a><br /><a href="https://github.com/OpenAlly/npm-packages/commits?author=fraxken" title="Code">💻</a> <a href="https://github.com/OpenAlly/npm-packages/commits?author=fraxken" title="Documentation">📖</a> <a href="https://github.com/OpenAlly/npm-packages/issues?q=author%3Afraxken" title="Bug reports">🐛</a> <a href="https://github.com/OpenAlly/npm-packages/commits?author=fraxken" title="Tests">⚠️</a> <a href="#security-fraxken" title="Security">🛡️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Dafyh"><img src="https://avatars.githubusercontent.com/u/47780300?v=4?s=100" width="100px;" alt="Dafyh"/><br /><sub><b>Dafyh</b></sub></a><br /><a href="https://github.com/OpenAlly/npm-packages/commits?author=Dafyh" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://sofiand.github.io/portfolio-client/"><img src="https://avatars.githubusercontent.com/u/39944043?v=4?s=100" width="100px;" alt="Yefis"/><br /><sub><b>Yefis</b></sub></a><br /><a href="https://github.com/OpenAlly/npm-packages/commits?author=SofianD" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License
MIT
