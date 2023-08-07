import { PulseBodyFormat, PulseIPGateMethod } from './server';

export type PulseConfig = {
  port: number;
  usePulseLogger?: boolean;
  bodyFormat?: PulseBodyFormat;
  useCors?: boolean;
  apiVersion?: string;
  disableParamMiddleware?: boolean;
  staticLogFile?: boolean;
  staticLogFileName?: string;
  rateLimit?: {
    enabled: boolean;
    timeMs: number;
    maxRequests: number;
  };
  dashboard?: boolean;
  ipGateMethod?: PulseIPGateMethod;
};
