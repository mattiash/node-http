# Graceful http server

1. Allow use of persistent connections
2. listen() returns a promise that resolves with AddressInfo when the server is listening.
3. close() stops listening for new connections immediately
4. close() closes all idle persistent connections immediately
5. close() closes all non-idle connections as soon as the response to the
   current request has been sent.
6. close() returns a promise that resolves when all connections have been closed
7. Works for http as well as https
