const amServer = require('api-mockup-server');

// define some routes
const routes = [
  {
    active: true,
    path: '/books/all',
    method: 'GET',
    status: 200,
    data: [
      { id: 1, title: 'Robinson Crusoe', authorId: 1, year: 1719, genre: 'Adventure', available: true },
      { id: 2, title: 'Don Quixote', authorId: 2, year: 1605, genre: 'Novel', available: false },
      { id: 3, title: 'Pride and Prejudice', authorId: 3, year: 1813, genre: 'Romance', available: true },
      { id: 4, title: 'Moby-Dick', authorId: 4, year: 1851, genre: 'Adventure', available: true },
      { id: 5, title: 'Frankenstein', authorId: 5, year: 1818, genre: 'Gothic', available: false },
      { id: 6, title: 'Emma', authorId: 3, year: 1815, genre: 'Romance', available: true },
    ],
  },
  {
    active: true,
    path: '/books/:id',
    method: 'GET',
    status: 200,
    data: {
      id: 1,
      title: 'Robinson Crusoe',
      author: { id: 1, name: 'Daniel Defoe' },
      year: 1719,
      pages: 320,
      language: 'en',
      tags: ['adventure', 'island', 'survival'],
      rating: { average: 4.1, count: 1520 },
      available: true,
      series: null,
      addedAt: '2026-01-15T10:30:00Z',
    },
  },
  {
    active: true,
    path: '/authors',
    method: 'POST',
    status: 400,
    data: {
      errorCode: 'VALIDATION_ERROR',
      errorMsg: 'Author name is too long!',
      details: [{ field: 'name', rule: 'maxLength', limit: 50 }],
    },
  },
];

// start the server
amServer({
  port: process.env.PORT || 9933,
  prefix: '/api',
  routes,
});
