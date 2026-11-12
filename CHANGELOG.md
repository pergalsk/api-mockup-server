# Changelog

All notable changes to this project are listed here.
Format is based on [Keep a Changelog](https://keepachangelog.com/), versions follow [Semantic Versioning](https://semver.org/).

## [5.0.0] - Unreleased

### Breaking changes

- Package is now ES modules (`"type": "module"`). Minimum Node.js version is 24.15. CommonJS `require()` still works (Node 24 can require ES modules). Node 24.15 is needed by the `@inquirer/select` prompt ([#70](https://github.com/pergalsk/api-mockup-server/issues/70)). ([#2](https://github.com/pergalsk/api-mockup-server/issues/2), [#4](https://github.com/pergalsk/api-mockup-server/issues/4))
- `apiMockupServer()` now returns a Promise with a server handle `{ port, url, close() }`. ([#46](https://github.com/pergalsk/api-mockup-server/issues/46))
- Library code no longer calls `process.exit`. Port in use at start rejects the Promise (`EADDRINUSE`). Only the CLI exits. ([#46](https://github.com/pergalsk/api-mockup-server/issues/46))
- Route with an invalid `status` (not a number 100-999) logs a warning and is not registered. Before, it crashed on each request. ([#59](https://github.com/pergalsk/api-mockup-server/issues/59))
- Proxy log line now shows the full target URL and status, e.g. `GET /api/x -> http://host/api/x [200]`. ([#16](https://github.com/pergalsk/api-mockup-server/issues/16))

### Added

- Proxy target prompt has an `Exit` option. Exit or Ctrl+C quits the CLI quietly; library `apiMockupServer()` rejects with error code `PROMPT_EXIT`. ([#70](https://github.com/pergalsk/api-mockup-server/issues/70))
- Command line tool `api-mockup-server` with options for config file, port, routes, database, prefix and proxy. JS/JSON config file with hot reload. Priority: flag > config > default. ([#42](https://github.com/pergalsk/api-mockup-server/issues/42))
- Server handle for tests: `port: 0` (random free port), `close()` stops server, watchers and shortcuts. New options `interactive` and `silent`. README section "Use in tests". ([#46](https://github.com/pergalsk/api-mockup-server/issues/46))
- Route options `headers`, `contentType` and `file`; global `headers` server option (route wins). Status 204/304 sends no body. ([#45](https://github.com/pergalsk/api-mockup-server/issues/45))
- Non-JSON files in the database folder by key (`KEY.txt`, `KEY.jpg`, ...). `KEY.json` still wins. ([#45](https://github.com/pergalsk/api-mockup-server/issues/45))
- ESM routes file support (`export default`), with hot reload. ([#13](https://github.com/pergalsk/api-mockup-server/issues/13), [#19](https://github.com/pergalsk/api-mockup-server/issues/19))
- Proxy targets can be objects with a `title`. ([#35](https://github.com/pergalsk/api-mockup-server/issues/35))
- Warnings when the routes file or option is wrong (not found, folder, load error, not an array, wrong type). Server keeps running. ([#41](https://github.com/pergalsk/api-mockup-server/issues/41))
- Examples: basic, extended, proxy and cjs, with richer data sets. ([#22](https://github.com/pergalsk/api-mockup-server/issues/22), [#34](https://github.com/pergalsk/api-mockup-server/issues/34))
- Automated tests (`node:test`) and GitHub CI (lint, tests, audit, pack check). ([#23](https://github.com/pergalsk/api-mockup-server/issues/23), [#37](https://github.com/pergalsk/api-mockup-server/issues/37))

### Fixed

- Server restarts when the routes file is added after start; new file right after start is no longer missed. ([#14](https://github.com/pergalsk/api-mockup-server/issues/14), [#31](https://github.com/pergalsk/api-mockup-server/issues/31), [#53](https://github.com/pergalsk/api-mockup-server/issues/53))
- Proxy interceptor callback gets the matched route params. ([#25](https://github.com/pergalsk/api-mockup-server/issues/25))
- No crash after choosing a proxy target when stdout is not a TTY. ([#26](https://github.com/pergalsk/api-mockup-server/issues/26))
- No `DEP0060 util._extend` warning when proxying (`http-proxy-middleware` upgraded to v4). ([#16](https://github.com/pergalsk/api-mockup-server/issues/16))
- No Express deprecation warning for a string `status` (e.g. `'201'`). ([#59](https://github.com/pergalsk/api-mockup-server/issues/59))
- Warning "served with empty response" shows the route path instead of `%path%`. ([#58](https://github.com/pergalsk/api-mockup-server/issues/58))

### Changed

- ESLint 9 with flat config. ([#8](https://github.com/pergalsk/api-mockup-server/issues/8))
- Removed unused `readline` package and `watchSimple` function. ([#1](https://github.com/pergalsk/api-mockup-server/issues/1), [#15](https://github.com/pergalsk/api-mockup-server/issues/15))
- Updated `cors` and `globals`; `npm audit` is clean. ([#17](https://github.com/pergalsk/api-mockup-server/issues/17))
- README reviewed against the code; examples renamed `amServer` to `apiMockupServer`. ([#43](https://github.com/pergalsk/api-mockup-server/issues/43), [#44](https://github.com/pergalsk/api-mockup-server/issues/44), [#52](https://github.com/pergalsk/api-mockup-server/issues/52))

## [4.1.0] - 2026-02-23

### Changed

- Smaller logging improvements and fixes (messages and layout).
- Docs update.

## [4.0.0] - 2025-10-19

### Added

- CLI keyboard shortcuts (simplified later in this version).
- Suspend mocking (pass all requests to proxy).
- Routes list is logged also when mocking is suspended.
- App title with version.
- Proxy interceptor route definitions.
- Custom header on all handled routes.

### Changed

- New visual identity and better log messages.
- Removed packages `body-parser`, `lodash`, `date-fns`; updated `chokidar`, `path-to-regexp`, `http-proxy-middleware`, `inquirer`.
- Route matching uses `req.originalUrl`.

### Fixed

- WebSockets after server restart; proper server restart.
- Wrong REST calls when `applyIf` is used; `applyIf` no longer called twice.
- Error handling in interceptors.
- CLI shortcuts position on `EADDRINUSE` error.

## [3.2.0] - 2025-08-24

### Added

- Automatic server reload when the config is changed.
- Route `prefix` option.

### Changed

- `callback` and `applyIf` get one object parameter (`{ params, query, body, req }`).

## [3.1.2] - 2021-12-12

### Changed

- Updated dependencies.

## [3.1.1] - 2021-12-03

### Changed

- README updates.

## [3.1.0] - 2021-11-28

### Added

- POST/PUT body data available in `applyIf`.

### Changed

- Better logging of callback calls; missing route status shown as a number.

### Fixed

- `x-www-form-urlencoded` request body.
- Typos in docs and messages.

## [3.0.1] - 2021-11-15

### Fixed

- README example JSON.

## [3.0.0] - 2021-11-14

### Changed

- Project renamed to `api-mockup-server`.
- Better watcher messages (different for database and routes changes).
- Big README update.

## [2.4.1] - 2021-09-20

### Fixed

- Empty JSON response file is served as an empty response; better log for wrong JSON.
- Route without `method` defaults to GET instead of being proxied.

## [2.4.0] - 2021-09-19

### Added

- Choose from several proxy targets in an interactive CLI prompt (or no proxy).
- Route `callback` gets data returned from the proxy call.

### Changed

- Logging improvements.

## [2.3.0] - 2021-09-16

### Added

- Path params in `applyIf` (conditional proxying by params).

## [2.2.0] - 2021-09-15

### Changed

- Visually improved logging; logger for `http-proxy-middleware`.

## [2.1.0] - 2021-09-13

### Added

- Extended logging of registered routes.

## [2.0.3] - 2021-09-13

### Fixed

- POST request body parsing.

## [2.0.1] - 2021-09-12

### Fixed

- Middleware order; prefix applied to proxy route matching.
- Doubled warning about missing route definitions.

## [2.0.0] - 2021-09-06

### Added

- HTTP proxy for routes that are not mocked.

### Fixed

- CORS: no CORS middleware when the option is `false`.

## [1.1.0] - 2021-05-20

### Added

- Async route `callback`.
- Fetch data from an external resource and combine it with mocked data.

## [1.0.0] - 2021-05-11

### Added

- Watching of routes file and database folder.
- Colored log service, better options and warnings.

[5.0.0]: https://github.com/pergalsk/api-mockup-server/compare/v4.1.0...main
[4.1.0]: https://github.com/pergalsk/api-mockup-server/compare/v4.0.0...v4.1.0
[4.0.0]: https://github.com/pergalsk/api-mockup-server/compare/v3.2.0...v4.0.0
[3.2.0]: https://github.com/pergalsk/api-mockup-server/compare/v3.1.2...v3.2.0
[3.1.2]: https://github.com/pergalsk/api-mockup-server/compare/v3.1.1...v3.1.2
[3.1.1]: https://github.com/pergalsk/api-mockup-server/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/pergalsk/api-mockup-server/compare/v3.0.1...v3.1.0
[3.0.1]: https://github.com/pergalsk/api-mockup-server/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/pergalsk/api-mockup-server/compare/v2.4.1...v3.0.0
[2.4.1]: https://github.com/pergalsk/api-mockup-server/compare/v2.4.0...v2.4.1
[2.4.0]: https://github.com/pergalsk/api-mockup-server/compare/v2.3.1...v2.4.0
[2.3.0]: https://github.com/pergalsk/api-mockup-server/compare/v2.2.1...v2.3.0
[2.2.0]: https://github.com/pergalsk/api-mockup-server/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/pergalsk/api-mockup-server/compare/v2.0.3...v2.1.0
[2.0.3]: https://github.com/pergalsk/api-mockup-server/compare/v2.0.1...v2.0.3
[2.0.1]: https://github.com/pergalsk/api-mockup-server/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/pergalsk/api-mockup-server/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/pergalsk/api-mockup-server/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/pergalsk/api-mockup-server/releases/tag/v1.0.0
