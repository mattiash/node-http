# Graceful shutdown

1. Allow use of persistent connections
2. listen() returns a promise that resolves with AddressInfo when the server is listening.
3. close() stops listening for new connections immediately
4. close() closes all idle persistent connections immediately
5. close() closes all non-idle connections as soon as the response to the
   current request has been sent.
6. close() closes all non-idle connections after a timeout, i.e. if it takes
   too long to generate a response, the request is aborted.
7. close() returns a promise that resolves when all connections have been closed
8. Works for http as well as https

Note however that for point 6, only the request is closed;
there is probably someting else that the server is waiting for
in order to generate the response
and that may still block the server from exiting.
