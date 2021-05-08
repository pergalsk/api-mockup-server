# Mock server APP

## How to use

Create server.js file:

```
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
