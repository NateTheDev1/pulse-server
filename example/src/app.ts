import Pulse from 'pulse-server';

const server = new Pulse();

server.setContextMiddleware((req, res) => {
  server.setContext({ user: 'test' });
});

server.use((req, res, next) => {
  next();
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

server
  .get('/users', (req, res) => {
    res.send({ users: ['test'] });
    res.paginate(['john', 'lisa'], { limit: 20, page: 1 });
  })
  .get('/:id', (req, res) => {
    res.json({ user: req.params.id });
  });

server.start(() => {
  console.log('Server started!');
});

server.createPulseSocket();

server.onSocketMessage((data) => {
  console.log(data.toString());
});
