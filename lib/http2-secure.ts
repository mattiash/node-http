import * as base from 'http2'
import * as tls from 'tls'
import { AddressInfo } from 'net'

export class Http2SecureServer extends tls.Server
    implements base.Http2SecureServer {
    private sessions!: Set<base.Http2Session>

    private static addMethod(server: any, name: keyof Http2SecureServer) {
        server[name] = Http2SecureServer.prototype[name]
    }

    static decorateServer(orgServer: base.Http2Server) {
        let server = orgServer as Http2SecureServer
        server.sessions = new Set()

        Http2SecureServer.addMethod(server, 'listenAsync')
        Http2SecureServer.addMethod(server, 'closeAsync')
        Http2SecureServer.addMethod(server, 'close')
        Http2SecureServer.addMethod(server, 'onSession')

        server.on('session', (session: base.Http2Session) =>
            server.onSession(session)
        )

        return server
    }

    // This is never actually called
    setTimeout(_msec: number, _cb: () => void) {
        return this
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

export function createHttp2SecureServer(
    options: base.SecureServerOptions,
    requestListener?: (
        request: base.Http2ServerRequest,
        response: base.Http2ServerResponse
    ) => void
): Http2SecureServer {
    let server = base.createSecureServer(options, requestListener)
    return Http2SecureServer.decorateServer(server)
}
