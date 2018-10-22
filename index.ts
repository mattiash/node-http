import * as http from 'http'
import { AddressInfo, Socket } from 'net'
import * as dbg from 'debug'
const debug = dbg('http')

export class HttpServer extends http.Server {
    private isShuttingDown = false
    private idleSocketMap = new Map<Socket, boolean>()

    private static addMethod(server: HttpServer, name: keyof HttpServer) {
        server[name] = HttpServer.prototype[name]
    }

    static decorateServer(orgServer: http.Server) {
        let server = orgServer as HttpServer
        server.idleSocketMap = new Map()
        server.isShuttingDown = false

        HttpServer.addMethod(server, 'listenAsync')
        HttpServer.addMethod(server, 'shutdownAsync')
        HttpServer.addMethod(server, 'onConnection')
        HttpServer.addMethod(server, 'onRequest')

        server.on('connection', (socket: Socket) => server.onConnection(socket))
        server.on(
            'request',
            (req: http.IncomingMessage, res: http.ServerResponse) =>
                server.onRequest(req, res)
        )
        return server
    }

    listenAsync(
        port?: number,
        hostname?: string,
        backlog?: number
    ): Promise<AddressInfo>
    listenAsync(port?: number, hostname?: string): Promise<AddressInfo>
    listenAsync(port?: number, backlog?: number): Promise<AddressInfo>
    listenAsync(port?: number): Promise<AddressInfo>
    listenAsync(
        port?: number,
        p1?: string | number,
        p2?: number
    ): Promise<AddressInfo> {
        return new Promise(resolve => {
            this.listen(port, p1 as any, p2, () =>
                resolve(this.address() as AddressInfo)
            )
        })
    }

    async shutdownAsync(): Promise<void> {
        this.isShuttingDown = true
        // Close server to deny any new connections
        let closingPromise = new Promise(resolve => this.close(() => resolve()))

        debug('No longer listening')

        // Close all idle connections
        this.idleSocketMap.forEach((isIdle, socket) => {
            if (isIdle) {
                debug('Closing idle socket')
                destroy(socket)
                this.idleSocketMap.delete(socket)
            }
        })

        await closingPromise

        // Close all long-running requests after a timeout
    }

    onRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        let socket = req.socket
        this.idleSocketMap.set(socket, false)

        res.on('finish', () => {
            this.idleSocketMap.set(socket, true)
            if (this.isShuttingDown) {
                destroy(socket)
                this.idleSocketMap.delete(socket)
            }
        })
    }

    onConnection(socket: Socket) {
        this.idleSocketMap.set(socket, true)

        socket.on('close', () => {
            this.idleSocketMap.delete(socket)
        })
    }
}

export function createHttpServer(
    requestListener?: (
        request: http.IncomingMessage,
        response: http.ServerResponse
    ) => void
): HttpServer {
    let server = http.createServer(requestListener)
    return HttpServer.decorateServer(server)
}

function destroy(socket: Socket) {
    // Undocumented method that calls end() and then destroy
    // now or when the socket has written all its data.
    ;(socket as any).destroySoon()
}
