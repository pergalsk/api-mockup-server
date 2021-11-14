# API Mockup Server

Node server for simple rest API mockup with JSON format responses. Just define couple of routes with response data and start the server. Server will listen on default port 9933.

## Installation

```
npm install api-mockup-server --save
```

## Usage

### Quick start

Create server.js file:

```javascript
// server.js

// load API Mockup Server
const amServer = require('api-mockup-server');

// define routes
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
];

// run server
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

Now, you can make requests:

- GET http://localhost:9933/api/books/all - server will response with HTTP status 200 and return static data with books list
- GET http://localhost:9933/api/books/7 - server will response with HTTP status 200 and return static data with book detail (regardless of provided id, in this case 7)
  Don Quixote

### Advanced server configuration

Let's take a look on more useful server config options.
Update server.js file:

```javascript
// server.js
const amServer = require('api-mockup-server');

amServer({
  port: 9933,
  routes: './paths.js',
  database: './db',
  prefix: '/api/v1',
  encoding: 'utf8',
  delay: { min: 500, max: 2500 },
  proxy: {
    server: [
      'http://localhost:3000',
      'http://some.server.example',
      'http://another.server.example',
    ],
  },
});
```

Add ./paths.js file in the same directory:

```javascript
// paths.js
module.exports = [
  {
    active: true,
    key: 'BOOKS_ALL',
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
    key: 'BOOK_DETAIL',
    path: '/books/:id',
    method: 'GET',
    status: 200,
    applyIf: (req, params) => {
      // conditionaly mocked if id = 15
      return params.id === '15';
    },
  },
];
```

Add ./db/POSTS_ALL.json file:

```json
[
  { "id": 10, "title": "Robinson Crusoe" },
  { "id": 20, "title": "Don Quixote" }
]
```

Add ./db/BOOK_DETAIL.json file:

```json
{
  "id": 20,
  "title": "Robinson Crusoe",
  "author": "Daniel Defoe",
  "pages": 250
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
    <td><code>Number</code></td>
    <td>The port on which mock server will listen.</td>
    <td>9933</td>
  </tr>
  <tr>
    <td><b>routes</b><br><small><em>(mandatory)</em></small></td>
    <td><code>String | Array</code></td>
    <td>Definitions of API routes. It could be array or path to definition file.<br>Example: <code>"./routes.js"</code></td>
    <td>[]</td>
  </tr>
  <tr>
    <td><b>database</b><br><small><em>(optional)</em></small></td>
    <td><code>String</code></td>
    <td>Directory name or path to directory in wich are stored json data files with responses.<br>Example: <code>"db"</code></td>
    <td>"database"</td>
  </tr>
  <tr>
    <td><b>prefix</b><br><small><em>(optional)</em></small></td>
    <td><code>String</code></td>
    <td>Api route prefix. <br>Example: <code>"/api/v1"</code></td>
    <td>""</td>
  </tr>
  <tr>
    <td><b>encoding</b><br><small><em>(optional)</em></small></td>
    <td><code>String</code></td>
    <td>Response text encoding.</td>
    <td>"utf8"</td>
  </tr>
  <tr>
    <td><b>cors</b><br><em><small>(optional)</small></em></td>
    <td><code>Boolean</code></td>
    <td>
      <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS">Cross-Origin Resource Sharing</a> policy.
      <br>Set to <code>false</code> if you don't wont it.
    </td>
    <td>true</td>
  </tr>
  <tr>
    <td><b>delay</b><br><small><em>(optional)</em></small></td>
    <td><code>Object</code></td>
    <td>Mocked response delay. Random delay will be generated between <code>max</code> and <code>min</code> values in miliseconds.
      <br>Example: <code>{ min: 500, max: 2500 }</code>
    </td>
    <td>{ min: 0, max: 0}</td>
  </tr>
  <tr>
    <td><b>proxy</b><br><small><em>(optional)</em></small></td>
    <td><code>Object</code></td>
    <td>Proxy server configuration object. Undefined or not active routes will be redirected to proxy target. If server is defined as an array, on the start the interactive CLI will ask you to choose from given list of server adresses.
      <br>Example: <code>{ server: "http://localhost:3000" }</code>
      <br>Example: 
<pre>
{
  server: [
    'http://localhost:7000',
    'http://localhost:3000',
    'http://some.server.example',
    'http://another.server.example',
  ]
}
</pre>
    </td>
    <td>null</td>
  </tr>
</table>

## TODO

**Features**

- include routes via require in config
- custom prefix per route - override the global prefix
- standard error response data overrides
- watch for changes routes/server
- comandline params: port, database folder (APIs for different projects)

**Develop**

- ES modules

**Fix**

- callback method can't receive POST method's body params

## License

MIT
