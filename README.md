# API Mockup Server

Node server for simple rest API mockup with JSON format responses. Just define couple of routes with response data and start the server. Server will listen on default port 9933.

API Mockup Server may be useful during application development when for example back-end part is not ready yet and you want to work separately on front-end with mocked data, or you have a fully functional back-end part but you want to mockup only some of your rest APIs in order to simulate a problematic situation, bugs, edge cases, error responses, etc...

## Installation

```
npm install api-mockup-server --save
```

## Quick start

Create `server.js` file:

```javascript
// server.js

// load API Mockup Server
const amServer = require('api-mockup-server');

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
      id: 20,
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
amServer({
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

## Advanced server configuration

In bigger projects you don't want to store all of your routes and responses in one file. You can configure routes in separate file using `routes` param and responses in `database` param providing path to folder containing JSON files with response data.

If you want to mockup only some of rest APIs you can use API Mockup Server as a mockup layer between your running back-end server and frontend application. In this scenario you have to configure proxy server target with running back-end. If you use more then one target, API Mockup Server will ask you to choose one target via CLI interface on server start.

Note: You don't have to restart the server when you make changes in routes config _(if path is defined)_ or data files. API Mockup Server will automatically reflect new configuration while running.

```
FILE STRUCTURE:

/db                        <- database directory
  /BOOKS_ALL.json          <- response data file (all statuses)
  /BOOK_DETAIL.json        <- response data file (statuses !== 400)
  /BOOK_DETAIL.400.json    <- response data file (HTTP status 400)
paths.js                   <- routes definitions
server.js                  <- main server file
```

Main file with server configuration `./server.js`:

```javascript
// server.js
const amServer = require('api-mockup-server');

amServer({
  port: 9933,
  routes: './paths.js', // path to file with routes
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

Add `./paths.js` file in the same directory:

```javascript
// paths.js
module.exports = [
  {
    active: true,
    key: 'BOOKS_ALL', // response data file: ./db/POSTS_ALL.json
    path: '/books/all',
    method: 'GET',
    status: 200,
    callback: (req, res, data) => {
      // modify returned data
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
    key: 'BOOK_DETAIL', // response data file: ./db/BOOK_DETAIL.json
    path: '/books/:id',
    method: 'GET',
    status: 200,
    applyIf: (req, params, data) => {
      // conditionally mocked if request URL param id = 10
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
const amServer = require('api-mockup-server');

const serverConfigOptions = {
  // configuration properties are defined in the table below
};

amServer(serverConfigOptions);
```

<table>
  <tr><th>Parameter</th><th>Type</th><th>Description</th><th>Default</th></tr>
  <tr>
    <td><b>port</b><br><small><em>(optional)</em></small></td>
    <td><code>number</code></td>
    <td>The port on which mock server will listen.</td>
    <td><code>9933</code></td>
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
      <br>Set to <code>false</code> if you don't wont it.
    </td>
    <td><code>true</code></td>
  </tr>
  <tr>
    <td><b>delay</b><br><small><em>(optional)</em></small></td>
    <td><code>Object</code></td>
    <td>Mocked response delay. Random delay will be generated between <code>min</code> and <code>max</code> values in milliseconds. If not set response will by served with additional delay.
      <br>Example: <code>{ min: 500, max: 2500 }</code>
      <p>
        <br>If you want to define exact response time set <code>min</code> and <code>max</code> params to the same value.
        <br>Example: <code>{ min: 1000, max: 1000 }</code>
      </p>
    </td>
    <td><code>{ min: 0, max: 0}</code></td>
  </tr>
    <tr>
    <td><b>routes</b><br><small><em>(mandatory)</em></small></td>
    <td><code>string | Array</code></td>
    <td>
      Definitions of API routes. It could be array or path to definition file. 
      <a href="#routes-configuration-options">More config options below.</a>
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
    <td>Proxy server configuration. Undefined or not active routes will be redirected to proxy target. If server is defined as an array, on the start the interactive CLI will ask you to choose from given list of server addresses.
      <br>Examples: 
<pre>{ 
  server: "http://localhost:3000"
}</pre>
<pre>
{
  server: [
    'http://localhost:3000',
    'http://api.server.example',
    'http://api2.server.example'
  ]
}
</pre>
    </td>
    <td><code>null</code></td>
  </tr>
</table>

## Routes configuration options

You can specify routes in separate file and include it in server config.

Example:

```javascript
module.exports = [
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
    applyIf: (req, params, data) => {
      // params - parameters from route path
      // data - parameters from request payload (PUT/POST)
      return params.bookId === '10' && data.bookGenre === 'novel';
    },
  },
  {
    active: false, // this route is disabled
    key: 'SEARCH_AUTHORS',
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
    <td><b>path</b><br><small><em>(mandatory)</em></small></td>
    <td><code>string</code></td>
    <td>
      Route path. See more details in <a href="https://expressjs.com/en/4x/api.html#req">ExpressJS 4.x Request documentation</a>.
      <br>Examples: 
      <br><code>"/movies/:movieId"</code>
      <br><code>"/movies/list/:genre?"</code>
      <br><code>"/comments/:year/:month"</code>
    </td>
    <td><code>""</code></td>
  </tr>

  <tr>
    <td><b>method</b><br><small><em>(optional)</em></small></td>
    <td><code>string</code></td>
    <td>HTTP method. Available methods: <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code>, <code>HEAD</code>, <code>CONNECT</code>, <code>OPTIONS</code>, <code>TRACE</code>, <code>PATCH</code>
    <br>Example: <code>"POST"</code></td>
    <td><code>"GET"</code></td>
  </tr>

  <tr>
    <td><b>status</b><br><small><em>(optional)</em></small></td>
    <td><code>number</code></td>
    <td>HTTP response status. <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status">See list of statuses</a> on MDN Web Docs.</td>
    <td><code>200</code></td>
  </tr>

  <tr>
    <td><b>data</b><br><em><small>(optional)</small></em></td>
    <td><code>Object</code></td>
    <td>
      Response data. If you have bigger amount of data it could be replaced with <code>key</code> option (bellow)<br>
      Example:
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

</td>
<td><code>""</code></td>

  </tr>

  <tr>
    <td><b>applyIf</b><br><small><em>(optional)</em></small></td>
    <td><code>Function</code></td>
    <td>
      Decide whether route should be mocked or not. Return <code>true</code> if route should not be proxyied but returned as defined JSON data mockup. It's useful when you want to proxy route only if some conditions are met. <code>applyIf</code> has lower priority than param <code>active</code>. 
      <br><br>Function params:
      <ul>
        <li><code>req</code> - ExpressJS request object</li>
        <li><code>params</code> - request URL params</li>
        <li><code>body</code> - PUT/POST request payload data</li>
      </ul>
      Return value (boolean):
      <ul>
        <li><code>true</code> - if you want your route to be handled by mockup server</li>
        <li><code>false</code> - if you want to pass request to proxy target (if configured - otherwise empty response will be returned)</li>
      </ul>
      <br>Example:
<pre>
applyIf: (req, params, body) => {
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
      <br> Function params:
      <ul>
        <li><code>req</code> - ExpressJS request object</li>
        <li><code>res</code> - ExpressJS response object</li>
        <li><code>data</code> - returned data (from mock or from proxy target)</li>
      </ul>
      Example:
<pre>
callback: (req, res, data) => {
  // modify data and return back
  data.time = new Date();
  return data;
}
</pre>
    </td>
    <td><code>null</code></td>
  </tr>

</table>

## License

MIT
