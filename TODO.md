### TODO

**Features**

- functions params should be one object instead of multiple params:
  - applyIf: (req, params, data) -> applyIf: ({ req, params, data })
- allow status change in callback method:
  - e.g. return { data: newData, status: 408 }
- include routes via require in config
- standard error response data overrides
- command-line params: port, database folder (APIs for different projects)

**Dev tools**

- ES modules

**Fix**

- Cached responses vs message "No need to server restart."
- better error catching for callback function
