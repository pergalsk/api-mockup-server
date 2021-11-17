# API Mockup Server

Node server for simple rest API mockup with JSON format responses. Just define couple of routes with response data and start the server. Server will listen on default port 9933.

API Mockup Server may be usefull during application development when for example back-end part is not ready yet and you want to work separately on front-end with mocked data, or you have a fully functional back-end part but you want to mockup only some of your rest APIs in order to simulate a problematic situation, bugs, edge cases, error responses, etc...

## Installation

```
npm install api-mockup-server --save
```

## Usage

### Quick start

Create `server.js` file:

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

Now, you can make 3 requests:

- GET `http://localhost:9933/api/books/all` - server will response with HTTP status 200 and return static data with books list
- GET `http://localhost:9933/api/books/7` - server will response with HTTP status 200 and return static data with book detail _(regardless of provided id, in this case 7)_
- POST `http://localhost:9933/api/authors` - server will response with HTTP status 400 and return static data with error message _(regardless of provided POST request data)_

### Advanced server configuration

In bigger projects you don't wont to store all your routes and responses in one file. You can configure routes in separate file using `routes` config param and responses in `database` config param providing path to folder containing JSON files with response data.

If you want to mockup only some of rest APIs you can use API Mockup Server as a mockup layer between your running back-end server and frontend application. In this scenario you have to configure proxy server target with runnig back-end. If you use more then one target, API Mockup Server will ask you to choose one target via CLI interface on srever start.

Updated `server.js` file:

```javascript
// server.js
const amServer = require('api-mockup-server');

amServer({
  port: 9933,
  routes: './paths.js', // path to file with routes
  database: './db', // path to directory with JSON files with response data
  prefix: '/api/v1',
  encoding: 'utf8',
  delay: { min: 500, max: 2500 }, // delay mocked responses in miliseconds
  proxy: {
    server: [
      'http://localhost:3000',
      'http://some.server.example',
      'http://another.server.example',
    ],
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
    key: 'BOOKS_ALL', // key for response data stored in ./db/POSTS_ALL.json
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
    key: 'BOOK_DETAIL', // key for response data stored in ./db/BOOK_DETAIL.json
    path: '/books/:id',
    method: 'GET',
    status: 200,
    applyIf: (req, params) => {
      // conditionaly mocked if request URL param id = 10
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
    <td>Directory name or path to directory in wich are stored JSON data files with responses.<br>Example: <code>"./db"</code></td>
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

## License

MIT
