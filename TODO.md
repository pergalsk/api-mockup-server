### TODO

**Fix**

- make it more robust against wrong settings
  - e.g. avoid error when wrong routes file: TypeError: getAllRoutes(...).filter is not a function
- (node:22272) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
  (Use `node --trace-deprecation ...` to show where the warning was created)

**Features**

- on/off mocking switch
- better route list colors
- add cond to header (applyIf)
- custom route database
  - { database: './custom/folder' }
- better readme file - make examples more compatible to each other
- include routes via require in config
- command-line params: port, database folder (APIs for different projects)

**Dev**

- ES modules
- tests
