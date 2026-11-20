# @openally/servo

## 1.2.0

### Minor Changes

- [#347](https://github.com/OpenAlly/npm-packages/pull/347) [`8707237`](https://github.com/OpenAlly/npm-packages/commit/870723794f263d92fd6b9b0b34fdab2fc41b9ae0) Thanks [@fraxken](https://github.com/fraxken)! - Faster file serving, safer path handling, and new helpers.
  
  - Files are served faster, especially small files and missing ones.
  - Path and file lookups are stricter, closing a few ways to reach files that should stay hidden.
  - Precompressed files respect the client's encoding preferences more accurately.
  - Helpers that were previously internal are now exported, and a few new cache and content-type options are available.

## 1.1.0

### Minor Changes

- [#334](https://github.com/OpenAlly/npm-packages/pull/334) [`0895076`](https://github.com/OpenAlly/npm-packages/commit/0895076995a0709dc96e165f731931187f3c8cd8) Thanks [@fraxken](https://github.com/fraxken)! - Add a browser-safe `@openally/servo/paths` entry exporting `safePath`, `normalizePosix`, `isDotfilePath`, `decodeRequestPath` and the `SafePath` and `PathRejection` types without reaching any `node:` module.
