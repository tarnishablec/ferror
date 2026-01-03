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

A concise, type-safe error handling toolkit for TypeScript inspired by Rust's thiserror. Use the
`@thaterror/core` package to define domain-driven error families with zero boilerplate, then adopt
or serialize them with optional adapters (for example, a `pino` adapter is available).

This repository is split into focused packages:

- [packages/core](./packages/core) — the main library: how to define errors, strong typing, adapters.
- [packages/pino-adapter](./packages/pino-adapter) — a small adapter to serialize `ThatError` instances for `pino`.

Quick links

- Core docs and examples: ./packages/core/README.md
- Pino adapter: ./packages/pino-adapter/README.md

Installation

To use the core library:

```bash
npm install @thaterror/core
# or with bun
bun add @thaterror/core
```

If you want the pino adapter for structured logging:

```bash
npm install @thaterror/pino-adapter pino
```

Why split the docs?

- The repo root stays as a short project overview and entry point.
- `packages/core` contains the concrete usage examples, API examples and advanced topics.
- Package READMEs (like the pino adapter) are short and focused on integration and examples.

Contributing

See the individual package READMEs for development and testing instructions.

## 📜 License

[MPL-2.0](https://github.com/tarnishablec/thaterror/blob/main/LICENSE)
