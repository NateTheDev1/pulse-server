# Pulse Server Package

- [x] server creator
- [x] custom logger
- [ ] PulseErrors handler
- [ ] logging config for static log files
- [x] config
- [ ] Content type accept rules
- [ ] exported types
- [ ] built in cors middleware
- [ ] implement basic express middleware
- [ ] routes
- [ ] middleware
- [ ] built in middleware enabled in config
- [ ] built in pulse socket
- [ ] pulse socket uses in memory database to track connections and send updates to connections. Clients subscribe to specific database tables or even rows.
- [ ] Defined pulse schema creator using PulseType which creates the tracking foundation
- [ ] built in auth library
- [ ] Rate Limiting Support
- [ ] documented functions
- [ ] Multiple Or Single Location login support
- [ ] AI/logic powered whitelist/blacklist system with custom rules. Uses logic to flag users
- [ ] Built in performance monitoring config
- [ ] No more cookies or auth tokens in local storage. Check for hardware ID on the server for authentication
- [ ] Built In Dashboard Application to view security features and auto documentation for your API
- [ ] Built in routes (config based) for building your own administration apps
  - [x] Readable pulse.toml or pulse.json for config with typescript overrides in app
- [ ] Pulse queries for easy data fetching
- [ ] Nested routing is intuitive
- [ ] Route versioning: Versioning Support: Many APIs need to be versioned. Rather than manually handling the versioning, Express.js could provide a built-in mechanism for defining multiple versions of routes, and automatically routing requests to the correct version based on the request headers or URL.
- [ ] Auto route param validation if configured using typescript types
- [ ] Auto version routing for different routes on different api versions
- [ ] Development helpfulness: Tells you duplicate route errors, hints for bad route naming
- [ ] Route tracer
- [ ] Built in pagination support
- [ ] Machine learning performance optimization (Stretch goal)
- [ ] Type generator for clients
- [ ] Context middleware like graphql
- [ ] CLI tool built with rust
