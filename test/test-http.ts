import * as test from 'purple-tape'
import * as got from 'got'
import { startServer, stopServer, sleep } from './runner'
import { Agent } from 'http'

test('close after quick request', async t => {
    let agent = new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000
    })
    let server = await startServer('./server.js', 'http')
    let result = await got.get(server.url + '/quick', { agent })
    let socket = Object.values<any>((agent as any).freeSockets)[0][0]
    socket.on('close', (hadError: boolean) =>
        console.log('socket close', hadError)
    )
    socket.on('end', () => console.log('socket end'))
    t.equal(result.body, 'okay')
    let stopTime = await stopServer(server)
    console.log(`Took ${stopTime}ms to stop`)
    t.ok(stopTime < 500, 'server stopped gracefully')
})

test('close after request finished', async t => {
    let agent = new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000
    })
    let server = await startServer('./server.js', 'http')
    let start = Date.now()
    let requestDone = 0
    let result = ''
    got.get(server.url + '/slow', { agent }).then(res => {
        requestDone = Date.now()
        result = res.body
    })
    await sleep(500)
    await stopServer(server)
    let serverClosed = Date.now()
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

test('abort requests that are too slow', async t => {
    let agent = new Agent({
        keepAlive: true,
        keepAliveMsecs: 5000
    })
    let server = await startServer('./server.js', 'http')
    let start = Date.now()
    let requestDone = 0
    let result = ''
    let resultDone = got
        .get(server.url + '/tooslow', { agent, retries: 0 })
        .then(res => {
            console.log('statusCode', res.statusCode)
            requestDone = Date.now()
            result = res.body
        })
        .catch(err => {
            requestDone = Date.now()
            result = 'aborted'
            console.log(err)
            console.log(err.response.timings)
        })

    await sleep(500)
    await stopServer(server)
    let serverClosed = Date.now()
    await resultDone
    let requestTime = requestDone - start
    t.equal(result, 'aborted', 'Got correct response')
    console.log('requestTime', requestTime)
    t.ok(requestTime < 6000, 'request shall not take too long')
    t.ok(requestTime > 5000, 'request shall not finish too fast')
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

/*
enableGracefulShutdown always closes all sockets after a timeout,
regardless if they have an active request or not. Ideally,
it should

1. Close inactive sockets immediately.
2. Close active sockets as soon as they finish their current request
3. Close sockets that don't finish their request in time after a timeout
*/
