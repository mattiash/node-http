import { spawn, ChildProcess, SpawnOptions } from 'child_process'
import { ReadLine, createInterface } from 'readline'
import { Readable } from 'stream'

// tslint:disable no-console

export class Runner {
    private child!: ChildProcess
    private stdout!: ReadLine
    private stderr!: ReadLine
    output: string[] = []
    onStdout?: (d: string) => void
    onStderr?: (d: string) => void
    private stopping: boolean | (() => void) = false

    constructor(cmd: string, args: Array<string>, options: SpawnOptions) {
        this.child = spawn(cmd, args, options)

        this.stdout = createInterface({
            input: this.child.stdout as Readable,
            terminal: false
        })

        this.stderr = createInterface({
            input: this.child.stderr as Readable,
            terminal: false
        })

        this.child.on('close', (code: number, signal: string) => {
            if (this.stopping) {
                console.log('Child exited as instructed')
                if (typeof this.stopping === 'function') {
                    this.stopping()
                }
            } else {
                if (signal) {
                    console.log(
                        'child terminated due to receipt of signal ' + signal
                    )
                } else {
                    console.log('child terminated with code ' + code)
                }
            }
        })

        this.child.on('exit', (code: number, signal: string) => {
            if (signal) {
                console.log(
                    'child exit event due to receipt of signal ' + signal
                )
            } else {
                console.log('child exit event with code ' + code)
            }
        })

        this.stdout.on('line', (data: Buffer) => {
            this.output.push(data.toString())
            if (this.onStdout) {
                this.onStdout(data.toString())
            } else {
                console.log(data.toString())
            }
        })

        this.stderr.on('line', (data: Buffer) => {
            this.output.push(data.toString())
            if (this.onStderr) {
                this.onStderr(data.toString())
            } else {
                console.log(data.toString())
            }
        })

        this.child.on('error', (err: Error) => {
            console.log('child terminated with error ' + err)
        })
    }

    stop() {
        return new Promise(resolve => {
            this.stopping = resolve
            this.child.kill('SIGTERM')
            console.log('Telling child to exit')
        })
    }

    kill(signal: string) {
        this.child.kill(signal)
    }
}

// Start a server from a nodejs-script with a separate node
// process
export function startServer(
    cmd: string,
    arg: string
): Promise<{ url: string; runner: Runner }> {
    return new Promise(resolve => {
        let runner = new Runner('node', [cmd, arg], {
            cwd: __dirname,
            env: process.env
        })
        runner.onStdout = (line: string) => {
            console.log(line)
            let match = line.match(/Listening on (\S+)/)
            if (match) {
                resolve({ runner, url: match[1] })
            }
        }
    })
}

// Resolves with the number of ms it took to stop the server
export async function stopServer(server: { url: string; runner: Runner }) {
    let start = Date.now()

    await server.runner.stop()
    return Date.now() - start
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms).unref())
}
