import { createHttpServer } from '../index'
import * as dbg from 'debug'
const debug = dbg('http')

import * as http from 'http'

const protocol = process.argv[2]

function handler(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.url === '/quick') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('okay')
    } else if (req.url === '/slow') {
        setTimeout(() => {
            console.log('Slow request done')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('okay')
        }, 3000)
    } else if (req.url === '/tooslow') {
        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('okay')
        }, 30000).unref()
    } else {
        debug('Unknown url ' + req.url)
        process.exit(1)
    }
}

const srv = createHttpServer(handler)

async function run() {
    let address = await srv.listenAsync()
    console.log(`Listening on ${protocol}://127.0.0.1:${address.port}`)
    process.on('SIGTERM', async () => {
        debug('Will shut down server')
        await srv.shutdownAsync()
        console.log('Server has been shut down')
    })
}

run()
