import amServer from 'api-mockup-server';

amServer({
  port: 9933,
  routes: './routes.cjs', // path to file with routes (CommonJS for hot reload)
  database: './db', // path to directory with data files
  prefix: '/api/v1',
  encoding: 'utf8',
  delay: {
    min: 500, // delay mocked responses in milliseconds
    max: 1500,
  },
});
