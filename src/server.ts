/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import http from 'http';
import toml from 'toml';
import fs from 'fs';
import { PulseConfig } from './config';
import Logger from '@ptkdev/logger';
import cors from 'cors';
import bodyParser from 'body-parser';

export type PulseHandler = (
  req: http.IncomingMessage & { body?: Record<string, any> },
  res: http.ServerResponse,
  next?: () => void,
) => void;

export interface PulseRouteBuilder {
  get: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  post: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  put: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  delete: (path: string, handler: PulseHandler) => PulseRouteBuilder;
}

export type PulseError = {};

export type PulseRouteOptions = {
  apiVersion?: string;
};

export type PulseBodyFormat = 'JSON' | 'RAW' | 'TEXT' | 'UNSET';

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
      bodyFormat: config?.bodyFormat ?? 'UNSET',
      useCors: config?.useCors ?? false,
      apiVersion: config?.apiVersion ?? 'v1',
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

    if (this.config.bodyFormat === 'JSON') {
      this.use(this.jsonMiddleware);
    } else if (this.config.bodyFormat === 'RAW') {
      this.use(this.bufferMiddleware);
    } else if (this.config.bodyFormat === 'TEXT') {
      this.use(this.textMiddleware);
    }
  }

  public enableCors() {
    this.use(this.corsMiddleware);
  }

  public setParser(type: PulseBodyFormat) {
    if (type === 'JSON') {
      this.use(this.jsonMiddleware);
    } else if (type === 'RAW') {
      this.use(this.bufferMiddleware);
    } else if (type === 'TEXT') {
      this.use(this.textMiddleware);
    }
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

  private corsMiddleware: PulseHandler = (req, res, next) => {
    cors()(req, res, (err) => {
      if (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (next) next();
    });
  };

  private jsonMiddleware: PulseHandler = (req, res, next) => {
    bodyParser.json()(req, res, (err) => {
      if (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (next) next();
    });
  };

  private bufferMiddleware: PulseHandler = (req, res, next) => {
    bodyParser.raw()(req, res, (err) => {
      if (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (next) next();
    });
  };

  private textMiddleware: PulseHandler = (req, res, next) => {
    bodyParser.text()(req, res, (err) => {
      if (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      if (next) next();
    });
  };

  /**
   * Adds a GET route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public get(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('GET', path, handler);
  }

  /**
   * Adds a POST route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public post(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('POST', path, handler);
  }

  /**
   * Adds a DELETE route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public delete(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('DELETE', path, handler);
  }

  /**
   * Adds a PUT route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public put(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('PUT', path, handler);
  }

  private addRoute(method: string, path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    const versionedPath = options && options.apiVersion ? options.apiVersion + path : this.config.apiVersion + path; // prepend path with version
    if (!this.routes[versionedPath]) {
      this.routes[versionedPath] = {};
    }
    if (!this.routes[versionedPath][method]) {
      this.routes[versionedPath][method] = [];
    }
    this.routes[versionedPath][method].push(handler);

    return {
      get: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions) => {
        return this.addRoute('GET', path + subPath, handler, options);
      },
      post: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions) => {
        return this.addRoute('POST', path + subPath, handler, options);
      },
      put: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions) => {
        return this.addRoute('PUT', path + subPath, handler, options);
      },
      delete: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions) => {
        return this.addRoute('DELETE', path + subPath, handler, options);
      },
    };
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

const server = new PulseServer();
