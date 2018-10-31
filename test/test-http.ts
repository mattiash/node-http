import { Agent } from 'http'
import { tests } from './common'

function createAgent() {
    return new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000
    })
}

tests('http', createAgent)
