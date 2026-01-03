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

## Installation

```bash
npm install @thaterror/core
# or with bun
bun add @thaterror/core
```

## Quick Start

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

// ...later
if (e instanceof Error) {
    if (AppError.is(e)) {
        // narrowed to AppError family
    }
}
```

## Adopting external errors

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
// err is typed as AppError.NotFound and carries payload [123]
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

`from` only accepts error types you have enrolled or bridged. If an unenrolled error is passed, TypeScript will flag it.

```typescript
try {
    // ...
} catch (e: unknown) {
    if (e instanceof MyLegacyError) {
        const error = ExAppError.from(e); // typed
    }
}
```

## Deterministic Tracing with `.with()`

When creating errors inside callbacks (for example, `ResultAsync.fromPromise`), V8 may capture a stack trace that
starts inside the callback library rather than your code. Calling `.with()` within the callback preserves the stack
trace at the point you created the error.

```typescript
return ResultAsync.fromPromise(
    client.connect(url),
    (error) => AppError.ConnectionError(url).with({cause: error})
);
```

`.with()` is chainable and usually returns `this` — its value is the captured error; the main purpose is to "anchor"
stack capture at the callsite.

## API Overview

- That(schema) -> family factory
- err.is(err) -> type guard
- family.enroll(ExternalClass, familyCase, transformer?) → returns an extended family
- family.bridge(ExternalClass, dispatcher) → returns an extended family
- family.from(externalError) → transforms to a family case
- error.with({ cause }) → attach cause and anchor stack trace

## Adapter: pino

A first-party adapter lives at `packages/pino-adapter` to serialize ThatError instances for pino logging. See that package's README for usage examples.

## Examples and Tests

See `packages/core/__tests__` for concrete usage and test assertions that demonstrate typing and runtime behavior.

## Contributing

Run the workspace install and package tests from the repository root (see the root README). Each package may include additional
contributing instructions.

## License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)

