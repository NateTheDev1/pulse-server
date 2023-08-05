import { PulseBodyFormat } from './server';

export type PulseConfig = {
  port: number;
  usePulseLogger?: boolean;
  bodyFormat?: PulseBodyFormat;
  useCors?: boolean;
};
