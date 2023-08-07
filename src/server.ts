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
import { PulseRouteBuilder, PulseRouteInfo, PulseRouteOptions, PulseRoutePattern, matchRoute } from './route';
import { PulseDB } from './database';
import { adminRouter } from './admin';
import { PulseAuth } from './auth';

export type PulseHandler = (req: PulseRequest, res: PulseResponse, next?: () => void) => void;

export type PulseRequest = http.IncomingMessage & { body?: Record<string, any>; params?: querystring.ParsedUrlQuery };

export type PulseResponse = http.ServerResponse & {
  send: (data: string | any[] | object | Buffer) => void;
  json: (data: Record<string, any>) => void;
  sendFile: (path: string) => void;
  paginate: (data: any[], options: PulsePagination) => void;
};

export type PulsePagination = {
  limit: number;
  page: number;
};

export type PulseError = {};

export type PulseBodyFormat = 'JSON' | 'RAW' | 'TEXT' | 'UNSET';

export type PulseIPGateMethod = 'BLACKLIST' | 'WHITELIST' | 'NONE';

export class PulseServer {
  private server: http.Server;
  private config: PulseConfig;
  private routes: Record<string, Record<string, PulseRouteInfo[]>>;
  private logger!: log4js.Logger;
  private middleware: PulseHandler[] = [];
  private context: Record<string, any> = {
    pagination: {},
  };
  private contextFn: (req: PulseRequest, res: http.ServerResponse) => void = () => {
    this.logger.info("You haven't set a context function. This is the default context function.");
  };
  private whitelist: string[] = [];
  private blacklist: string[] = [];
  public auth = new PulseAuth();

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
      rateLimit: config?.rateLimit ?? undefined,
      dashboard: process.env.NODE_ENV === 'development' && config?.dashboard ? config.dashboard : false,
      ipGateMethod: config?.ipGateMethod ?? 'NONE',
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
      this.context = {};
      this.contextFn(req, res);

      const urlPath = url.parse(req.url!).pathname!;

      let matchedHandler: PulseHandler | null = null;
      for (const pattern in this.routes) {
        for (const m in this.routes[pattern]) {
          if (m === 'ALL') {
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
          } else if (m === req.method) {
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

    if (this.config.rateLimit?.enabled) {
      this.use(this.rateLimitMiddleware);
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

    if (this.config.dashboard) {
      adminRouter(this);

      this.logger.info("Pulse's dashboard is now available at http://localhost:" + this.config.port + '/admin');
    }

    this.use(this.ipGateMiddleware);
  }

  public loginUser(req: PulseRequest) {
    const ID = this.auth.createUserDeviceID(req);
    let exists = false;

    PulseDB.deviceDatastore.find({ id: ID }, (err: any, doc: any) => {
      if (doc.length > 0) {
        exists = true;
      }
    });

    if (exists) {
      return;
    }

    PulseDB.deviceDatastore.insert({
      id: ID,
    });
  }

  public isUserLoggedIn(req: PulseRequest): boolean {
    const ID = this.auth.createUserDeviceID(req);
    let exists = false;

    PulseDB.deviceDatastore.find({ id: ID }, (err: any, doc: any) => {
      if (doc.length > 0) {
        exists = true;
      }
    });

    return exists;
  }

  public logoutUser(req: PulseRequest) {
    const ID = this.auth.createUserDeviceID(req);
    let exists = false;

    PulseDB.deviceDatastore.find({ id: ID }, (err: any, doc: any) => {
      if (doc.length > 0) {
        exists = true;
      }
    });

    if (!exists) {
      return;
    } else {
      PulseDB.deviceDatastore.remove({ id: ID });
    }
  }

  public logoutUserByID(id: string) {}

  /**
   * Blacklists a user from the server
   * @param identity The identity of the user to blacklist
   */
  public blackListUser(identity: string) {
    this.blacklist.push(identity);
  }

  /**
   * Adds a user to the server whitelist
   * @param identity The identity of the user to whitelist
   */
  public whiteListUser(identity: string) {
    this.whitelist.push(identity);
  }

  /**
   * Blacklists multiple users from the server
   * @param identities The identities of the users to blacklist
   */
  public blackListUsers(identities: string[]) {
    this.blacklist = [...this.blacklist, ...identities];
  }

  /**
   * Whitelists multiple users from the server
   * @param identities The identities of the users to whitelist
   */
  public whiteListUsers(identities: string[]) {
    this.whitelist = [...this.whitelist, ...identities];
  }

  /**
   * Sets the API Version of the server
   * @param version The version of the API to use
   */
  public setAPIVersion(version: string) {
    this.config.apiVersion = version;
  }

  /**
   * Duh. It Enables Cors
   */
  public enableCors() {
    this.use(this.corsMiddleware);
  }

  /**
   *  Sets the parser of the server for incoming requests. Enables Middleware
   * @param type The type of parser to use for the body of the request
   */
  public setParser(type: PulseBodyFormat) {
    if (type === 'JSON') {
      this.use(this.jsonMiddleware);
    } else if (type === 'RAW') {
      this.use(this.bufferMiddleware);
    } else if (type === 'TEXT') {
      this.use(this.textMiddleware);
    }
  }

  /**
   * Sets the function ran at the predetermine context runtime.
   * @param fn The callback function
   */
  public setContextMiddleware(fn: (req: PulseRequest, res: http.ServerResponse) => void) {
    this.contextFn = fn;
  }

  /**
   * Sets the context of the current request
   * @param data Context data to be passed to the server
   */
  public setContext(data: Record<string, any>) {
    this.context = { ...data };
  }

  /**
   * Gets the current context for the request.
   * @returns The current context of the server
   */
  public getContext() {
    return this.context;
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

  private createPulseResponse(res: http.ServerResponse): PulseResponse {
    // @ts-ignore
    res.json = (data: Record<string, any>) => {
      let newData: any;

      try {
        newData = JSON.stringify(data);
      } catch (err) {
        this.logger.error('Failed to send JSON. There was an issue parsing.' + err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(newData);
    };

    // @ts-ignore
    res.send = (data: string | any[] | Record<string, any> | Buffer) => {
      if (typeof data === 'object' || Array.isArray(data)) {
        try {
          data = JSON.stringify(data);
        } catch (err) {
          this.logger.error('Failed to send JSON. There was an issue parsing.' + err);
          res.statusCode = 500;
          res.end('Internal Server Error');
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(data);
      } else if (typeof data === 'string') {
        res.setHeader('Content-Type', 'text/plain');
        res.end(data);
      } else if (Buffer.isBuffer(data)) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end(data);
      }
    };

    // @ts-ignore
    res.sendFile = (path: string) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          this.logger.error('Failed to send file. ' + err);
          res.statusCode = 500;
          res.end('Internal Server Error');
          return;
        }
        res.end(data);
      });
    };

    // @ts-ignore
    res.paginate = (data: any[], options: PulsePagination) => {
      const limit = options.limit;
      const page = options.page;

      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;

      const results: Record<string, any> = {};

      if (endIndex < data.length) {
        results.next = {
          page: page + 1,
          limit,
        };
      }

      if (startIndex > 0) {
        results.previous = {
          page: page - 1,
          limit,
        };
      }

      results.results = data.slice(startIndex, endIndex);

      let resData: any;

      try {
        resData = JSON.stringify(data);
      } catch (err) {
        this.logger.error('Failed to send JSON. There was an issue parsing.' + err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(resData);
    };

    return res as PulseResponse;
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse, handlers: PulseHandler[]) {
    const next = () => {
      const handler = handlers.shift();
      if (handler) handler(req, this.createPulseResponse(res), next);
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

  private ipGateMiddleware: PulseHandler = (req, res, next) => {
    if (this.config.ipGateMethod === 'BLACKLIST') {
      this.blackListMiddlware(req, res, next);
    } else if (this.config.ipGateMethod === 'WHITELIST') {
      this.whiteListMiddleware(req, res, next);
    } else {
      if (next) next();
    }
  };

  private blackListMiddlware: PulseHandler = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!ip) return;

    if (this.blacklist.includes(ip.toString())) {
      res.statusCode = 401;
      res.end('Unauthorized');
    } else {
      if (next) next();
    }
  };

  private whiteListMiddleware: PulseHandler = (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!ip) return;

    if (this.whitelist.includes(ip.toString())) {
      if (next) next();
    } else {
      res.statusCode = 401;
      res.end('Unauthorized');
    }
  };

  private rateLimitMiddleware: PulseHandler = (req, res, next) => {
    const MAX_REQUESTS = this.config.rateLimit?.maxRequests ?? 100;
    const TIME_FRAME = this.config.rateLimit?.timeMs ?? 3600000; // 1 hour in milliseconds

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Check how many requests this IP made in the time frame
    PulseDB.rateLimitingDatastore.find({ ip, date: { $gt: Date.now() - TIME_FRAME } }, (err: any, docs: any) => {
      if (err) {
        console.error(err);
        res.statusCode = 500;
        res.end('Internal Server Error');
        return;
      }

      if (docs.length > MAX_REQUESTS) {
        res.statusCode = 429; // Too Many Requests
        res.end('Rate limit exceeded');
        return;
      }

      // Store this request
      PulseDB.rateLimitingDatastore.insert({ ip, date: Date.now() }, (err) => {
        if (err) {
          console.error(err);
          res.statusCode = 500;
          res.end('Internal Server Error');
          return;
        }

        // Continue to other middleware/functions
        if (next) next();
      });
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
   * Adds a route to the server that responds to alll HTTP methods
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   * @param options - The options for the route
   * @returns
   */
  public all(path: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder {
    return this.addRoute('ALL', path, handler, options);
  }

  /**
   * Adds a GET route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   * @param options - The options for the route
   */
  public get(path: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder {
    return this.addRoute('GET', path, handler, options);
  }

  /**
   * Adds a POST route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   * @param options - The options for the route
   */
  public post(path: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder {
    return this.addRoute('POST', path, handler, options);
  }

  /**
   * Adds a DELETE route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   * @param options - The options for the route
   */
  public delete(path: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder {
    return this.addRoute('DELETE', path, handler, options);
  }

  /**
   * Adds a PUT route to the server
   * @param path - The path to add the route to
   * @param handler - The handler to add to the route
   * @param options - The options for the route
   */
  public put(path: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder {
    return this.addRoute('PUT', path, handler, options);
  }

  private addRoute(
    method: string,
    path: string,
    handler: PulseHandler,
    options?: PulseRouteOptions,
  ): PulseRouteBuilder {
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
      get: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder => {
        return this.addRoute('GET', path + subPath, handler, options);
      },
      post: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder => {
        return this.addRoute('POST', path + subPath, handler, options);
      },
      put: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder => {
        return this.addRoute('PUT', path + subPath, handler, options);
      },
      delete: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder => {
        return this.addRoute('DELETE', path + subPath, handler, options);
      },
      all: (subPath: string, handler: PulseHandler, options?: PulseRouteOptions): PulseRouteBuilder => {
        return this.addRoute('ALL', path + subPath, handler, options);
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

export * from './route';
