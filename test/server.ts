import 'source-map-support/register'
import {
    createHttpServer,
    createHttpsServer,
    createHttp2Server,
    createHttp2SecureServer
} from '../index'
import * as http from 'http'
import * as http2 from 'http2'
import {} from '../lib/https'
import { readFileSync } from 'fs'

// tslint:disable no-console

const protocol = process.argv[2] as
    | 'http'
    | 'http-unix'
    | 'https'
    | 'https-unix'
    | 'http2-insecure'
    | 'http2-insecure-unix'
    | 'http2-secure'
    | 'http2-secure-unix'

function handler(
    req: http.IncomingMessage | http2.Http2ServerRequest,
    res: http.ServerResponse | http2.Http2ServerResponse
) {
    if (req.url === '/quick') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('okay' as any)
    } else if (req.url === '/slow') {
        console.log('Slow request received')
        setTimeout(() => {
            console.log('Slow request done')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('okay' as any)
        }, 3000)
    } else {
        process.exit(1)
    }
}

function createServer() {
    switch (protocol) {
        case 'http':
        case 'http-unix':
            return createHttpServer(handler)
        case 'https':
        case 'https-unix':
            return createHttpsServer(
                {
                    key: readFileSync('./server.key'),
                    cert: readFileSync('./server.crt')
                },
                handler
            )
        case 'http2-insecure':
        case 'http2-insecure-unix':
            return createHttp2Server({}, handler)
        case 'http2-secure':
        case 'http2-secure-unix':
            return createHttp2SecureServer(
                {
                    key: readFileSync('./server.key'),
                    cert: readFileSync('./server.crt')
                },
                handler
            )
        default:
            throw new Error('Unknown protocol ' + protocol)
    }
}
const srv = createServer()

async function run() {
    const urlProtocol = {
        http: 'http',
        'http-unix': 'http',
        https: 'https',
        'https-unix': 'https',
        'http2-insecure': 'http',
        'http2-insecure-unix': 'http',
        'http2-secure': 'https',
        'http2-secure-unix': 'https'
    }[protocol]

    if (protocol.match(/unix/)) {
        await srv.listenAsync('/tmp/mattiash-node-http')
        console.log(
            `Listening on ${urlProtocol}://unix:/tmp/mattiash-node-http:`
        )
    } else {
        let address = await srv.listenAsync()
        console.log(`Listening on ${urlProtocol}://127.0.0.1:${address.port}`)
    }

    process.on('SIGTERM', async () => {
        await srv.closeAsync()
        console.log('Server has been shut down')
    })
}

run().catch(err => console.log(err))
