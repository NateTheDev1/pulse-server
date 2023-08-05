import http from 'http';
import { PulseConfig } from './config';
import Logger from '@ptkdev/logger';

export type PulseHandler = (req: http.IncomingMessage, res: http.ServerResponse, next?: () => void) => void;

export type PulseError = {};

class PulseServer {
  private server: http.Server;
  private config: PulseConfig;
  private routes: Record<string, Record<string, PulseHandler[]>>;
  private logger: Logger;
  private middlewares: PulseHandler[] = [];

  constructor(config: PulseConfig) {
    this.routes = {};

    this.config = config;

    this.logger = new Logger();
    this.logger.sponsor('Thank you for using Pulse!');

    this.server = http.createServer((req, res) => {
      const matchedRoutes = this.routes[req.url!];
      const matchedMethod = matchedRoutes ? matchedRoutes[req.method!] : null;
      const handler = matchedMethod && matchedMethod.length ? matchedMethod : [this.routeFallback];

      const handlers = [...this.middlewares, ...handler];
      this.handle(req, res, handlers);
    });

    if (config.usePulseLogger) {
      this.use(this.loggerMiddleware);
    }
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse, handlers: PulseHandler[]) {
    const next = () => {
      const handler = handlers.shift();
      if (handler) handler(req, res, next);
    };
    next();
  }

  public use(handler: PulseHandler) {
    this.middlewares.push(handler);
  }

  private loggerMiddleware: PulseHandler = (req, res, next) => {
    this.logger.info(req.method + ' Request To Route:' + req.url);
    if (next) next();
  };

  public get(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['GET']) {
      this.routes[path]['GET'] = [];
    }
    this.routes[path]['GET'].push(handler);
  }

  public post(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['POST']) {
      this.routes[path]['POST'] = [];
    }
    this.routes[path]['POST'].push(handler);
  }

  public delete(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['DELETE']) {
      this.routes[path]['DELETE'] = [];
    }
    this.routes[path]['DELETE'].push(handler);
  }

  private routeFallback(req: http.IncomingMessage, res: http.ServerResponse) {
    res.statusCode = 400;
    this.logger.error(`Bad Request: ${req.url}`);
    res.end('Bad Request');
  }

  start(callback: () => void) {
    this.server.listen(this.config.port, callback);
  }
}

export default PulseServer;
