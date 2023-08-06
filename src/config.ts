import { PulseBodyFormat } from './server';

export type PulseConfig = {
  port: number;
  usePulseLogger?: boolean;
  bodyFormat?: PulseBodyFormat;
  useCors?: boolean;
  apiVersion?: string;
  disableParamMiddleware?: boolean;
  staticLogFile?: boolean;
  staticLogFileName?: string;
};
