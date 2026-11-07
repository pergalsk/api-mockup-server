### TODO

Open work is tracked in [GitHub issues](https://github.com/pergalsk/api-mockup-server/issues).
Done work is listed in [CHANGELOG.md](CHANGELOG.md).

**Release**

- release 5.0.0 to npm (#5)

**Fix**

- flaky test: 'listens on the new port' (ECONNREFUSED, probably free port race between test files)
- replace deprecated Node.js `querystring` (lib/proxy.js)

**Features**

- generate TypeScript types from JSDoc (#47)
- more detailed mock response header value (proxy, static, dynamic, file, inline, delay) (lib/proxy.js)

**Ideas (need planning)**

- record mode: save real proxy responses into database files (mocks without writing JSON by hand)
- import routes from OpenAPI spec
- request log or simple web UI
