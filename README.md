# thaterror 🛡️

[![npm version](https://img.shields.io/npm/v/@thaterror/core.svg)](https://www.npmjs.com/package/@thaterror/core)
[![Bun Checked](https://img.shields.io/badge/Bun-checked-blue?logo=bun&logoColor=white)](https://bun.sh)
[![codecov](https://codecov.io/gh/tarnishablec/thaterror/graph/badge.svg?token=69B4KK0WSH)](https://codecov.io/gh/tarnishablec/thaterror)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/tarnishablec/thaterror/unit-test.yml)
![GitHub License](https://img.shields.io/github/license/tarnishablec/thaterror)
![bundle size](https://img.shields.io/bundlephobia/minzip/@thaterror/core)
![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label)
[![CodeQL Analysis](https://github.com/tarnishablec/thaterror/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/tarnishablec/thaterror/actions/workflows/codeql-analysis.yml)
[![Total TypeScript](https://img.shields.io/badge/Types-100%25%20Safe-blue)](https://github.com/tarnishablec/thaterror)
[![No Any](https://img.shields.io/badge/Any-None-success)](https://github.com/tarnishablec/thaterror)

A concise, type-safe error handling toolkit for TypeScript inspired by Rust's [thiserror](https://github.com/dtolnay/thiserror). Use the
`@thaterror/core` package to define domain-driven error families with zero boilerplate, then adopt
or serialize them with optional adapters (for example, a [pino](https://github.com/pinojs/pino) adapter is available).

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

## 🚀 Quick Start

This repository is split into focused packages:

- [@thaterror/core](./packages/core) — the main library: how to define errors, strong typing, adapters.
- [@thaterror/pino-adapter](./packages/pino-adapter) — a small adapter to serialize `ThatError` instances for `pino`.

Installation

To use the core library:

```bash
bun add @thaterror/core
// or with npm
npm install @thaterror/core
```

If you want the pino adapter for structured logging:

```bash
bun add @thaterror/pino-adapter pino
```

See the individual package READMEs for development and testing instructions.

## Comparison ✨ — `Rust thiserror` / `@thaterror/core` / `Native Error`

Rust (thiserror) 🦀

```rust
use thiserror::Error;
// Add serde derives for easy serialization/deserialization
use serde::{Serialize, Deserialize};

#[derive(Debug, Error, Serialize, Deserialize)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    // Use a serializable payload in the README example to keep the serde example accurate.
    #[error("db error: {0}")]
    DbError(String),
}

// Quick notes for thiserror:
// - Type & payload: enums carry payloads at the type level and enable exhaustive matching.
// - Pattern matching: use `match` for exhaustive, compile-time checked branching.
// - Serialization: straightforward with `serde` — derive `Serialize`/`Deserialize`. For a clean
//   discriminated JSON shape, add a serde tag on the enum.
// - Cost: language-level safety and performance; highly reliable for in-binary error modeling.
```

TypeScript (`@thaterror/core`) 🛡️

```ts
import {That, type ThatError} from '@thaterror/core';

const App = That({
    NotFound: (id: string) => ({id}),
    InvalidInput: (reason: string) => ({reason}),
    DbError: (cause: unknown) => ({cause}),
});

type AppError = ThatError<typeof App>;

throw App.NotFound('123');

// Quick notes for @thaterror/core:
// - Type & payload: carries payloads in the type system and supports safe narrowing.
// - Pattern matching: built-in type guards enable exhaustive, type-safe branching.
// - Cross-package reliability: guards and schema-style definitions are robust across modules.
// - Serialization & adapters: ships adapters (e.g. pino) for structured logging/transport.
// - Cost: minimal boilerplate with strong TypeScript typing.
```

Use `@thaterror/core` with [neverthrow](https://github.com/supermacro/neverthrow) — full Rust-like Result<T, E> experience 🧭

```ts
// Combine @thaterror/core (typed errors) with neverthrow's Result for ergonomic,
// exhaustiveness-friendly flow control similar to Rust's `Result<T, E>`.
import {That, type ThatError} from '@thaterror/core';
import {errAsync, ResultAsync} from 'neverthrow';
import {dbFind} from 'db'; // assume dbFind(id) returns Promise<User | undefined>

const AppError = That({
    NotFound: (id: string) => ({id}),
    InvalidInput: (reason: string) => ({reason}),
    DbError: (cause: unknown) => ({cause}),
});

type AppError = ThatError<typeof AppError>;

// Async neverthrow example function to find a user by ID:
// - returns ResultAsync<User, AppError>
const findUser = (id: string): ResultAsync<T, AppError> => {
    // Immediate validation using neverthrow's async helpers (no try/catch)
    if (!id) return errAsync(AppError.InvalidInput('id empty'));

    // Wrap the DB promise and map any rejection into AppError
    return ResultAsync.fromPromise(
        dbFind(id),
        (e) => AppError.DbError(e)
    ).andThen(r => {
        if (!r) return errAsync(AppError.NotFound(id));
        return ResultAsync.ok(r);
    })
};
```

TypeScript (native `Error`) ⚠️

```ts
class NotFoundError extends Error {
  constructor(public id: string) {
    super(`not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
class InvalidInputError extends Error {
  constructor(public reason: string) {
    super(`invalid input: ${reason}`);
    this.name = 'InvalidInputError';
  }
}
class DbError extends Error {
  constructor(public cause: unknown) {
    super('db error');
    this.name = 'DbError';
  }
}

throw new NotFoundError('123')

// Quick notes for native Error:
// - Type & payload: requires manual extension; TypeScript typing is weaker compared to enums/That.
// - Pattern matching: consumers often use `instanceof` or `error.name`, which is less safe.
// - Cross-package reliability: `instanceof` can be fragile across bundles/versions.
// - Serialization: needs explicit conversion for structured logs/transport.
// - Cost: simplest to implement but lacks the type-level guarantees of the other approaches.
```

## 📜 License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)
