import { test } from 'purple-tape'
import * as got from 'got'
import { startServer, stopServer, sleep } from './runner'

// tslint:disable no-console

export function tests(protocol: string, createAgent: () => any) {
    test('listen to unix socket port', async t => {
        let agent = createAgent()
        let server = await startServer('./server.js', protocol + '-unix')
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

    test('close after quick request', async t => {
        let agent = createAgent()
        let server = await startServer('./server.js', protocol)
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
        let agent = createAgent()
        let server = await startServer('./server.js', protocol)
        let start = Date.now()
        let requestDone = 0
        let result = ''
        let responseReceived = got
            .get(server.url + '/slow', { agent })
            .then(res => {
                requestDone = Date.now()
                result = res.body
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
}
