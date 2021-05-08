const server = {
  port: 9933,
  routes: [],
  prefix: '',
  database: 'database',
  encoding: 'utf8',
  cors: true,
  delay: {
    min: 0,
    max: 0,
  },
};

const route = {
  method: 'GET',
  status: '200',
};

module.exports = {
  server,
  route,
};
