import http from 'http';
import { PulseConfig } from './config';

type PulseHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

class PulseServer {
  private server: http.Server;
  private config: PulseConfig;
  private routes: Record<string, Record<string, PulseHandler>>;

  constructor(config: PulseConfig) {
    this.routes = {};

    this.config = config;

    this.server = http.createServer((req, res) => {
      const handler = this.routes[req.url!][req.method!] || this.routeFallback;

      handler(req, res);
    });
  }

  public get(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }

    this.routes[path]['GET'] = handler;
  }

  public post(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }

    this.routes[path]['POST'] = handler;
  }

  public delete(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }

    this.routes[path]['DELETE'] = handler;
  }

  private routeFallback(req: http.IncomingMessage, res: http.ServerResponse) {
    res.statusCode = 400;
    res.end('Bad Request');
  }

  start(callback: () => void) {
    this.server.listen(this.config.port, callback);
  }
}

export default PulseServer;
