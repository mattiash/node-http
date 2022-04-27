import 'source-map-support/register'
import { Agent } from 'https'
import { tests } from './common-http1'
import { test } from 'purple-tape'
import { createHttpsServer } from '..'

function createAgent() {
    return new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000,
        rejectUnauthorized: false
    })
}

tests('https', createAgent)

test('close()', async t => {
    let server = createHttpsServer({}, () => {})

    await server.listenAsync()
    await new Promise<void>(resolve => {
        server.close((err?: Error) => {
            t.ok(!err, 'shall call close-callback without an error')
            resolve()
        })
    })
})

test('close without listening', async t => {
    let server = createHttpsServer({}, () => {})

    try {
        await server.closeAsync()
        t.fail('shall throw an error')
    } catch (e) {
        t.pass('shall throw an error')
    }

    server = createHttpsServer({}, () => {})

    await new Promise<void>(resolve => {
        server.close((err?: Error) => {
            t.ok(err, 'shall call close-callback with an error')
            resolve()
        })
    })
})

test('throw an error if listen fails', async t => {
    const server1 = createHttpsServer({}, () => {})
    const server2 = createHttpsServer({}, () => {})

    await server1.listenAsync(12345)
    try {
        await server2.listenAsync(12345)
        t.fail('shall throw an error if listen fails')
    } catch (err) {
        t.pass('shall throw an error if listen fails')
    }

    await server1.closeAsync()
})
