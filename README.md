# thaterror 🛡️

[![npm version](https://img.shields.io/npm/v/@thaterror/core.svg)](https://www.npmjs.com/package/@thaterror/core)
[![Bun Checked](https://img.shields.io/badge/Bun-checked-blue?logo=bun&logoColor=white)](https://bun.sh)
[![codecov](https://codecov.io/gh/tarnishablec/thaterror/graph/badge.svg?token=69B4KK0WSH)](https://codecov.io/gh/tarnishablec/thaterror)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/tarnishablec/thaterror/test.yml)
![GitHub License](https://img.shields.io/github/license/tarnishablec/thaterror)
![bundle size](https://img.shields.io/bundlephobia/minzip/@thaterror/core)
![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)
[![CodeQL Analysis](https://github.com/tarnishablec/thaterror/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/tarnishablec/thaterror/actions/workflows/codeql-analysis.yml)
[![Total TypeScript](https://img.shields.io/badge/Types-100%25%20Safe-blue)](https://github.com/tarnishablec/thaterror)
[![No Any](https://img.shields.io/badge/Any-None-success)](https://github.com/tarnishablec/thaterror)

A type-safe error handling library for TypeScript, heavily inspired by the experience of
Rust's [thiserror](https://github.com/dtolnay/thiserror). It aims to remove the boilerplate while providing a seamless,
domain-driven error management workflow.

## The Core Value

Handling `Error` in large-scale TypeScript projects can be frustrating:

- `instanceof` is not always reliable across different packages, multiple versions, or due to structural typing matches.
- Error context (Payload) is often lost during propagation.
- Integrating third-party errors (e.g., `Hono`, `TypeORM`, `SyntaxError`) into your domain model usually requires messy
  manual conversion.

`thaterror` solves these with a **Schema-first** philosophy, bringing **Rust-like ergonomics** to TypeScript error
handling.

## ✨ Features

- **🎯 Zero Boilerplate**: A single `That` call generates error factories with built-in type guards and payload
  support.
- **🏗️ Domain-Driven**: Define error families that encapsulate your business logic.
- **🌉 Native Integration**: "Naturalize" external errors into your family using `enroll` and `bridge`.
- **🧠 Intelligent Transformation**: The `from` method provides strict type checking, ensuring only registered error
  types are processed.
- **🦾 Total Type Safety**: Perfect type narrowing that automatically infers payload types from your schema.
- **🦀 thiserror-like Experience**: Declarative, robust, and designed for developers who value type correctness.

## 📦 Installation

```bash
bun add @thaterror/core
# or
npm install @thaterror/core
```

## 🚀 Quick Start

The best practice is to centralize your error definitions in a file (e.g., `errors.ts`), configure external error
mappings using `enroll`, and export the resulting family.

### 1. Define and Configure (`errors.ts`)

```typescript
// errors.ts
import {That} from "@thaterror/core";

export const AppError = That({
    // Static message
    Unauthorized: "You are not logged in",

    // Dynamic message (with Payload)
    NotFound: (id: number) => `Resource ${id} not found`,
    DatabaseError: (query: string) => `Database Error: ${query}`,
    ConnectionError: (url: string) => `Failed to connect: ${url}`
})
```

### 2. Throw and Catch

```typescript
import {AppErrors} from "./errors";

// Throwing
throw AppError.NotFound(123);
```

## 🛠️ Advanced: Adopting External Errors

This is where `thaterror` shines—bringing external error classes into your type-safe domain.

### `enroll` (One-to-One Mapping)

Maps a specific error class directly to a family case. If the case requires a payload, a transformer function must be
provided.

```typescript
import {AppError} from "./errors";

class MyLegacyError extends Error {
    constructor(public legacyId: string) {
        super();
    }
}

// Enroll MyLegacyError as AppError.NotFound, extracting legacyId as the payload
const ExAppError = AppError.enroll(MyLegacyError, AppError.NotFound, (e) => [Number(e.legacyId)]);

// Now, MyFamily.from can recognize and transform MyLegacyError instances
const err = ExAppError.from(new MyLegacyError("123"));
// err is now typed as AppError.NotFound & payloadOf(err) === [123] (number)
```

### `bridge` (One-to-Many/Conditional Mapping)

Allows logic-based dispatching of a complex error class (like `HTTPException`) to multiple family cases.

```typescript
import {HTTPException} from 'hono/http-exception';

const ExAppError = AppError.bridge(HTTPException, (e, cases) => {
    switch (e.status) {
        case 404:
            return cases.NotFound(0);
        case 401:
            return cases.Unauthorized();
        case 500:
            return cases.DatabaseError(e.message);
        default:
            return cases.ConnectionError(e.res?.url ?? 'invalid url');
    }
});
```

### `from` (The Type-Safe Gateway)

`from` ensures that you only attempt to transform error types that you have explicitly registered. If an unenrolled
error is passed, the TypeScript compiler will flag it.

```typescript
try {
    // ...
} catch (e: unknown) {
    if (e instanceof MyLegacyError) {
        // If 'e' might be an unregistered error class, TS will alert you here
        const error = ExAppError.from(e);
        // error is typed as MyFamily.NotFound
    }
}
```

## 🧪 Deterministic Tracing: The "Callback-Local" Anchor

In JavaScript, asynchronous stack traces are notoriously fragile. When you wrap errors inside a callback
like [neverthrow](https://github.com/supermacro/neverthrow) 's `ResultAsync.fromPromise`, the stack trace often points to
the library's internal dispatchers rather than your business logic.

```ts
import {ResultAsync} from 'neverthrow';
import {AppError} from "./error";

function connectToDatabase(url: string) {
    return ResultAsync.fromPromise(
        fetch(url),
        (_err) => {
            // 🚨 THE ISSUE:
            // When this callback is executed, the physical execution flow 
            // is already deep inside neverthrow's internal logic.
            return AppError.ConnectionError(url);
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
    at processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async /project/src/main.ts:15:20
```

You’ll notice the top frames point to internal files of `neverthrow`, making it impossible to see where your business logic actually failed.

### The "Magic" of `.with()`

By using the chainable `.with()`  method, you force the V8 engine to capture the stack trace at the **exact
moment** of failure within your callback.

```typescript
// 🟢 The ResultAsync Way (Best Practice)
return ResultAsync.fromPromise(
    client.connect(url),
    (error) => AppError.CONNECTION_FAILED(url).with({ cause: error })
);
```
🎯 The "Crime Scene": Callback Freedom
With the .with() anchor, you are finally free to nest your business logic deep within any callback without fear of losing context.

To be honest, at the implementation level, `.with()` is almost a "no-op" (it just returns `this`). However, in the physical world of V8 and asynchronous microtasks, it acts as a **Quantum Observer**.

#### Why "It Just Works":
- **Microtask Locking**: By calling `.with()` immediately within your callback, you force the engine to interact with the error object before the current microtask ends. This "extra step" effectively nails the stack trace to the physical floor before the asynchronous execution context evaporates.
- **Optimization Barrier**: It prevents the JIT compiler from over-optimizing (inlining) the factory call into the library's internal dispatchers, preserving the "Crime Scene" frames.
- **Future-Proofing**: It provides a stable entry point for future metadata (like `traceId` or `severity`) without refactoring your entire codebase.

> **Man, what can I say?** We can't fully explain why the ghost of the stack trace stays longer when you call `.with()`, but the experimental evidence is clear: **It just works.** Call it, and you'll never have to guess where your errors came from again.

## 📜 License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)
