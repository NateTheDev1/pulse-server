import http from 'http';
import { PulseConfig } from './config';
import Logger from '@ptkdev/logger';

export type PulseHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

export type PulseError = {};

class PulseServer {
  private server: http.Server;
  private config: PulseConfig;
  private routes: Record<string, Record<string, PulseHandler>>;
  private logger: Logger;

  constructor(config: PulseConfig) {
    this.routes = {};

    this.config = config;

    this.logger = new Logger();
    this.logger.sponsor('Thank you for using Pulse!');

    this.server = http.createServer((req, res) => {
      const handler = this.routes[req.url!][req.method!] || this.routeFallback;

      handler(req, res);
      this.loggerMiddleware(req, res, handler);
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
    this.logger.error(`Bad Request: ${req.url}`);
    res.end('Bad Request');
  }

  private loggerMiddleware(req: http.IncomingMessage, res: http.ServerResponse, next: PulseHandler) {
    this.logger.info(req.method + ' Request To Route:' + req.url);
    next(req, res);
  }

  start(callback: () => void) {
    this.server.listen(this.config.port, callback);
  }
}

export default PulseServer;
