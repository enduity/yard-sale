/**
 * Based on the original in the CycleTLS repository (also GPL-3.0 licensed)
 * https://github.com/Danny-Dasilva/CycleTLS/blob/3b2eba0c15ca87b5710165441be2adbde41380c0/src/index.ts
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import * as http from 'http';
import os from 'os';
import util from 'util';
import FormData from 'form-data';
import { Readable, Writable } from 'stream';
import { promisify } from 'util';
import stream from 'stream';

const pipeline = promisify(stream.pipeline);

export interface Cookie {
    name: string;
    value: string;
    path?: string;
    domain?: string;
    expires?: string;
    rawExpires?: string;
    maxAge?: number;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: string;
    unparsed?: string;
}

export interface TimeoutOptions {
    /** How long should we wait on a request response before giving up */
    requestTimeout: number;
    /** How long should we wait before giving up on the request received handshake */
    acknowledgementTimeout?: number;
}

export interface CycleTLSRequestOptions {
    headers?: {
        [key: string]: unknown;
    };
    cookies?:
        | Array<object>
        | {
              [key: string]: string;
          };
    body?: string | URLSearchParams | FormData;
    ja3?: string;
    userAgent?: string;
    proxy?: string;
    timeout?: number;
    disableRedirect?: boolean;
    headerOrder?: string[];
    insecureSkipVerify?: boolean;
    forceHTTP1?: boolean;
}

export interface CycleTLSResponse {
    status: number;
    body:
        | string
        | {
              [key: string]: unknown;
          };
    headers: {
        [key: string]: unknown;
    };
    finalUrl: string;
}

let child: ChildProcessWithoutNullStreams;
let lastRequestID: string;

const cleanExit = async (message?: string | Error, exit?: boolean) => {
    if (message) console.log(message);
    exit = exit ?? true;

    child?.kill();
    if (exit) process.exit();
};
process.on('SIGINT', () => cleanExit());
process.on('SIGTERM', () => cleanExit());

const handleSpawn = (
    debug: boolean,
    fileName: string,
    port: number,
    filePath?: string,
) => {
    const isWin = process.platform === 'win32';
    const execPath = filePath ?? path.join(__dirname, fileName);
    const dirname = path.dirname(execPath);
    const basename = path.basename(execPath);

    child = spawn(isWin ? basename : execPath, [], {
        cwd: isWin ? dirname : undefined,
        env: { ...process.env, WS_PORT: port.toString() },
        shell: false,
        windowsHide: true,
        detached: true,
    });

    child.stderr.on('data', (stderr) => {
        if (stderr.toString().includes('Request_Id_On_The_Left')) {
            const splitRequestIdAndError = stderr
                .toString()
                .split('Request_Id_On_The_Left');
            const [requestId, error] = splitRequestIdAndError;
            console.error(`Non-fatal error for request ID: ${requestId} -> ${error}`);
        } else {
            if (debug) {
                void cleanExit(new Error(stderr));
            } else {
                cleanExit(
                    `Error processing request (last request ID was ${lastRequestID}) -> ${stderr}`,
                    false,
                ).then(() => handleSpawn(debug, fileName, port, filePath));
            }
        }
    });
};

// Function to convert a stream into a string
async function streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    await pipeline(
        stream,
        new Writable({
            write(
                chunk: Buffer,
                _encoding: BufferEncoding,
                callback: (error?: Error | null) => void,
            ) {
                chunks.push(chunk);
                callback();
            },
        }),
    );
    return Buffer.concat(chunks).toString('utf8');
}

class Golang extends EventEmitter {
    server: WebSocket | null = null;
    queue: Array<string> = [];
    isHost: boolean = false;
    queueId: NodeJS.Timeout | null = null;

    private readonly timeout: number;
    private port: number;
    private readonly debug: boolean;
    private readonly filePath?: string;
    private failedInitialization: boolean = false;

    constructor(port: number, debug: boolean, timeout: number, filePath?: string) {
        super();

        this.port = port;
        this.debug = debug;
        this.timeout = timeout;
        this.filePath = filePath;

        this.spawnOrUseExisting();
    }

    spawnOrUseExisting() {
        const server = http.createServer();
        const listen = server.listen(this.port);
        listen
            .on('listening', () => {
                if (this.port === 0) {
                    if (server.address() && typeof server.address() === 'object') {
                        this.port = (server.address() as { port: number }).port;
                    } else {
                        throw new Error('CycleTLS failed to get OS-assigned port');
                    }
                }
                server.close(() => {
                    this.spawnServer();
                    this.isHost = true;
                });
            })
            .on('error', (error) => {
                console.error(
                    `CycleTLS failed to start server on port ${this.port} - ${error}`,
                );
                console.log('CycleTLS attempting to connect to existing server');
                this.createClient();
                this.isHost = false;
            });
    }

    spawnServer() {
        const PLATFORM_BINARIES: { [platform: string]: { [arch: string]: string } } = {
            win32: { x64: 'index.exe' },
            linux: { arm: 'index-arm', arm64: 'index-arm64', x64: 'index' },
            darwin: { x64: 'index-mac', arm: 'index-mac-arm', arm64: 'index-mac-arm64' },
            freebsd: { x64: 'index-freebsd' },
        };

        const executableFilename = PLATFORM_BINARIES[process.platform]?.[os.arch()];
        if (!executableFilename) {
            void cleanExit(
                new Error(
                    `Unsupported architecture ${os.arch()} for ${process.platform}`,
                ),
            );
        }

        handleSpawn(this.debug, executableFilename, this.port, this.filePath);

        this.createClient();
    }

    createClient() {
        // In-line function that represents a connection attempt
        const attemptConnection = () => {
            const server = new WebSocket(`ws://localhost:${this.port}`);

            server.on('open', () => {
                // WebSocket connected - set server and emit ready
                this.server = server;

                this.server.on('message', (data: string) => {
                    const message = JSON.parse(data);
                    this.emit(message.RequestID, message);
                });

                this.emit('ready');
            });

            server.on('error', () => {
                // Connection error - retry in .1s
                server.removeAllListeners();

                setTimeout(() => {
                    // If we've failed to initialize, stop the loop
                    if (this.failedInitialization) {
                        return;
                    }

                    attemptConnection();
                }, 100);
            });
        };
        attemptConnection();

        // Set a timeout representing the initialization timeout that'll reject the promise if not initialized within the timeout
        setTimeout(() => {
            this.failedInitialization = true;
            this.emit(
                'failure',
                `Could not connect to the CycleTLS instance within ${this.timeout}ms`,
            );
        }, this.timeout);
    }

    async request(
        requestId: string,
        options: CycleTLSRequestOptions & {
            url: string;
            method?:
                | 'head'
                | 'get'
                | 'post'
                | 'put'
                | 'delete'
                | 'trace'
                | 'options'
                | 'connect'
                | 'patch';
        },
    ): Promise<void> {
        lastRequestID = requestId;

        // Check if options.body is URLSearchParams and convert to string
        if (options.body instanceof URLSearchParams) {
            options.body = options.body.toString();
        }
        // Check if options.body is FormData and convert to string
        if (options.body instanceof FormData) {
            options.headers = { ...options.headers, ...options.body.getHeaders() };
            options.body = await streamToString(options.body as unknown as Readable);
        }

        if (this.server) {
            this.server.send(JSON.stringify({ requestId, options }), (err) => {
                // An error occurred sending the webhook to a server we already confirmed exists - let's get back up and running

                // First, we'll create a queue to store the failed request
                // Do a check to make sure server isn't null to prevent a race condition where multiple requests fail
                if (err) {
                    if (this.server != null) {
                        // Add failed request to queue
                        this.server = null;

                        // Just resend the request so that it adds to queue properly
                        this.request(requestId, options);

                        // Start process of client re-creation
                        this.spawnOrUseExisting();
                    } else {
                        // Add to queue and hope server restarts properly
                        this.queue.push(JSON.stringify({ requestId, options }));
                    }
                }
            });
        } else {
            this.queue.push(JSON.stringify({ requestId, options }));

            if (this.queueId == null) {
                this.queueId = setInterval(() => {
                    // If we failed to initialize - clear the queue
                    if (this.failedInitialization) {
                        if (this.queueId) clearInterval(this.queueId);
                        this.queue = [];
                        this.queueId = null;
                        return;
                    }

                    // If the server is available - empty the queue into the server and delete the queue
                    if (this.server) {
                        for (const request of this.queue) {
                            this.server.send(request);
                        }
                        this.queue = [];
                        if (this.queueId) clearInterval(this.queueId);
                        this.queueId = null;
                    }
                }, 100);
            }
        }
    }

    exit(): Promise<undefined> {
        return new Promise((resolve) => {
            console.log('Exiting CycleTLS');
            this.server?.close();
            if (this.isHost) {
                child?.kill();
                resolve(undefined);
            } else {
                resolve(undefined);
            }
        });
    }
}

export interface CycleTLSClient {
    (
        url: string,
        options: CycleTLSRequestOptions,
        method?:
            | 'head'
            | 'get'
            | 'post'
            | 'put'
            | 'delete'
            | 'trace'
            | 'options'
            | 'connect'
            | 'patch',
    ): Promise<CycleTLSResponse>;

    head(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    get(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    post(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    put(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    delete(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    trace(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    options(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    connect(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    patch(url: string, options: CycleTLSRequestOptions): Promise<CycleTLSResponse>;

    exit(): Promise<undefined>;
}

const initCycleTLS = async (
    initOptions: {
        port?: number;
        debug?: boolean;
        timeout?: number;
        executablePath?: string;
    } = {},
): Promise<CycleTLSClient> => {
    return new Promise((resolveReady, reject) => {
        let { port, debug, timeout } = initOptions;
        const { executablePath } = initOptions;

        if (!port) port = 0;
        if (!debug) debug = false;
        if (!timeout) timeout = 4000;

        const instance = new Golang(port, debug, timeout, executablePath);
        instance.on('ready', () => {
            const CycleTLS = (() => {
                const CycleTLS = async (
                    url: string,
                    options: CycleTLSRequestOptions,
                    method:
                        | 'head'
                        | 'get'
                        | 'post'
                        | 'put'
                        | 'delete'
                        | 'trace'
                        | 'options'
                        | 'connect'
                        | 'patch' = 'get',
                ): Promise<CycleTLSResponse> => {
                    return new Promise((resolveRequest, rejectRequest) => {
                        const requestId = `${url}${Math.floor(Date.now() * Math.random())}`;
                        //set default options
                        options = options ?? {};

                        //set default ja3, user agent, body and proxy
                        if (!options?.ja3)
                            options.ja3 =
                                '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-51-57-47-53-10,0-23-65281-10-11-35-16-5-51-43-13-45-28-21,29-23-24-25-256-257,0';
                        if (!options?.userAgent)
                            options.userAgent =
                                'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36';
                        if (!options?.body) options.body = '';
                        if (!options?.proxy) options.proxy = '';
                        if (!options?.insecureSkipVerify)
                            options.insecureSkipVerify = false;
                        if (!options?.forceHTTP1) options.forceHTTP1 = false;

                        //convert simple cookies
                        const cookies = options?.cookies;
                        if (
                            typeof cookies === 'object' &&
                            !Array.isArray(cookies) &&
                            cookies !== null
                        ) {
                            const tempArr: {
                                [key: string]: unknown;
                            }[] = [];
                            for (const [key, value] of Object.entries(cookies)) {
                                tempArr.push({ name: key, value: value });
                            }
                            options.cookies = tempArr;
                        }
                        instance.request(requestId, {
                            url,
                            ...options,
                            method,
                        });

                        instance.once(requestId, (response) => {
                            if (response.error) return rejectRequest(response.error);

                            let parsedBody;
                            const { Headers: headers } = response;

                            // Check if the Content-Type header indicates a JSON response
                            const contentType =
                                headers['Content-Type'] || headers['content-type'];
                            const isJson =
                                contentType && contentType.includes('application/json');

                            if (isJson) {
                                try {
                                    // Parse JSON responses
                                    parsedBody = JSON.parse(response.Body);
                                    // Override console.log to display the full body
                                    parsedBody[util.inspect.custom] = function () {
                                        return JSON.stringify(this, undefined, 2);
                                    };
                                } catch (error) {
                                    // Handle parsing error (e.g., log it or reject the request)
                                    console.error(
                                        'Failed to parse JSON response:',
                                        error,
                                    );
                                    return rejectRequest(error);
                                }
                            } else {
                                parsedBody = response.Body;
                            }

                            const { Status: status, FinalUrl: finalUrl } = response;

                            if (headers['Set-Cookie']) {
                                headers['Set-Cookie'] =
                                    headers['Set-Cookie'].split('/,/');
                            }

                            resolveRequest({
                                status,
                                body: parsedBody,
                                headers,
                                finalUrl,
                            });
                        });
                    });
                };
                CycleTLS.head = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'head');
                };
                CycleTLS.get = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'get');
                };
                CycleTLS.post = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'post');
                };
                CycleTLS.put = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'put');
                };
                CycleTLS.delete = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'delete');
                };
                CycleTLS.trace = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'trace');
                };
                CycleTLS.options = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'options');
                };
                CycleTLS.connect = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'options');
                };
                CycleTLS.patch = (
                    url: string,
                    options: CycleTLSRequestOptions,
                ): Promise<CycleTLSResponse> => {
                    return CycleTLS(url, options, 'patch');
                };
                CycleTLS.exit = async (): Promise<undefined> => {
                    return instance.exit();
                };

                return CycleTLS;
            })();
            resolveReady(CycleTLS);
        });

        instance.on('failure', (reason: string) => {
            reject(reason);
        });
    });
};

export default initCycleTLS;
