import Pulse from 'pulse-server';

const server = new Pulse();

server.get('/', (req, res) => {
  res.end('Hello World!');
});

server.start(() => {
  console.log('Server started!');
});
