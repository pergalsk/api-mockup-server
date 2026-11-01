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
    // proxy route interceptor - no `data` or `key`, response comes from proxy target
    active: true,
    path: '/posts/:id',
    method: 'GET',
    callback: ({ data }) => {
      return { ...data, title: data.title.toUpperCase(), intercepted: true };
    },
  },
];

amServer({
  port: 9933,
  routes,
  proxy: {
    // more than one target -> CLI asks you to choose one on start
    server: ['https://jsonplaceholder.typicode.com', 'http://localhost:3000'],
  },
});
