import 'source-map-support/register'
import { Agent } from 'http'
import { tests } from './common'
import * as test from 'purple-tape'
import { createHttpServer } from '..'

function createAgent() {
    return new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000
    })
}

tests('http', createAgent)

test('close without listening', async t => {
    let server = createHttpServer(() => {})

    try {
        await server.closeAsync()
        t.fail('shall throw an error')
    } catch (e) {
        t.pass('shall throw an error')
    }
})
