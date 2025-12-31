# thaterror 🛡️

A type-safe error handling library for TypeScript, heavily inspired by the experience of Rust's [thiserror](https://github.com/dtolnay/thiserror). It aims to remove the boilerplate while providing a seamless, domain-driven error management workflow.

## The Core Value

Handling `Error` in large-scale TypeScript projects can be frustrating:
- `instanceof` is not always reliable across different packages, multiple versions, or due to structural typing matches.
- Error context (Payload) is often lost during propagation.
- Integrating third-party errors (e.g., `Hono`, `TypeORM`, `SyntaxError`) into your domain model usually requires messy manual conversion.

`thaterror` solves these with a **Schema-first** philosophy, bringing **Rust-like ergonomics** to TypeScript error handling.

## ✨ Features

- **🎯 Zero Boilerplate**: A single `defineError` call generates error factories with built-in type guards and payload support.
- **🏗️ Domain-Driven**: Define error families that encapsulate your business logic.
- **🌉 Native Integration**: "Naturalize" external errors into your family using `enroll` and `bridge`.
- **🧠 Intelligent Transformation**: The `from` method provides strict type checking, ensuring only registered error types are processed.
- **🦾 Total Type Safety**: Perfect type narrowing that automatically infers payload types from your schema.
- **🦀 thiserror-like Experience**: Declarative, robust, and designed for developers who value type correctness.

## 📦 Installation

```bash
bun add @thaterror/core
# or
npm install @thaterror/core
```

## 🚀 Quick Start

### 1. Define an Error Family

Define your error schema using `defineError`.

```typescript
import { defineError } from "@thaterror/core";

export const AppError = defineError({
  // Static message
  Unauthorized: "You are not logged in",
  
  // Dynamic message (with Payload)
  NotFound: (id: number) => `Resource ${id} not found`,
  
  // Multiple Payload parameters
  DatabaseError: (query: string, timeout: number) => 
    `Query failed: ${query} (timeout: ${timeout}ms)`,
});
```

### 2. Throw and Catch

```typescript
import { isDefinedError, PayloadField } from "@thaterror/core";

// Throwing
throw AppError.NotFound(404);

// Catching and checking
try {
  // ...
} catch (e: unknown) {
  // Use the .is() method for precise type narrowing
  if (isDefinedError(e) && e.is(AppError.NotFound)) {
    // e is now automatically narrowed
    // e[PayloadField] is inferred as [number]
    console.log(e.message); // "Resource 404 not found"
    const [id] = e[PayloadField]; // id is number
  }
}
```

## 🛠️ Advanced: Adopting External Errors

This is where `thaterror` shines—bringing external error classes into your type-safe domain.

### `enroll` (One-to-One Mapping)

Maps a specific error class directly to a family case. If the case requires a payload, a transformer function must be provided.

```typescript
import { AppError } from "./errors";

class MyLegacyError extends Error {
    constructor(public legacyId: string) { super(); }
}

// Enroll MyLegacyError as AppError.NotFound, extracting legacyId as the payload
const MyFamily = AppError.enroll(MyLegacyError, AppError.NotFound, (e) => [Number(e.legacyId)]);

// Now, MyFamily.from can recognize and transform MyLegacyError instances
const err = MyFamily.from(new MyLegacyError("123")); 
// err is now typed as AppError.NotFound
```

### `bridge` (One-to-Many/Conditional Mapping)

Allows logic-based dispatching of a complex error class (like `HTTPException`) to multiple family cases.

```typescript
import { HTTPException } from 'hono/http-exception';

const MyFamily = AppError.bridge(HTTPException, (e, cases) => {
  switch (e.status) {
    case 404: return cases.NotFound(0);
    case 401: return cases.Unauthorized();
    default: return cases.DatabaseError(e.message, 0);
  }
});
```

### `from` (The Type-Safe Gateway)

`from` ensures that you only attempt to transform error types that you have explicitly registered. If an unenrolled error is passed, the TypeScript compiler will flag it.

```typescript
try {
  // ...
} catch (e: unknown) {
  if (e instanceof Error) {
    // If 'e' might be an unregistered error class, TS will alert you here
    const error = MyFamily.from(e);
    
    if (error.is(AppError.NotFound)) {
        // ...
    }
  }
}
```

## 🔍 Why thaterror?

### Overcoming Structural Typing

In TypeScript, two different classes with the same members are considered identical. This makes traditional `instanceof` checks brittle in certain architectural setups.

`thaterror` implements **Nominal Typing** via internal `Scope` symbols and advanced type gymnastics. Even if two errors look identical structurally, `thaterror` distinguishes them based on their registration and scope, providing much-needed reliability in complex apps.

## 📜 License

MPL-2.0
