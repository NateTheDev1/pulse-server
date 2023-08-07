import Pulse from 'pulse-server';

const server = new Pulse();

server.setContextMiddleware((req, res) => {
  console.log(req);
  console.log(res);

  server.setContext({ user: 'test' });
});

server
  .get('/', (req, res) => {
    res.end('Hello World!');
  })
  .get('/test', (req, res) => {
    res.end('Test!');
  })
  .get('/:id', (req, res) => {
    res.end(`Test ${req.params.id}!`);
  });

server.start(() => {
  console.log('Server started!');
});
