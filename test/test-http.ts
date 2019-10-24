import 'source-map-support/register'
import { Agent } from 'http'
import { tests } from './common-http1'
import * as test from 'purple-tape'
import { createHttpServer } from '..'

function createAgent() {
    return new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000
    })
}

tests('http', createAgent)

test('close()', async t => {
    let server = createHttpServer(() => {})

    await server.listenAsync()
    await new Promise(resolve => {
        server.close((err?: Error) => {
            t.ok(!err, 'shall call close-callback without an error')
            resolve()
        })
    })
})

test('close without listening', async t => {
    let server = createHttpServer(() => {})

    try {
        await server.closeAsync()
        t.fail('shall throw an error')
    } catch (e) {
        t.pass('shall throw an error')
    }

    server = createHttpServer(() => {})

    await new Promise(resolve => {
        server.close((err?: Error) => {
            t.ok(err, 'shall call close-callback with an error')
            resolve()
        })
    })
})
