# Mock server APP

## How to use

Create server.js file:

```
const smServer = require('simple-mock-server);

smServer({
  port: 9933,
  routesPath: './paths',
  databasePath: 'db',
  encoding: 'utf8',
  prefix: '/api',
  cors: true,
  delayInterval: {
    min: 10, 
    max: 90
  }
});
```
Then run with command:

```
node server
```
Server will listen on port 9933 (or according to your configuration).

## TODO

**Features**

* standard error response data overrides
* watch for changes
* comandline params: port, database folder (APIs for different projects)

**Develop**

* prettier
* ES modules
