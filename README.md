# Simple mock server

Simple mock server is useful for simple rest API response mock-up. Just define couple of routes with response data and start server. Server will listen on default port 9933.

## How to use

### Minimal server configuration

Create server.js file:

```javascript
const smServer = require('simple-mock-server');

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
const smServer = require('simple-mock-server');

smServer({
  port: 9933,
  routes: './paths',
  database: 'db',
  encoding: 'utf8',
  prefix: '/api',
  cors: false,
  delay: {
    min: 150,
    max: 1800,
  },
  proxy: {
    server: 'http://localhost:7009',
  },
});
```

Then run with command:

```
node server.js
```

Server will listen on port 9933 (or according to your configuration).

### Routes file example

```javascript
module.exports = [
  {
    active: true,
    key: 'POSTS_ALL',
    path: '/posts',
    method: 'GET',
    status: '200',
    callback: (req, res, data) => {
      const date = new Date();
      const timestamp = date.getTime();
      return data.map((item) => {
        item._t = timestamp;
        return item;
      });
    },
  },
  {
    active: true,
    key: 'GET_CATALOG',
    path: '/catalog/:catalogname',
    method: 'GET',
    status: '200',
    applyIf: (pathname, req, context) => {
      return true;
    },
  },
];
```

## TODO

**Fix**

- cors option - if false, it takes not efect
- watch for changes

**Features**

- standard error response data overrides
- watch for changes
- comandline params: port, database folder (APIs for different projects)

**Develop**

- prettier
- ES modules
