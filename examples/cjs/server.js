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
amServer({
  port: 9933,
  prefix: '/api',
  routes,
});
