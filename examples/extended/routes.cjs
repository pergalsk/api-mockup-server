module.exports = [
  {
    active: true,
    key: 'BOOKS_ALL', // response data file: ./db/BOOKS_ALL.json
    path: '/books/all',
    method: 'GET',
    status: 200,
    callback: ({ data }) => {
      // add timestamp to each item
      const timestamp = new Date().getTime();
      return data.map((item) => ({ ...item, _t: timestamp }));
    },
  },
  {
    active: true,
    key: 'BOOK_DETAIL', // response data file: ./db/BOOK_DETAIL.json
    prefix: '/api/v2', // overrides global prefix
    path: '/books/:id',
    method: 'GET',
    status: 200,
    applyIf: ({ params }) => {
      // mocked only for /api/v2/books/10
      return params.id === '10';
    },
  },
  {
    active: true,
    key: 'BOOK_DETAIL', // response data file: ./db/BOOK_DETAIL.400.json
    path: '/books/:id',
    method: 'PUT',
    status: 400,
  },
  {
    active: false, // this route is disabled
    path: '/authors',
    method: 'GET',
    status: 200,
    data: [{ id: 1, name: 'Daniel Defoe' }],
  },
];
