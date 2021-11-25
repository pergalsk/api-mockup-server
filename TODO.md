### TODO

**Features**

- include routes via require in config
- custom prefix per route - override the global prefix
- standard error response data overrides
- watch for changes routes/server
- command-line params: port, database folder (APIs for different projects)

**Dev tools**

- ES modules

**Fix**

- x-www-form-urlencoded issue: https://github.com/chimurai/http-proxy-middleware/issues/320
- Use of "Response potentially modified." message is senseless.
- Cached responses vs message "No need to server restart."
- better error catching for callback function
