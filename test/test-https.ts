import 'source-map-support/register'
import { Agent } from 'https'
import { tests } from './common'
import * as test from 'purple-tape'
import { createHttpsServer } from '..'

function createAgent() {
    return new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000,
        rejectUnauthorized: false
    })
}

tests('https', createAgent)

test('close without listening', async t => {
    let server = createHttpsServer({}, () => {})

    try {
        await server.closeAsync()
        t.fail('shall throw an error')
    } catch (e) {
        t.pass('shall throw an error')
    }
})
