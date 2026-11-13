# API Mockup Server

[![CI](https://github.com/pergalsk/api-mockup-server/actions/workflows/ci.yml/badge.svg)](https://github.com/pergalsk/api-mockup-server/actions/workflows/ci.yml)

Node server for simple rest API mockup with JSON format responses. Just define couple of routes with response data and start the server. Server will listen on default port 9933.

API Mockup Server may be useful during application development when for example back-end part is not ready yet and you want to work separately on front-end with mocked data, or you have a fully functional back-end part but you want to mockup only some of your rest APIs in order to simulate a problematic situation, bugs, edge cases, error responses, etc...

## Installation

```
npm install api-mockup-server --save
```

Requires Node.js 24.15+.

The package can be loaded with both `require` and `import`:

```javascript
// CommonJS
const apiMockupServer = require('api-mockup-server');

// ES modules
import apiMockupServer from 'api-mockup-server';
```

Examples in this README use ES modules, the same as the [examples](./examples) folder. Add `"type": "module"` to your `package.json`:

```
npm pkg set type=module
```

For CommonJS use `require` and `module.exports` - see the [cjs example](./examples/cjs).

## Quick start

Create `server.js` file:

```javascript
// server.js

// load API Mockup Server
import apiMockupServer from 'api-mockup-server';

// define some routes
const routes = [
  {
    active: true,
    path: '/books/all',
    method: 'GET',
    status: 200,
    data: [
      { id: 10, title: 'Robinson Crusoe' },
      { id: 20, title: 'Don Quixote' },
    ],
  },
  {
    active: true,
    path: '/books/:id',
    method: 'GET',
    status: 200,
    data: {
      id: 10,
      title: 'Robinson Crusoe',
      author: 'Daniel Defoe',
      pages: 250,
    },
  },
  {
    active: true,
    path: '/authors',
    method: 'POST',
    status: 400,
    data: {
      errorMsg: 'Author name is too long!',
    },
  },
];

// start the server
apiMockupServer({
  port: 9933,
  prefix: '/api',
  routes,
});
```

Then run with command:

```
node server.js
```

Now, you can make 3 requests:

- GET http://localhost:9933/api/books/all - server will response with HTTP status 200 and return static data with books list
- GET http://localhost:9933/api/books/7 - server will response with HTTP status 200 and return static data with book detail _(regardless of provided id, in this case 7)_
- POST http://localhost:9933/api/authors - server will response with HTTP status 400 and return static data with error message _(regardless of provided POST request data)_

More runnable examples are in the [examples](./examples) folder:

- [basic](./examples/basic) - inline routes (this quick start)
- [extended](./examples/extended) - routes file, data files, callbacks, delay, hot reload
- [proxy](./examples/proxy) - proxy targets list, mocked routes, proxy route interceptors
- [cjs](./examples/cjs) - the basic example in CommonJS

## Advanced server configuration

In bigger projects you don't want to store all of your routes and responses in one file. You can configure routes in separate file using `routes` param and responses in `database` param providing path to folder containing JSON files with response data.

If you want to mockup only some of rest APIs you can use API Mockup Server as a mockup layer between your running back-end server and frontend application. In this scenario you have to configure proxy server target with running back-end. If you use more than one target, API Mockup Server will ask you to choose one target via CLI interface on server start. The list also includes `Without proxy` and `Exit` options (Ctrl+C also exits).

Note 1: You don't have to restart the server when you make changes in data files or in routes file. API Mockup Server will automatically reflect new configuration while running. Hot reload of routes works only when `routes` is a file path. If `routes` is an inline array, you have to restart the server.

Note 2: Server will add `x-api-mockup-server` header to all mocked/proxied responses with some metadata. You can turn it off by setting `mockHeader: false` in server options.

```
FILE STRUCTURE:

/db                        <- database directory
  /BOOKS_ALL.json          <- response data file (all statuses)
  /BOOK_DETAIL.json        <- response data file (statuses !== 400)
  /BOOK_DETAIL.400.json    <- response data file (HTTP status 400)
routes.js                  <- routes definitions
server.js                  <- main server file
```

Main file with server configuration `./server.js`:

```javascript
// server.js
import apiMockupServer from 'api-mockup-server';

apiMockupServer({
  port: 9933,
  routes: './routes.js', // path to file with routes
  database: './db', // path to directory with data files
  prefix: '/api/v1',
  encoding: 'utf8',
  delay: {
    min: 500, // delay mocked responses in milliseconds
    max: 2500,
  },
  proxy: {
    server: 'https://another.server.example',
  },
});
```

In routes configuration you can instead of `data` param define `key` param which is used to find corresponding JSON file with response data.

Add `./routes.js` file in the same directory:

```javascript
// routes.js
export default [
  {
    active: true,
    key: 'BOOKS_ALL', // response data file: ./db/BOOKS_ALL.json
    path: '/books/all',
    method: 'GET',
    status: 200,
    callback: ({ params, query, body, data, req }) => {
      // modify data
      const date = new Date();
      const timestamp = date.getTime();

      const newData = data.map((item) => {
        item._t = timestamp;
        return item;
      });
      // return modified data
      return newData;
    },
  },
  {
    active: true,
    key: 'BOOK_DETAIL', // response data file: ./db/BOOK_DETAIL.json
    prefix: '/api/v2',
    path: '/books/:id',
    method: 'GET',
    status: 200,
    applyIf: ({ params, query, body, req }) => {
      // conditionally mocked if request URL param id = 10
      // e.g.: /api/v2/books/10
      return params.id === '10';
    },
  },
];
```

According to used route keys you need to create corresponding files in database folder. If file is missing, route will have empty response.

Add `./db/BOOKS_ALL.json` file:

```json
[
  { "id": 10, "title": "Robinson Crusoe" },
  { "id": 20, "title": "Don Quixote" }
]
```

Add `./db/BOOK_DETAIL.json` file:

```json
{
  "id": 10,
  "title": "Robinson Crusoe",
  "author": "Daniel Defoe",
  "pages": 250
}
```

Add `./db/BOOK_DETAIL.400.json` file:

```json
{
  "errorCode": 15,
  "errorMsg": "Book ID has wrong format."
}
```

Then run with command:

```
node server.js
```

Server will listen on port 9933 (according to your configuration).

## Server configuration options

```javascript
import apiMockupServer from 'api-mockup-server';

const serverConfigOptions = {
  // configuration properties are defined in the table below
};

apiMockupServer(serverConfigOptions);
```

<table>
  <tr><th>Parameter</th><th>Type</th><th>Description</th><th>Default</th></tr>
  <tr>
    <td><b>port</b><br><small><em>(optional)</em></small></td>
    <td><code>number</code></td>
    <td>The port on which mock server will listen. Use <code>0</code> for a random free port (see <a href="#use-in-tests">Use in tests</a>).</td>
    <td><code>9933</code></td>
  </tr>
  <tr>
    <td><b>interactive</b><br><small><em>(optional)</em></small></td>
    <td><code>boolean</code></td>
    <td>Set to <code>false</code> to turn off <a href="#cli-shortcuts">keyboard shortcuts</a> and the proxy target prompt (the first target from the list is used). Shortcuts are also off when no terminal (TTY) is attached.</td>
    <td><code>true</code></td>
  </tr>
  <tr>
    <td><b>silent</b><br><small><em>(optional)</em></small></td>
    <td><code>boolean</code></td>
    <td>Set to <code>true</code> to turn off all console logs.</td>
    <td><code>false</code></td>
  </tr>
  <tr>
    <td><b>database</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>Directory name or path to directory in which are stored JSON data files with responses.<br>Example: <code>"./db"</code>
    </td>
    <td><code>"database"</code></td>
  </tr>
  <tr>
    <td><b>prefix</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>Api route prefix. <br>Example: <code>"/api/v1"</code></td>
    <td><code>""</code></td>
  </tr>
  <tr>
    <td><b>encoding</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>Response text encoding.</td>
    <td><code>"utf8"</code></td>
  </tr>
  <tr>
    <td><b>cors</b><br><em><small>(optional)</small></em></td>
    <td><code>boolean</code></td>
    <td>
      <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS">Cross-Origin Resource Sharing</a> policy.
      <br>Set to <code>false</code> if you don't want it.
    </td>
    <td><code>true</code></td>
  </tr>
  <tr>
    <td><b>delay</b><br><small><em>(optional)</em></small></td>
    <td><code>Object</code></td>
    <td>Mocked response delay. Random delay will be generated between <code>min</code> and <code>max</code> values in milliseconds. If not set response will be served without additional delay.
      <br>Example: <code>{ min: 500, max: 2500 }</code>
      <p>
        <br>If you want to define exact response time set <code>min</code> and <code>max</code> params to the same value.
        <br>Example: <code>{ min: 1000, max: 1000 }</code>
      </p>
    </td>
    <td><code>{ min: 0, max: 0}</code></td>
  </tr>
  <tr>
    <td><b>mockHeader</b><br><em><small>(optional)</small></em></td>
    <td><code>boolean</code></td>
    <td>
      Server will add <code>x-api-mockup-server</code> header to all responses which are handled by API Mockup Server. Header value will contain some metadata about the configuration of the route.
      <br><br>Example: <code>x-api-mockup-server: mocked,file,dynamic,500ms</code>.
      <br><br>Set option to <code>false</code> to turn off this behavior.
    </td>
    <td><code>true</code></td>
  </tr>
  <tr>
    <td><b>routes</b><br><small><em>(optional)</em></small></td>
    <td><code>string | Array</code></td>
    <td>
      Definitions of API routes. It could be array or path to definition file. For more info about how routes should be configured look into <a href="#routes-configuration-options">routes options below.</a>
      <br>Example: <code>"./routes.js"</code>
      <br>Example: 
<pre>
[
  {
    active: true,
    path: '/movies',
    method: 'GET',
    status: 200,
    key: 'MOVIES_ALL'
  },
  {
    active: false,
    path: '/movies/:movieId',
    method: 'DELETE',
    status: 400,
    key: 'DELETE_MOVIE'
  }
]
</pre>
    </td>
    <td><code>[]</code></td>
  </tr>

  <tr>
    <td><b>proxy</b><br><small><em>(optional)</em></small></td>
    <td><code>Object</code></td>
    <td>Proxy server configuration. Undefined or not active routes will be redirected to proxy target. If server is defined as an array, on the start the interactive CLI will ask you to choose from given list of server addresses. The list also includes <code>Without proxy</code> and <code>Exit</code> options.
      <br>Target can be a string (URL) or an object with <code>url</code> (required) and <code>title</code> (optional). Strings and objects can be mixed in one array. Target with title is shown as <code>title - url</code> in CLI list and config output. Invalid target (no <code>url</code> or <code>url</code> is not a string) is skipped with a warning.
      <br>Examples: 
<pre>{ 
  server: "http://localhost:3000"
}</pre>
<pre>{ 
  server: { title: 'Integration', url: 'http://it.server.example' }
}</pre>
<pre>
{
  server: [
    'http://localhost:3000',
    'http://api.server.example',
    { title: 'Integration', url: 'http://it.server.example' }
  ]
}
</pre>
    </td>
    <td><code>null</code></td>
  </tr>
</table>

## Routes configuration options

You can specify routes in separate file and include it in server config.

Routes file can be CommonJS (`module.exports = [...]`) or ES module (`export default [...]`).

Note: Hot reload works with both. Only the routes file itself is reloaded, not the files it imports. Node.js can't remove an ES module from memory, so each reload of an ES module routes file keeps an old copy of the routes in memory.

If routes can't be loaded, the server still starts, but without routes. It logs a warning or an error to the console when:

- routes file is not found
- routes path is not a file
- routes file can't be loaded, e.g. it has a syntax error
- routes file does not export an array
- `routes` option is not a file path or an array

If `routes` is a file path, just fix the file. The server loads it again without a restart.

Example:

```javascript
export default [
  {
    active: true,
    path: '/books/all',
    method: 'GET',
    status: 200,
    data: [
      { id: 10, title: 'Robinson Crusoe' },
      { id: 20, title: 'Don Quixote' },
    ],
  },
  {
    active: true,
    key: 'BOOK_UPDATE',
    path: '/books/:bookId',
    method: 'PUT',
    status: 200,
    applyIf: ({ params, query, body, req }) => {
      // params - parameters from route path
      // body - parameters from request payload (PUT/POST)
      return params.bookId === '10' && body.bookGenre === 'novel';
    },
  },
  {
    active: false, // this route is disabled
    key: 'SEARCH_AUTHORS',
    prefix: '/v2',
    path: '/authors',
    method: 'POST',
    status: 400,
  },
];
```

<table>
  <tr><th>Parameter</th><th>Type</th><th>Description</th><th>Default</th></tr>

  <tr>
    <td><b>active</b><br><small><em>(optional)</em></small></td>
    <td><code>boolean</code></td>
    <td>ON/OFF switch. If it's not set as <code>true</code> rule will be omitted.</td>
    <td><code>false</code></td>
  </tr>

  <tr>
    <td><b>prefix</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>Custom route prefix. It will override global prefix defined in server configuration
    <br><br>Tip: If you have defined global prefix, but custom route should be without that prefix you can provide <code>prefix: ''</code> which will neutralize global prefix.</td>
    <td><code>null</code></td>
  </tr>

  <tr>
    <td><b>path</b><br><small><em>(mandatory)</em></small></td>
    <td><code>string</code></td>
    <td>
      Route path. Syntax of <a href="https://expressjs.com/en/guide/routing.html#route-paths">ExpressJS 5 route paths</a>: optional part in braces <code>{}</code>, named wildcard <code>*name</code>, no regular expressions. Route with invalid path is skipped with a warning.
      <br><br>Examples: 
      <br><code>"/movies/:movieId"</code>
      <br><code>"/movies/list{/:genre}"</code>
      <br><code>"/comments/:year/:month"</code>
      <br><code>"/files/*filePath"</code>
    </td>
    <td><code>""</code></td>
  </tr>

  <tr>
    <td><b>method</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>HTTP method. Available methods: <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code>, <code>HEAD</code>, <code>CONNECT</code>, <code>OPTIONS</code>, <code>TRACE</code>, <code>PATCH</code>
    <br><br>Example: <code>"POST"</code></td>
    <td><code>"GET"</code></td>
  </tr>

  <tr>
    <td><b>status</b><br><small><em>(optional)</em></small></td>
    <td><code>number</code></td>
    <td>HTTP response status. <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status">See list of statuses</a> on MDN Web Docs.</td>
    <td><code>200</code></td>
  </tr>

  <tr>
    <td><b>delay</b><br><small><em>(optional)</em></small></td>
    <td><code>number</code></td>
    <td>Exact response delay of this route in milliseconds. It overrides global <code>delay</code> defined in server configuration. Value <code>0</code> does not turn the delay off - global <code>delay</code> is used.
    <br><br>Example: <code>1500</code></td>
    <td><code>null</code></td>
  </tr>

  <tr>
    <td><b>data</b><br><em><small>(optional)</small></em></td>
    <td><code>Object</code></td>
    <td>
      Response data. If you have bigger amount of data it could be replaced with <code>key</code> option (below)
      <br><br>Example:
<pre>
data: { 
  id: 10, 
  title: 'Robinson Crusoe',
  genre: 'Adventure' 
}
</pre>      
    </td>
    <td><code>null</code></td>
  </tr>

  <tr>
    <td><b>headers</b><br><em><small>(optional)</small></em></td>
    <td><code>Object</code></td>
    <td>
      Response headers added to the response. They win over global <code>headers</code> from server configuration.
      <br><br>Example: <code>{ Location: '/books/30', 'X-Total-Count': '3' }</code>
    </td>
    <td><code>null</code></td>
  </tr>

  <tr>
    <td><b>contentType</b><br><em><small>(optional)</small></em></td>
    <td><code>string</code></td>
    <td>
      Response content type. String <code>data</code> is sent as it is (not converted to JSON string).
      <br>For a file response the type comes from the file extension, unless <code>contentType</code> is set.
      <br><br>Example: <code>"text/plain"</code>
    </td>
    <td><code>"application/json"</code></td>
  </tr>

  <tr>
    <td><b>file</b><br><em><small>(optional)</small></em></td>
    <td><code>string</code></td>
    <td>
      Path to a file sent as the response (image, PDF, text, ...). Path is relative to the current working directory. Used only when <code>data</code> is not set. <code>callback</code> is not called for file responses. If the file is missing, an empty body is sent.
      <br><br>Example: <code>"./files/cover.png"</code>
    </td>
    <td><code>null</code></td>
  </tr>

  <tr>
    <td><b>key</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>Param will be used for searching for a file with response data (in JSON format) in defined database folder. You could store response data in a folder defined by <code>database</code> param with filename used as <code>key</code> with <code>.json</code> extension. Server will find that file and return content as JSON response. You can define different data (in separate files) for each HTTP status code using extension prefix. API Mockup Server uses <code>key</code> also as an ID in console log for identifying which route was handled/intercepted or which has an error.
      <br><br>Examples:
<pre>
"BOOKS_LIST"
</pre>
<pre>
"BOOK_REMOVE"
</pre>
<pre>
"AUTHOR_EDIT"
</pre>
      <br>Files based on examples above. They should be stored in database folder:
<pre>
BOOKS_LIST.json
BOOK_REMOVE.json
AUTHOR_EDIT.json
AUTHOR_EDIT.202.json
AUTHOR_EDIT.400.json
AUTHOR_EDIT.500.json
</pre>
      <br>If no JSON file is found, server looks for a non-JSON file named <code>KEY.&lt;extension&gt;</code> (e.g. <code>BOOK_COVER.png</code>, <code>FEED.xml</code>) and sends it as it is. Content type comes from the extension. There is no status suffix for these files. JSON file always wins. See <a href="#response-headers-and-non-json-responses">non-JSON responses</a>.

</td>
<td><code>""</code></td>

  </tr>

  <tr>
    <td><b>applyIf</b><br><small><em>(optional)</em></small></td>
    <td><code>Function</code></td>
    <td>
      Decide whether route should be mocked or not. Return <code>true</code> if route should not be proxied but returned as defined JSON data mockup. It's useful when you want to proxy route only if some conditions are met. <code>applyIf</code> has lower priority than param <code>active</code>. 
      <br><br><code>applyIf</code> only matters when a proxy target is set. Without a proxy (or when running without proxy) it is not called and the route always returns its mock data.
      <br><br>Function parameter is one object with properties:
      <ul>
        <li><code>params</code> - request URL params</li>
        <li><code>query</code> - request URL query params (?param1=value1&param2=value2)</li>
        <li><code>body</code> - PUT/POST request payload data</li>
        <li><code>req</code> - ExpressJS request object</li>
      </ul>
      Return value should be boolean:
      <ul>
        <li><code>true</code> - if you want your route to be handled by mockup server</li>
        <li><code>false</code> - if you want to pass request to proxy target</li>
      </ul>
      <br>Example:
<pre>
applyIf: (props) => {
  const { params, query, body, req } = props;
  return params.bookId === '100';
}
</pre>
    </td>
    <td><code>null</code></td>
  </tr>

  <tr>
    <td><b>callback</b><br><small><em>(optional)</em></small></td>
    <td><code>Function</code></td>
    <td>Callback method for response manipulation. It should always return data.
    <br><br>Function parameter is one object with properties:
    <ul>
      <li><code>params</code> - request URL params</li>
      <li><code>query</code> - request URL query params (?param1=value1&param2=value2)</li>
      <li><code>body</code> - PUT/POST request payload data</li>
      <li><code>data</code> - returned data (from mock or from proxy target)</li>
      <li><code>req</code> - ExpressJS request object</li>
    </ul>
    Return value should be desired modified data.
    <br><br>Example:
<pre>
callback: (props) => {
  const { params, query, body, data, req } = props;
  // modify data and return back
  data.time = new Date();
  return data;
}
</pre>
    </td>
    <td><code>null</code></td>
  </tr>

</table>

## Response headers and non-JSON responses

By default every mocked response is JSON. Routes can also set headers, send other content types, empty bodies and files.

```javascript
apiMockupServer({
  // global headers, added to every mocked response (route headers win)
  headers: { 'Cache-Control': 'no-store' },
  routes: [
    {
      active: true,
      path: '/books',
      method: 'POST',
      status: 201,
      headers: { Location: '/books/30' },
      contentType: 'text/plain',
      data: 'Created',
    },
    // status 204 (and 304) always sends no body
    { active: true, path: '/books/:id', method: 'DELETE', status: 204 },
    // file response, content type from extension (image/png)
    { active: true, path: '/books/:id/cover', file: './files/cover.png' },
    // looks for database/BOOKS_FEED.json first, then database/BOOKS_FEED.<extension>
    { active: true, path: '/books/feed', key: 'BOOKS_FEED' },
  ],
});
```

Notes:

- Header `x-api-mockup-server` is still added (see `mockHeader` option).
- Response data order: `data` → `file` → JSON file by `key` → non-JSON file by `key`.
- If there are more non-JSON files with the same key (e.g. `KEY.txt` and `KEY.xml`), the first one in alphabetical order is used.
- `callback` is not called for file responses.

## Proxy route interceptors

If you have configured proxy target you can intercept and modify data by omitting <code>key</code> and <code>data</code> params in route definition. (Param <code>status</code> is also not needed here - it will be ignored.)

Example:

```javascript
export default [
  {
    active: true,
    path: '/user/:id',
    method: 'GET',
    callback: ({ data }) => {
      // modify proxied data here, e.g:
      data.fullName = `${data.firstName} ${data.lastName}`;
      return data;
    },
  },
];
```

This route will intercept and change data from proxy target for GET <code>/user/:id</code> requests.

Note: Interceptors work only for responses with `application/json` content type. Other responses pass unchanged.

## Use in tests

`apiMockupServer()` returns a Promise. It resolves when the server listens, with a server handle:

- `port` - real port (useful with `port: 0` = random free port)
- `url` - e.g. `http://localhost:51234`
- `close()` - stops the server, file watchers and keyboard shortcuts, returns a Promise

`port` and `url` stay the same after hot reload restart. If the port is already in use, the Promise rejects with an error (`code: 'EADDRINUSE'`), it does not end the process.

Example with `node:test` (works the same in Vitest, Jest or Playwright):

```javascript
import { before, after, it } from 'node:test';
import assert from 'node:assert/strict';
import apiMockupServer from 'api-mockup-server';

let server;

before(async () => {
  server = await apiMockupServer({
    port: 0,
    routes: [{ active: true, path: '/books', data: [{ id: 1 }] }],
    interactive: false,
    silent: true,
  });
});

after(() => server.close());

it('returns books', async () => {
  const res = await fetch(`${server.url}/books`);
  assert.deepEqual(await res.json(), [{ id: 1 }]);
});
```

Note: Run one server per process at a time. Servers share some state (e.g. suspended mocking, proxy target), so two servers running at the same time in one process can affect each other. Starting a new server after `close()` is fine.

## Command line

You can start the server without writing `server.js`:

```
npx api-mockup-server --port 3000 --routes ./routes.js --database ./db
```

| Flag               | Short | Meaning                                           |
| ------------------ | ----- | ------------------------------------------------- |
| `--config <file>`  | `-c`  | Config file (`.js`, `.cjs`, `.mjs` or `.json`).   |
| `--port <n>`       | `-p`  | Port.                                             |
| `--routes <file>`  | `-r`  | Routes file.                                      |
| `--database <dir>` | `-d`  | Data folder.                                      |
| `--prefix <path>`  | `-f`  | Global prefix.                                    |
| `--proxy <url>`    | `-x`  | One proxy target URL.                             |
| `--help`           | `-h`  | Show help.                                        |
| `--version`        | `-v`  | Show version.                                     |

Priority: CLI flag > config file > defaults. If `--proxy` is set, it replaces `proxy.server` from the config file.

### Config file

The config file has the same options as [server configuration](#server-configuration-options). Use it for options without a flag (`delay`, `cors`, `mockHeader`, `encoding`). It is loaded only with `--config`, there is no default file name.

```javascript
// mock.config.mjs
export default {
  port: 3000,
  routes: './routes.js',
  database: './db',
  delay: { min: 500, max: 2500 },
};
```

```
npx api-mockup-server --config mock.config.mjs
```

A JSON config file looks the same, with `routes` as a path or a list of routes:

```json
{
  "port": 3000,
  "routes": "./routes.js",
  "database": "./db"
}
```

Relative paths (`routes`, `database`) are relative to the current folder, not to the config file.

### Config hot reload

When the config file changes, the server reads it again and restarts. CLI flags still win over the new values.

- If the new config is broken, the server shows a warning and keeps the old config.
- If the new `port` is already in use, the server shows an error and stops.
- There is no interactive proxy choice on reload. With one target in the new config, that target is used. With a list, the current target stays if it is still in the list, otherwise the server runs without proxy (restart it to choose a target).

Note: Each reload of a config file loaded as ES module keeps an old copy of it in memory (same as [routes file](#routes-configuration-options)).

## CLI shortcuts

The server supports interactive keyboard shortcuts in supported terminals (TTY). They are off with `interactive: false` option. Shortcuts include:

- `r` — List configured routes
- `c` — Config (port, prefix, proxy target)
- `s` — Suspend/resume mocking
- `q` — Quit the server

## License

MIT
