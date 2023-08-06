import Pulse from 'pulse-server';

const server = new Pulse();

server.get(
  '/login/:id',
  (req, res) => {
    res.end('Hello World!');
  },
  {
    apiVersion: '2',
    paramRules: {
      id: 'number',
    },
  },
);

server.start(() => {
  console.log('Server started!');
});
