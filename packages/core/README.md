# @thaterror/core

[![npm version](https://img.shields.io/npm/v/@thaterror/core.svg)](https://www.npmjs.com/package/@thaterror/core)

`@thaterror/core` is the main package of the thaterror project — a type-safe, schema-first error toolkit for TypeScript.

This README focuses on concrete usage, examples, and advanced topics. The repository root contains a short project
overview and links to package READMEs.

## Core idea

Define a family of domain errors with a single `That()` call and get:

- Typed error factories
- Perfect narrowing and payload inference
- `from` to transform enrolled external errors
- `enroll` and `bridge` to map external errors into your family
- Optional adapters (e.g. pino) for logging and serialization

## 📦 Installation

```bash
npm install @thaterror/core
# or with bun
bun add @thaterror/core
```

## 🚀 Quick Start

Create a central `errors.ts` to define your family:

```typescript
// errors.ts
import {That} from "@thaterror/core";

export const AppError = That({
    Unauthorized: "You are not logged in",
    NotFound: (id: number) => `Resource ${id} not found`,
    DatabaseError: (query: string) => `Database Error: ${query}`,
    ConnectionError: (url: string) => `Failed to connect: ${url}`,
});
```

Throwing and catching:

```typescript
import {AppError} from './errors';

throw AppError.NotFound(123);
```

## 🛠️ Adopting external errors

### enroll (one-to-one)

Map a concrete external error class to a single case in your family. If the case takes a payload, provide a transformer.

```typescript
class MyLegacyError extends Error {
    constructor(public legacyId: string) {
        super();
    }
}

const ExAppError = AppError.enroll(MyLegacyError, AppError.NotFound, (e) => [Number(e.legacyId)]);

const err = ExAppError.from(new MyLegacyError("123"));
// err is typed as ExAppError.NotFound and carries payload [123]
```

### bridge (conditional / one-to-many)

Use `bridge` when a single external error class may map to multiple cases depending on runtime data.

```typescript
import {HTTPException} from 'hono/http-exception';

const ExAppError = AppError.bridge(HTTPException, (e, cases) => {
    switch (e.status) {
        case 404: return cases.NotFound(0);
        case 401: return cases.Unauthorized();
        case 500: return cases.DatabaseError(e.message);
        default: return cases.ConnectionError(e.res?.url ?? 'invalid url');
    }
});
```

### from — the type-safe gateway

`from` only accepts error types you have enrolled or bridged. If an `unenrolled or bridged` error is passed, TypeScript will flag it.

```typescript
try {
    // ...
} catch (e: unknown) {
    if (e instanceof MyLegacyError) {
        const error = ExAppError.from(e); // error is typed as ExAppError.NotFound
    }
}
```

## 🧪 Deterministic Tracing: The "Callback-Local" Anchor

In JavaScript, asynchronous stack traces are notoriously fragile. When you wrap errors inside a callback
like [neverthrow](https://github.com/supermacro/neverthrow) 's `ResultAsync.fromPromise`, the stack trace often points
to
the library's internal dispatchers rather than your business logic.

```ts
// location: project/mcp/client.ts
import {ResultAsync} from 'neverthrow';
import {MCPError} from "./error";

function connectTo(url: string) {
    return ResultAsync.fromPromise(
        client.connect(url),
        (_err) => {
            // 🚨 THE ISSUE:
            // When this callback is executed, the physical execution flow 
            // is already deep inside neverthrow's internal logic.
            return MCPError.CONNECTION_FAILED(url);
        }
    );
}

const result = await connectTo("ws://localhost:3000");
if (result.isErr()) {
    console.log(result.error.stack);
}
```

The Resulting "Messy" Stack Trace:

```shell
Error: Failed to connect: "ws://localhost:3000"
    at /project/node_modules/neverthrow/dist/index.cjs.js:106:34  <-- 🛑 Useless! Internal library code.
    at processTicksAndRejections (native)
```

You’ll notice the top frames point to internal files of `neverthrow`, making it impossible to see where your business
logic actually failed.

### The "Magic" of `.with()`

By using the chainable `.with()`  method, you force the V8 engine to capture the stack trace at the **exact
moment** of failure within your callback.

```typescript
// 🟢 The ResultAsync Way (Best Practice)
// location: project/mcp/client.ts
return ResultAsync.fromPromise(
    client.connect(url),
    (error) => MCPError.CONNECTION_FAILED(url).with({cause: error})
);
```

now the stack trace points to your business logic:

```shell
Error: Failed to connect: "ws://localhost:3000"
    at /project/mcp/client.ts:15:11  <-- 🟢 Useful! Business code.
    at /project/node_modules/neverthrow/dist/index.cjs.js:106:34 
    at processTicksAndRejections (native)
```

🎯 The "Crime Scene": Callback Freedom
With the .with() anchor, you are finally free to nest your business logic deep within any callback without fear of
losing context.

To be honest, at the implementation level, `.with()` is almost a "no-op" (it just returns `this`). However, in the
physical world of V8 and asynchronous microtasks, it acts as a **Quantum Observer**.

#### Why "It Just Works":

- **Microtask Locking**: By calling `.with()` immediately within your callback, you force the engine to interact with
  the error object before the current microtask ends. This "extra step" effectively nails the stack trace to the
  physical floor before the asynchronous execution context evaporates.
- **Optimization Barrier**: It prevents the JIT compiler from over-optimizing (inlining) the factory call into the
  library's internal dispatchers, preserving the "Crime Scene" frames.

> **Man, what can I say?** We can't fully explain why the ghost of the stack trace stays longer when you call `.with()`,
> but the experimental evidence is clear: **It just works.** Call it, and you'll never have to guess where your errors
> came from again.

## API Overview

- That(schema) -> family factory
- error.is(err) -> type guard check
- family.enroll(ExternalClass, familyCase, transformer?) → returns an extended family
- family.bridge(ExternalClass, dispatcher) → returns an extended family
- family.from(externalError) → transforms to a family case
- error.with({ cause }) → attach cause and anchor stack trace
- ThatError → generic thiserror instance type

## Adapter: pino

A first-party adapter lives at `packages/pino-adapter` to serialize ThatError instances for pino logging. See that package's README for usage examples.

## Examples and Tests

See `packages/core/__tests__` for concrete usage and test assertions that demonstrate typing and runtime behavior.

## Contributing

Run the workspace install and package tests from the repository root (see the root README). 

## License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)

