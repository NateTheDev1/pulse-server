import Pulse from 'pulse-server';

const server = new Pulse();

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
