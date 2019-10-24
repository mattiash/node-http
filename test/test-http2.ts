import 'source-map-support/register'
import * as test from 'purple-tape'
import * as http2 from 'http2'
import { URL } from 'url'

import { createHttp2Server } from '..'
import { startServer, stopServer, sleep } from './runner'

// tslint:disable no-console

function request(targetUrl: string): Promise<string> {
    return new Promise(resolve => {
        const u = new URL(targetUrl)
        const session = http2.connect(u.origin)
        session.on('error', err => console.error(err))
        session.on('close', () => console.log('client session closed'))
        const req = session.request({ ':path': u.pathname })

        req.setEncoding('utf8')
        let data = ''
        req.on('data', chunk => {
            data += chunk
        })
        req.on('end', () => {
            // Don't close the session here!
            resolve(data)
        })
        req.end()
    })
}
const protocol = 'http2'

test('close after quick request', async t => {
    let server = await startServer('./server.js', protocol)
    let result = await request(server.url + '/quick')

    t.equal(result, 'okay')
    let stopTime = await stopServer(server)
    console.log(`Took ${stopTime}ms to stop`)
    t.ok(stopTime < 500, 'server stopped gracefully')
})

test('close after request finished', async t => {
    let server = await startServer('./server.js', protocol)
    let start = Date.now()
    let requestDone = 0
    let result = ''
    const responseReceived = request(server.url + '/slow').then(res => {
        requestDone = Date.now()
        result = res
    })
    await sleep(1000)
    await stopServer(server)
    let serverClosed = Date.now()
    console.log('server closed X')
    await responseReceived
    let requestTime = requestDone - start
    t.equal(result, 'okay', 'Got correct response')
    t.ok(requestTime < 4000, 'request shall not take too long')
    t.ok(requestTime > 2000, 'request shall not finish too fast')
    t.ok(
        serverClosed - requestDone < 500,
        'server shall stop less than 500 ms after request finished'
    )
    let requestDoneLineNo = server.runner.output.findIndex(
        s => s === 'Slow request done'
    )
    let serverShutdownLineNo = server.runner.output.findIndex(
        s => s === 'Server has been shut down'
    )

    t.ok(requestDoneLineNo > -1, 'request done logged')
    t.ok(serverShutdownLineNo > -1, 'server shutdown logged')
    t.ok(
        requestDoneLineNo < serverShutdownLineNo,
        'request done logged before server shutdown'
    )
})

test('close()', async t => {
    let server = createHttp2Server({}, () => {})

    await server.listenAsync()
    await new Promise(resolve => {
        server.close((err?: Error) => {
            t.ok(!err, 'shall call close-callback without an error')
            resolve()
        })
    })
})

test('close without listening', async t => {
    let server = createHttp2Server({}, () => {})

    try {
        await server.closeAsync()
        t.fail('shall throw an error')
    } catch (e) {
        t.pass('shall throw an error')
    }

    server = createHttp2Server({}, () => {})

    await new Promise(resolve => {
        server.close((err?: Error) => {
            t.ok(err, 'shall call close-callback with an error')
            resolve()
        })
    })
})
