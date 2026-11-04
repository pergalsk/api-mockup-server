import apiMockupServer from 'api-mockup-server';

apiMockupServer({
  port: process.env.PORT || 9933,
  routes: './routes.js', // path to file with routes
  database: './db', // path to directory with data files
  prefix: '/api/v1',
  encoding: 'utf8',
  delay: {
    min: 500, // delay mocked responses in milliseconds
    max: 1500,
  },
});
