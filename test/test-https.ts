import { Agent } from 'https'
import { tests } from './common'

function createAgent() {
    return new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000,
        rejectUnauthorized: false
    })
}

tests('https', createAgent)
