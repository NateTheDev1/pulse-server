/// <reference types="node" />
import http from 'http';
import { PulseConfig } from './config';
export type PulseHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;
export type PulseError = {};
declare class PulseServer {
    private server;
    private config;
    private routes;
    constructor(config: PulseConfig);
    get(path: string, handler: PulseHandler): void;
    post(path: string, handler: PulseHandler): void;
    delete(path: string, handler: PulseHandler): void;
    private routeFallback;
    start(callback: () => void): void;
}
export default PulseServer;
//# sourceMappingURL=index.d.ts.map