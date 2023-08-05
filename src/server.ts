/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import http from 'http';
import toml from 'toml';
import fs from 'fs';
import { PulseConfig } from './config';
import Logger from '@ptkdev/logger';

export type PulseHandler = (
  req: http.IncomingMessage & { body?: Record<string, any> },
  res: http.ServerResponse,
  next?: () => void,
) => void;

export type PulseError = {};

export class PulseServer {
  private server: http.Server;
  private config: PulseConfig;
  private routes: Record<string, Record<string, PulseHandler[]>>;
  private logger!: Logger;
  private middleware: PulseHandler[] = [];

  constructor(config?: PulseConfig) {
    this.config = {
      port: config?.port ?? 3000,
      usePulseLogger: config?.usePulseLogger ?? true,
    };

    if (!config) {
      this.loadConfig();
    }

    this.routes = {};

    this.logger = new Logger();

    this.logger.sponsor('Thank you for using Pulse!');

    this.server = http.createServer((req, res) => {
      const matchedRoutes = this.routes[req.url!];
      const matchedMethod = matchedRoutes ? matchedRoutes[req.method!] : null;
      const handler = matchedMethod && matchedMethod.length ? matchedMethod : [this.routeFallback];

      const handlers = [...this.middleware, ...handler];
      this.handle(req, res, handlers);
    });

    if (this.config.usePulseLogger) {
      this.use(this.loggerMiddleware);
    }
  }

  /**
   * Adds a JSON middleware handler to the server. This will parse the body of the request as JSON and fail if invalid JSON.
   */
  public json() {
    this.use(this.jsonMiddleware);
  }

  private loadConfig() {
    console.log('No config provided, loading pulse.toml');

    try {
      // Read the TOML file from the root directory
      const fileContent = fs.readFileSync('pulse.toml', 'utf8');

      if (!fileContent) return;

      // Parse the TOML file
      const config = toml.parse(fileContent);

      console.log('Loaded config!');

      // Merge the parsed config with the existing config
      this.config = { ...this.config, ...config };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to load config.toml ' + error.message);
      } else {
        console.error('Failed to load config.toml: ' + 'An unknown error occurred');
      }
    }
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse, handlers: PulseHandler[]) {
    const next = () => {
      const handler = handlers.shift();
      if (handler) handler(req, res, next);
    };
    next();
  }

  /**
   * Adds a middleware handler to the server
   * @param handler The middleware handler to add
   */
  public use(handler: PulseHandler) {
    this.middleware.push(handler);
  }

  private loggerMiddleware: PulseHandler = (req, res, next) => {
    this.logger.info(req.method + ' Request To Route:' + req.url);
    if (next) next();
  };

  private jsonMiddleware: PulseHandler = (req, res, next) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      try {
        req.body = JSON.parse(data);
        if (next) next();
      } catch (error) {
        res.statusCode = 400;
        res.end('Bad Request: Invalid JSON');
      }
    });
  };

  /**
   * Adds a GET route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public get(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['GET']) {
      this.routes[path]['GET'] = [];
    }
    this.routes[path]['GET'].push(handler);
  }

  /**
   * Adds a POST route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public post(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['POST']) {
      this.routes[path]['POST'] = [];
    }
    this.routes[path]['POST'].push(handler);
  }

  /**
   * Adds a DELETE route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public delete(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['DELETE']) {
      this.routes[path]['DELETE'] = [];
    }
    this.routes[path]['DELETE'].push(handler);
  }

  /**
   * Adds a PUT route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public put(path: string, handler: PulseHandler) {
    if (!this.routes[path]) {
      this.routes[path] = {};
    }
    if (!this.routes[path]['PUT']) {
      this.routes[path]['PUT'] = [];
    }
    this.routes[path]['PUT'].push(handler);
  }

  private routeFallback(req: http.IncomingMessage, res: http.ServerResponse) {
    res.statusCode = 400;
    res.end('Bad Request');
  }

  /**
   * Starts the server
   * @param callback - The callback to run when the server starts
   */
  public start(callback: () => void) {
    this.server.listen(this.config.port, callback);
  }

  /**
   * Stops the server
   * @param errorCallback - The callback to run when the server stops
   */
  public stop(errorCallback?: (err?: Error | undefined) => void) {
    this.server.close(errorCallback);
  }
}
