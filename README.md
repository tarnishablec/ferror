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

- **🎯 Zero Boilerplate**: A single `defineError` call generates error factories with built-in type guards and payload
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

const BaseError = That({
    // Static message
    Unauthorized: "You are not logged in",

    // Dynamic message (with Payload)
    NotFound: (id: number) => `Resource ${id} not found`,
});

// Configure and export the family
export const AppError = BaseError
    .enroll(/** your external errors */)
    .enroll(/** ... */)
    .bridge(/** ... */)
```

### 2. Throw and Catch

```typescript
import {AppErrors} from "./errors";

// Throwing
throw AppError.NotFound(404);
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
const MyFamily = AppError.enroll(MyLegacyError, AppError.NotFound, (e) => [Number(e.legacyId)]);

// Now, MyFamily.from can recognize and transform MyLegacyError instances
const err = MyFamily.from(new MyLegacyError("123"));
// err is now typed as AppError.NotFound
```

### `bridge` (One-to-Many/Conditional Mapping)

Allows logic-based dispatching of a complex error class (like `HTTPException`) to multiple family cases.

```typescript
import {HTTPException} from 'hono/http-exception';

const MyFamily = AppError.bridge(HTTPException, (e, cases) => {
    switch (e.status) {
        case 404:
            return cases.NotFound(0);
        case 401:
            return cases.Unauthorized();
        default:
            return cases.DatabaseError(e.message, 0);
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

In TypeScript, two different classes with the same members are considered identical. This makes traditional `instanceof`
checks brittle in certain architectural setups.

`thaterror` implements **Nominal Typing** via internal `Scope` symbols and advanced type gymnastics. Even if two errors
look identical structurally, `thaterror` distinguishes them based on their registration and scope, providing much-needed
reliability in complex apps.

## 📜 License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)
