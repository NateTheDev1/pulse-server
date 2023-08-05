import { before } from 'node:test';
import PulseServer from '../index';
import http from 'http';

const config = {
  port: 3000,
  usePulseLogger: true,
};

describe('PulseServer', () => {
  let server: PulseServer;

  beforeEach(() => {
    if (server) {
      server.stop();
    }
    server = new PulseServer(config);
    server.start(() => {});
  });

  afterEach(() => {
    server.stop();
  });

  test('GET request to defined route', (done) => {
    server.get('/test', (req, res) => {
      res.end('GET success');
    });
    http.get('http://localhost:3000/test', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        expect(data).toBe('GET success');
        done();
      });
    });
  });

  test('POST request to defined route', (done) => {
    server.post('/test', (req, res) => {
      res.end('POST success');
    });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/test',
      method: 'POST',
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        expect(data).toBe('POST success');
        done();
      });
    });
    req.end();
  });

  test('DELETE request to defined route', (done) => {
    server.delete('/test', (req, res) => {
      res.end('DELETE success');
    });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/test',
      method: 'DELETE',
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        expect(data).toBe('DELETE success');
        done();
      });
    });
    req.end();
  });

  test('Request to non-existing route', (done) => {
    http.get('http://localhost:3000/nonexisting', (res) => {
      expect(res.statusCode).toBe(400);
      done();
    });
  });
});
