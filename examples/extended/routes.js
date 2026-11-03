export default [
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
    key: 'BOOKS_ALL', // same data file, filtered by query params
    path: '/books/search',
    method: 'GET',
    status: 200,
    callback: ({ data, query }) => {
      // e.g. /api/v1/books/search?genre=Romance
      return data.filter((item) => !query.genre || item.genre === query.genre);
    },
  },
  {
    active: true,
    key: 'BOOK_CREATE', // response data file: ./db/BOOK_CREATE.json
    path: '/books',
    method: 'POST',
    status: 200,
    callback: ({ data, body }) => {
      // return created book: request body + generated fields from file
      return { ...body, ...data };
    },
  },
  {
    active: true,
    path: '/books/:id',
    method: 'DELETE',
    status: 200,
    data: { deleted: true },
    callback: ({ data, params }) => ({ ...data, id: Number(params.id) }),
  },
  {
    active: true,
    key: 'BOOK_DETAIL', // response data file: ./db/BOOK_DETAIL.json
    prefix: '/api/v2', // overrides global prefix
    path: '/books/:id',
    method: 'GET',
    status: 200,
    callback: ({ data, params }) => {
      // use id from URL, e.g. /api/v2/books/7 -> id: 7
      return { ...data, id: Number(params.id) };
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
    key: 'AUTHORS_ALL', // response data file: ./db/AUTHORS_ALL.json
    path: '/authors',
    method: 'GET',
    status: 200,
  },
];
