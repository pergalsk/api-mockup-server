# Simple mock server

Simple mock server is useful for simple rest API response mock-up. Just define couple of routes with response data and start server. Server will listen on default port 9933.

## How to use

### Minimal server configuration

Create server.js file:

```javascript
const smServer = require('simple-mock-server);

smServer({
  routes: [{ path: '/posts' }],
});
```

Then run with command:

```
node server.js
```

Now, when you try to GET http://localhost:9933/posts server will response with default status 200 and empty data. This simple scenario is useful just for checking that route is working fine.

Let's take a look on more useful server config options.

### More enhanced server configuration

Create server.js file:

```javascript
const smServer = require('simple-mock-server);

smServer({
  port: 9933,
  routes: './paths',
  database: 'db',
  encoding: 'utf8',
  prefix: '/api',
  cors: false,
  delay: {
    min: 150,
    max: 1800
  }
});
```

Then run with command:

```
node server.js
```

Server will listen on port 9933 (or according to your configuration).

## TODO

**Features**

- standard error response data overrides
- watch for changes
- comandline params: port, database folder (APIs for different projects)

**Develop**

- prettier
- ES modules
