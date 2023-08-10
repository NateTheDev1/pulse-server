# Welcome To Pulse

> Below are the steps to get started with Pulse as well as documentation for the various features of the framework.

## What is Pulse?

Pulse is a lightweight server framework for Node.js. However, it isn't just a server framework, the primary focus of Pulse is reliability and validitity. Pulse works to create an ecosystem between the client and server that keeps clients up to date even when the server is under stress.

Pulse makes it easy to provide realtime data to clients while keeping them all in sync without all the traditional setup. With pulse it's as easy as initializing a Pulse router, connecting your Pulse clients and enabling the data properties you want pulse to keep up on.

Pulse takes a lot of inspiration from the [GraphQL](https://graphql.org/) project as well as the [Express.JS](https://expressjs.com/) project. Pulse is designed to be a lightweight framework that can be used in conjunction with other frameworks or as a standalone framework.

## Pulse Dependencies

Pulse would love to give a huge thanks to the open source packages that we rely on:

- [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- [body-parser](https://www.npmjs.com/package/body-parser)
- [cors](https://www.npmjs.com/package/cors)
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
- [log4js](https://www.npmjs.com/package/log4js)
- [nedb](https://www.npmjs.com/package/nedb)
- [toml](https://www.npmjs.com/package/toml)
- [uuid](https://www.npmjs.com/package/uuid)
- [ws](https://www.npmjs.com/package/ws)
- [jest](https://www.npmjs.com/package/jest)
- [prettier](https://www.npmjs.com/package/prettier)
- [react](https://www.npmjs.com/package/react)
- [react-dom](https://www.npmjs.com/package/react-dom)
- [rimraf](https://www.npmjs.com/package/rimraf)
- [ts-jest](https://www.npmjs.com/package/ts-jest)
- [ts-node](https://www.npmjs.com/package/ts-node)
- [tslint](https://www.npmjs.com/package/tslint)
- [typescript](https://www.npmjs.com/package/typescript)

## Pulse Modules

Pulse modules are separate NPM packages that are installed and used together in the Pulse ecosystem. The only optional package is [pulse-cli](https://www.npmjs.com/package/pulse-cli) which is more of a helper tool than a module.

### Pulse Server

Pulse Server is the server framework running both the HTTP server as well as the Pulse Socket (Websocket Connection) to the client.

<a href="https://pulsesdk.com/learn/server/server-quick-start">Read More</a>

### Pulse Client

Pulse Client is the client framework wrapping your React app making sure `PulseDocs` are sent and received correctly from the server.

<a href="https://pulsesdk.com/learn/client/client-quick-start">Read More</a>

### Pulse CLI

Pulse CLI is the CLI tool that can be installed globally to help you work with the Pulse ecosystem. It is a very minimal package but with newer releases of `pulse-server` and `pulse-client` other helpful tools may be added.

<a href="https://pulsesdk.com/learn/cli/cli-quick-start">Read More</a>
