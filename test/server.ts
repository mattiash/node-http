import 'source-map-support/register'
import {
    createHttpServer,
    createHttpsServer,
    createHttp2Server
} from '../index'
import * as http from 'http'
import * as http2 from 'http2'
import {} from '../lib/https'
import { readFileSync } from 'fs'

// tslint:disable no-console

const protocol = process.argv[2]

function handler(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.url === '/quick') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('okay')
    } else if (req.url === '/slow') {
        console.log('Slow request received')
        setTimeout(() => {
            console.log('Slow request done')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('okay')
        }, 3000)
    } else {
        process.exit(1)
    }
}

function handler2(
    req: http2.Http2ServerRequest,
    res: http2.Http2ServerResponse
) {
    if (req.url === '/quick') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('okay')
    } else if (req.url === '/slow') {
        console.log('Slow request received')
        setTimeout(() => {
            console.log('Slow request done')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('okay')
        }, 3000)
    } else {
        process.exit(1)
    }
}

const srv =
    protocol === 'http'
        ? createHttpServer(handler)
        : protocol === 'https'
        ? createHttpsServer(
              {
                  key: readFileSync('./server.key'),
                  cert: readFileSync('./server.crt'),
                  requestCert: false,
                  rejectUnauthorized: false
              },
              handler
          )
        : createHttp2Server({}, handler2)

async function run() {
    let address = await srv.listenAsync()
    console.log(
        `Listening on ${protocol === 'http2' ? 'http' : protocol}://127.0.0.1:${
            address.port
        }`
    )
    process.on('SIGTERM', async () => {
        await srv.closeAsync()
        console.log('Server has been shut down')
    })
}

run().catch(err => console.log(err))
