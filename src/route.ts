/**
 * Copyright 2023 Nathaniel Richards
 * This document is licensed under the terms of the MIT License.
 */

import querystring from 'querystring';
import { PulseHandler } from './server';

export type PulseRoutePattern = {
  original: string;
  segments: string[];
};

export interface PulseRouteBuilder {
  get: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  post: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  put: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  delete: (path: string, handler: PulseHandler) => PulseRouteBuilder;
  all: (path: string, handler: PulseHandler) => PulseRouteBuilder;
}

export type PulseRouteOptions = {
  apiVersion?: string;
  paramRules?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'>;
};

export type PulseRouteInfo = {
  handler: PulseHandler;
  pattern: PulseRoutePattern;
  paramRules?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any'>;
};

export function matchRoute(pattern: PulseRoutePattern, urlPath: string): querystring.ParsedUrlQuery | null {
  const urlSegments = urlPath.split('/');

  if (pattern.segments.length !== urlSegments.length) {
    return null;
  }

  const params: querystring.ParsedUrlQuery = {};

  for (let i = 0; i < pattern.segments.length; i++) {
    const patternSegment = pattern.segments[i];
    const urlSegment = urlSegments[i];

    if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1);
      params[paramName] = urlSegment;
    } else if (patternSegment !== urlSegment) {
      return null;
    }
  }

  return params;
}
