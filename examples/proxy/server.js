import amServer from 'api-mockup-server';

const routes = [
  {
    // mocked route - not sent to proxy target
    active: true,
    path: '/users/1',
    method: 'GET',
    status: 200,
    data: { id: 1, name: '__MOCKED USER__' },
  },
  {
    // mocked POST - not sent to proxy target, returns request body with new id
    active: true,
    path: '/posts',
    method: 'POST',
    status: 200,
    data: { id: 101 },
    callback: ({ data, body }) => ({ ...body, ...data }),
  },
  {
    // mocked error - simulate server problem on update
    active: true,
    path: '/posts/:id',
    method: 'PUT',
    status: 500,
    data: { errorCode: 'SERVER_ERROR', errorMsg: 'Database is not available.' },
  },
  {
    // proxy route interceptor - no `data` or `key`, response comes from proxy target
    active: true,
    path: '/posts/:id',
    method: 'GET',
    callback: ({ data }) => {
      return { ...data, title: data.title.toUpperCase(), intercepted: true };
    },
  },
  {
    // proxy route interceptor - add computed field to proxied data
    active: true,
    path: '/todos/:id',
    method: 'GET',
    callback: ({ data }) => {
      return { ...data, status: data.completed ? 'done' : 'open' };
    },
  },
];

amServer({
  port: process.env.PORT || 9933,
  routes,
  proxy: {
    // more than one target -> CLI asks you to choose one on start
    // (PROXY_TARGET env var sets one target without asking, used by tests)
    server: process.env.PROXY_TARGET || [
      { title: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com' },
      'http://localhost:3000',
    ],
  },
});
