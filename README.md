# @mattiash/http

[![NPM Version](https://img.shields.io/npm/v/@mattiash/http.svg)](https://www.npmjs.com/package/@mattiash/http) [![Build Status](https://travis-ci.org/mattiash/node-http.svg?branch=master)](https://travis-ci.org/mattiash/node-http) [![Coverage Status](https://coveralls.io/repos/github/mattiash/node-http/badge.svg?branch=master)](https://coveralls.io/github/mattiash/node-http?branch=master)

Opinionated http(s) server.

This module implements an http/https-server that behaves the way I think it should behave:

1. Allow use of persistent connections
2. listenAsync() returns a promise that resolves with AddressInfo when the server is listening.
3. close() stops listening for new connections immediately
4. close() closes all idle persistent connections immediately
5. close() closes all non-idle connections as soon as the response to the
   current request has been sent.
6. closeAsync() does the same thing as close and returns a promise that resolves when all connections have been closed
7. Works for http as well as https
8. Has type-definitions for typescript.
9. Has tests that check that it actually closes persistent connections correctly.

## API

The module exports two functions, `createHttpServer` and `createHttpsServer`.

### createHttpServer

Takes a requestListener argument that is passed unmodified to node's [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener).
Returns an an object that inherits from node's [http.Server](https://nodejs.org/api/http.html#http_class_http_server)
and extends it with the following two methods:

#### listenAsync

Starts listening for new connections.
Takes the same arguments as http.Server.listen.
Returns a promise that resolves with the result of http.Server.address()
when the server is actually listening.

#### closeAsync()

Closes the server as described above.
Returns a promise that resolves when the server has stopped listening
and all persistent connections have been closed.

### createHttpsServer

Same as createHttpServer but for https.

## Example

```typescript
import { createHttpServer } from '@mattiash/http'

let srv = createHttpServer((_req, res) => {
    res.writeHead(200)
    res.end('okay')
})

async function run() {
    let address = await srv.listenAsync()
    console.log(`Listening on port ${address.port}`)
    process.on('SIGINT', async () => {
        await srv.closeAsync()
        console.log('Server has been shut down')
    })
}

run()
```
