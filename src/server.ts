/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import http from 'http';
import toml from 'toml';
import fs from 'fs';
import { PulseConfig } from './config';
import cors from 'cors';
import bodyParser from 'body-parser';
import url from 'url';
import querystring from 'querystring';
import log4js from 'log4js';
import { PulseRouteInfo, PulseRouteOptions, PulseRoutePattern, matchRoute } from './route';

export type PulseHandler = (req: PulseRequest, res: http.ServerResponse, next?: () => void) => void;

export type PulseRequest = http.IncomingMessage & { body?: Record<string, any>; params?: querystring.ParsedUrlQuery };

export type PulseError = {};

export type PulseBodyFormat = 'JSON' | 'RAW' | 'TEXT' | 'UNSET';

export class PulseServer {
  private server: http.Server;
  private config: PulseConfig;
  private routes: Record<string, Record<string, PulseRouteInfo[]>>;
  private logger!: log4js.Logger;
  private middleware: PulseHandler[] = [];

  constructor(config?: PulseConfig) {
    this.config = {
      port: config?.port ?? 3000,
      usePulseLogger: config?.usePulseLogger ?? true,
      bodyFormat: config?.bodyFormat ?? 'UNSET',
      useCors: config?.useCors ?? false,
      apiVersion: config?.apiVersion ?? 'v1',
      disableParamMiddleware: config?.disableParamMiddleware ?? false,
      staticLogFile: config?.staticLogFile ?? false,
      staticLogFileName: config?.staticLogFileName ?? 'pulse.log',
    };

    if (this.config.staticLogFile) {
      log4js.configure({
        appenders: {
          file: { type: 'file', filename: this.config.staticLogFileName },
        },
        categories: {
          default: { appenders: ['file'], level: 'debug' },
        },
      });
    } else {
      log4js.configure({
        appenders: {
          out: { type: 'stdout' },
        },
        categories: {
          default: { appenders: ['out'], level: 'debug' },
        },
      });
    }

    if (!config) {
      this.loadConfig();
    }

    this.routes = {};

    this.logger = log4js.getLogger('default');

    this.logger.info('Thank you for using Pulse!');

    this.server = http.createServer((req: PulseRequest, res) => {
      const urlPath = url.parse(req.url!).pathname!;

      let matchedHandler: PulseHandler | null = null;
      for (const pattern in this.routes) {
        for (const m in this.routes[pattern]) {
          if (m === req.method) {
            for (const routeInfo of this.routes[pattern][m]) {
              const params = matchRoute(routeInfo.pattern, urlPath);

              if (params) {
                req.params = { ...req.params, ...params };
                break;
              }

              if (routeInfo.pattern.original === this.config?.apiVersion + urlPath) {
                matchedHandler = routeInfo.handler;
              }
            }
          }
          if (matchedHandler) break;
        }
        if (matchedHandler) break;
      }

      const handler = matchedHandler ? [matchedHandler] : [this.routeFallback];

      const handlers = [...this.middleware, ...handler];
      this.handle(req, res, handlers);
    });

    if (this.config.usePulseLogger) {
      this.use(this.loggerMiddleware);
    }

    if (!this.config.disableParamMiddleware) {
      this.use(this.paramMiddleware);
    }

    if (this.config.bodyFormat === 'JSON') {
      this.use(this.jsonMiddleware);
    } else if (this.config.bodyFormat === 'RAW') {
      this.use(this.bufferMiddleware);
    } else if (this.config.bodyFormat === 'TEXT') {
      this.use(this.textMiddleware);
    }

    this.use(this.validateParamsMiddleware);
  }

  public setAPIVersion(version: string) {
    this.config.apiVersion = version;
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

  private validateParamsMiddleware: PulseHandler = (req: PulseRequest, res, next) => {
    const urlPath = url.parse(req.url!).pathname!;

    for (const pattern in this.routes) {
      for (const m in this.routes[pattern]) {
        if (m === req.method) {
          for (const routeInfo of this.routes[pattern][m]) {
            const params = matchRoute(routeInfo.pattern, urlPath);
            if (params && routeInfo.paramRules) {
              for (const [paramName, paramType] of Object.entries(routeInfo.paramRules)) {
                if (!this.validateParamType(params[paramName], paramType)) {
                  res.statusCode = 400;
                  res.end('Invalid param type for ' + paramName);
                  return;
                }
              }
            }
          }
        }
      }
    }

    if (next) next();
  };

  private validateParamType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'any':
        return true;
      default:
        return false;
    }
  }

  private paramMiddleware: PulseHandler = (req, res, next) => {
    const parsedUrl = url.parse(req.url!);

    if (parsedUrl.query) {
      req.params = querystring.parse(parsedUrl.query);
    }

    if (next) next();
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
    return this.addRoute('GET', path, handler, options);
  }

  /**
   * Adds a POST route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public post(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('POST', path, handler, options);
  }

  /**
   * Adds a DELETE route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public delete(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('DELETE', path, handler, options);
  }

  /**
   * Adds a PUT route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   */
  public put(path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    return this.addRoute('PUT', path, handler, options);
  }

  private addRoute(method: string, path: string, handler: PulseHandler, options?: PulseRouteOptions) {
    const versionedPath = options && options.apiVersion ? options.apiVersion + path : this.config.apiVersion + path;

    const pattern: PulseRoutePattern = {
      original: versionedPath,
      segments: versionedPath.split('/'),
    };

    if (!this.routes[versionedPath]) {
      this.routes[versionedPath] = {};
    }

    if (!this.routes[versionedPath][method]) {
      this.routes[versionedPath][method] = [];
    }

    this.routes[versionedPath][method].push({ handler, pattern, paramRules: options?.paramRules });

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
