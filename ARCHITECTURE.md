# Architecture

## Layers

```
src/
  domain/
    pricing/            Pure calculation module. Zero imports of express/mongoose.
                         calculateLine, calculateDocumentTotals, calculateDocument.
                         Synchronous, deterministic, framework-agnostic.

  application/           Orchestration. Combines domain + persistence.
    documents/           document.service.ts — CRUD, line mutations, finalize, duplicate
    reports/              report.service.ts — date-range aggregation
    auth/                 auth.service.ts — signup/login, bcrypt, JWT signing
    errors.ts             AppErrorCode (closed union), AppError, ERROR_STATUS map

  infrastructure/
    db/
      models/             Mongoose schemas (User, Document with embedded lines[])
      repositories/        MongoDocumentRepository, MongoUserRepository — the ONLY
                            code allowed to talk to Mongoose models directly
      connection.ts         connect()/disconnect(), reads MONGODB_URI

    http/
      validators/           Zod schemas — the request contract, enforced before
                             any handler runs
      middlewares/           auth (JWT), validate (Zod → 422/404), rate-limit,
                             error-handler (catch-all, never leaks internals)
      mappers/                document.mapper.ts — the ONLY place that converts
                                domain shape (bp) to human DTO shape (percent)
      controllers/             thin — call a service, map Result to an HTTP status,
                                nothing else
      routes/                  wire validate() → controller for each endpoint
      app.ts                   composition root (see below) + Express app assembly
      asyncHandler.ts

  server.ts                connects to Mongo, then starts listening
```

Dependencies point one way: `http` → `application` → `domain`, and `http`/`application` → `infrastructure/db`. `domain/` depends on nothing else in the project.

### Composition root

Services are constructed by factory functions with the repository injected explicitly — `createDocumentService(repository)`, `createAuthService(options)`, `createReportService(repository)` — rather than exported as pre-wired singletons. `app.ts` is the single place where concrete repositories (`MongoDocumentRepository`, `MongoUserRepository`) are instantiated and wired into services, which are then wired into controllers, once, at startup.

This is what makes it possible to test every service against a real, in-memory MongoDB (`mongodb-memory-server`) without importing `src/config/env.ts` at all — `env.ts` validates `process.env` eagerly at import time and would otherwise force every test file to carry a full, valid environment just to load a service.

## Error handling convention (`neverthrow`)

Business-rule failures (a discount that exceeds the subtotal, a document that's already finalized, an unauthenticated request) are **expected outcomes**, not bugs — they don't warrant throwing an exception and unwinding the stack. `neverthrow`'s `Result<T, E>` puts them in the type signature instead: the compiler forces every caller to handle the `Err` case, and a controller can never accidentally forget to check whether an operation succeeded.

| Layer | Convention |
|---|---|
| `domain/` | Synchronous. Returns `Result<T, PricingError>`. Never throws. |
| `application/` (services) | Asynchronous. Returns `Promise<Result<T, AppError>>`. Never throws a business error. Does **not** use `ResultAsync` — one style throughout the codebase. |
| `infrastructure/` | May throw native exceptions, but only for genuinely unrecoverable failures (DB connection loss, driver errors). These are not caught locally — they propagate to `error-handler.middleware.ts`, which maps anything unrecognized to `500 INTERNAL_ERROR` without ever exposing the original message or stack trace. |
| `http/` (controllers) | No `try/catch`. Wrapped in `asyncHandler`, which forwards any unexpected rejected promise to the error-handler middleware. Controllers map a `Result` to an HTTP response with one pattern, repeated everywhere: `if (result.isErr()) { res.status(ERROR_STATUS[result.error.code]).json({ error: result.error }); return; }` — no controller ever writes a literal error status code. |

The domain engine's own error type carries a `lineIndex` and maps 1:1 into an `AppError`, with no translation layer in between — a validation failure on `lines[1].discount.amountCents` in the domain surfaces as `field: "lines[1].discount.amountCents"` in the API response, unchanged.

## Authorization model

The most common failure mode in APIs that expose per-user financial data isn't a broken framework — it's authentication without authorization: verifying *who* the caller is but not verifying that the resource they're touching actually belongs to them (IDOR).

Hard rules, enforced at the repository layer so no individual controller can get it wrong:

1. **Never** `Model.findById(id)` on `documents`. **Always** `Model.findOne({ _id: id, userId })`. `userId` is the mandatory first parameter of every `DocumentRepository` method — there is no method that can resolve a document by `_id` alone.
2. `userId` comes exclusively from the verified JWT's `sub` claim (`auth.middleware.ts`), never from the request body, query string, or URL params, at any point in the codebase.
3. A resource that doesn't exist and a resource that belongs to another user get the **identical** response: `404 DOCUMENT_NOT_FOUND`. Never `403` — the API does not confirm or deny that a resource exists for a caller who doesn't own it.
4. A malformed `:id` / `:lineId` (not a valid ObjectId) is treated exactly like "not found" — `404`, never a `500` from an unhandled Mongoose `CastError`, and never a `422` (the shape of the URL itself never leaks information about whether the ID format is merely wrong versus genuinely absent).
5. Every mutation (`PATCH`, `DELETE`, `.../finalize`, `.../duplicate`, line CRUD) repeats the same rule — there is exactly one code path (the repository) capable of reading or writing a `documents` record, and it always filters by `userId`.

This is exercised directly by `tests/integration/cross-user-isolation.test.ts`, which drives all eight document-mutating endpoints as a second user against a first user's document and asserts `404` on every one, then confirms the first user's document was left untouched.

## Database

Single MongoDB collection pair: `users` and `documents`, with `lines` embedded inside each `document` (never a separate `line_items` collection). The relationship is 1-to-few (at most 200 lines), always read together with its parent, and always updated atomically together with the parent's cached totals — embedding avoids a two-write, two-failure-mode update for something that is conceptually one aggregate.

`summary()` (the reporting endpoint's backing query) is a single `$match` + `$group` aggregation pipeline — it never loads documents into application memory to sum them.

Deployment uses MongoDB **Atlas**, not Amazon DocumentDB: DocumentDB is not 100% wire-compatible with real MongoDB, and reaching it from App Runner would require a VPC connector plus a bastion, which is disproportionate infrastructure for this project's scope.
