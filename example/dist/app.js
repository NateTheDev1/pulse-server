"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pulse_server_1 = __importDefault(require("pulse-server"));
const server = new pulse_server_1.default();
server.get('/login/:id', (req, res) => {
    res.end('Hello World!');
}, {
    apiVersion: '2',
    paramRules: {
        id: 'number',
    },
});
server.start(() => {
    console.log('Server started!');
});
//# sourceMappingURL=app.js.map