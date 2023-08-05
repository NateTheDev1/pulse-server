import http from 'http';
class PulseServer {
    server;
    config;
    routes;
    constructor(config) {
        this.routes = {};
        this.config = config;
        this.server = http.createServer((req, res) => {
            const handler = this.routes[req.url][req.method] || this.routeFallback;
            handler(req, res);
        });
    }
    get(path, handler) {
        if (!this.routes[path]) {
            this.routes[path] = {};
        }
        this.routes[path]['GET'] = handler;
    }
    post(path, handler) {
        if (!this.routes[path]) {
            this.routes[path] = {};
        }
        this.routes[path]['POST'] = handler;
    }
    delete(path, handler) {
        if (!this.routes[path]) {
            this.routes[path] = {};
        }
        this.routes[path]['DELETE'] = handler;
    }
    routeFallback(req, res) {
        res.statusCode = 400;
        res.end('Bad Request');
    }
    start(callback) {
        this.server.listen(this.config.port, callback);
    }
}
export default PulseServer;
//# sourceMappingURL=index.js.map