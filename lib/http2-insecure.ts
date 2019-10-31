import * as base from 'http2'
import * as net from 'net'
import { AddressInfo } from 'net'

export class Http2Server extends net.Server implements base.Http2Server {
    private sessions!: Set<base.Http2Session>

    private static addMethod(server: any, name: keyof Http2Server) {
        server[name] = Http2Server.prototype[name]
    }

    static decorateServer(orgServer: base.Http2Server) {
        let server = orgServer as Http2Server
        server.sessions = new Set()

        Http2Server.addMethod(server, 'listenAsync')
        Http2Server.addMethod(server, 'closeAsync')
        Http2Server.addMethod(server, 'close')
        Http2Server.addMethod(server, 'onSession')

        server.on('session', (session: base.Http2Session) =>
            server.onSession(session)
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

    close(callback?: Function) {
        this.closeAsync()
            .then(() => (callback ? callback() : undefined))
            .catch((err: Error) => (callback ? callback(err) : undefined))
        return this
    }

    // This is never actually called
    setTimeout(_msec: number, _cb: () => void) {
        return this
    }

    async closeAsync(): Promise<void> {
        // Close server to deny any new connections
        let closingPromise = new Promise((resolve, reject) =>
            super.close((err: Error | undefined) =>
                err ? reject(err) : resolve()
            )
        )

        // Tell all sessions to close
        this.sessions.forEach(session => {
            session.close()
            this.sessions.delete(session)
        })

        await closingPromise
    }

    onSession(session: base.Http2Session) {
        this.sessions.add(session)

        session.on('close', () => {
            this.sessions.delete(session)
        })
    }
}

export function createHttp2Server(
    options: base.ServerOptions,
    requestListener?: (
        request: base.Http2ServerRequest,
        response: base.Http2ServerResponse
    ) => void
): Http2Server {
    let server = base.createServer(options, requestListener)
    return Http2Server.decorateServer(server)
}
