# @thaterror/pino-adapter

[![npm version](https://img.shields.io/npm/v/@thaterror/pino-adapter.svg)](https://www.npmjs.com/package/@thaterror/adapter)

A small adapter to serialize and log `ThatError` instances with `pino`.

This README shows installation and usage examples. For core library usage and error-family definitions, see
`../core/README.md`.

## Installation

```bash
npm install @thaterror/pino-adapter pino
# or with bun
bun add @thaterror/pino-adapter pino
```

## Features

- `thaterrorSerializer` — a pino-compatible serializer that adds `code` and `payload` to the serialized error.
- `thaterrorHooks` — a `pino` hooks implementation that detects `ThatError` instances and logs them under a `thaterror`
  key.

## Quick Example

```ts
// logger.ts
import pino from 'pino';
import {thaterrorSerializer, thaterrorHooks} from '@thaterror/pino-adapter';

export const logger = pino({
    serializers: {err: thaterrorSerializer},   // <-- add the serializer
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            ignore: "pid,hostname",
            errorLikeObjectKeys: ["err", "error", "thaterror"], // <-- include thaterror key
            translateTime: "SYS:standard",
            stackSize: 10,
        },
    },
    hooks: {...thaterrorHooks}, // <-- add the hooks
});
```

```ts
// main.ts
import {logger} from './logger.ts';
import {AppError} from './errors.ts';

logger(MCPError.MCP_CONNECTION_FAILED("ws://localhost:3000/mcp"));
```

your logs will look like:
```shell
[2026-01-03 18:41:12.928 +0800] FATAL: Failed connect to mcp server: ws://localhost:3000/mcp
    thaterror: {
      "type": "MCP_CONNECTION_FAILED",
      "message": "Failed connect to mcp server: ws://localhost:3000/mcp:,
      "stack":
          "Error
              at <anonymous> (projectDir\main.ts:5:16)
              at <anonymous> (projectDir\node_modules\neverthrow\dist\index.cjs.js:106:35)
              at processTicksAndRejections (native)"
      "cause": {
        "type": "Error",
        "message": "WebSocket connection to 'ws://localhost:3000/mcp' failed: Failed to connect"
      },
      "code": "MCP_CONNECTION_FAILED",
      "name": "MCP_CONNECTION_FAILED",
      "payload": [
        "ws://localhost:3000/mcp"
      ]
    }

```

## License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)
