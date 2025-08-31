### TODO

**Fix**

- make it more robust against wrong settings
  - e.g. avoid error when wrong routes file: TypeError: getAllRoutes(...).filter is not a function
- (node:22272) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
  (Use `node --trace-deprecation ...` to show where the warning was created)
- Cached responses vs message "No need to server restart."
- better error catching for callback function

**Features**

- functions params should be one object instead of multiple params:
  - applyIf: (req, params, data) -> applyIf: ({ req, params, data })
- mark sa mocked with
  - header: x-api-mockup-server: "mocked,conditional,proxy"
  - query param: ?__api-mockup=true
- allow status change in callback method:
  - e.g. return { data: newData, status: 408 }
- allow to amend proxied route data
- include routes via require in config
- standard error response data overrides
- command-line params: port, database folder (APIs for different projects)

**Dev tools**

- ES modules
