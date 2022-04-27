import 'source-map-support/register'
import { Agent } from 'http'
import { tests } from './common-http1'
import { test } from 'purple-tape'
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
    await new Promise<void>(resolve => {
        server.close((err?: Error) => {
            t.ok(!err, 'shall call close-callback without an error')
            resolve()
        })
    })
})

test('throw an error if listen fails', async t => {
    const server1 = createHttpServer(() => {})
    const server2 = createHttpServer(() => {})

    await server1.listenAsync(12345)
    try {
        await server2.listenAsync(12345)
        t.fail('shall throw an error if listen fails')
    } catch (err) {
        t.pass('shall throw an error if listen fails')
    }

    await server1.closeAsync()
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

    await new Promise<void>(resolve => {
        server.close((err?: Error) => {
            t.ok(err, 'shall call close-callback with an error')
            resolve()
        })
    })
})
