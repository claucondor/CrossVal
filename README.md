# CrossVal — Multi-Rate Pricing Calculator

A full-stack app for creating quotes/invoices ("documents") with multiple line items, each carrying its own discount and tax rate, and for reporting aggregated totals over a date range. Backend API + Next.js frontend.

**Live app:** https://cross-val.vercel.app
**Live API:** https://cr-4e1f5aa146b04065be04da1150ecb6f8.ecs.us-east-2.on.aws
**Health check:** `GET /health` → `200 {"status":"ok"}`

## Repository structure

```
.
├── src/            # Backend (Node/TypeScript/Express) — this README's root-level sections
├── tests/          # Backend unit/service/HTTP/integration tests
├── docs/           # Backend API request examples (api.http)
├── ARCHITECTURE.md # Backend architecture notes (layers, authorization model, why MongoDB Atlas)
├── Dockerfile      # Backend container image
└── frontend/       # Next.js 15 App Router frontend — see "## Frontend" below
    ├── app/        # Routes: (auth)/{login,signup}, (app)/{documents,reports}
    ├── components/ # Presentational components (Table, Input, Button, LineItemEditor, ...)
    ├── actions/    # Server Actions (auth, documents — the only code that talks to the API)
    └── lib/        # apiFetch, money formatting, shared types
```

The backend lives at the repo root (this is a backend-first project that grew a frontend); the frontend is fully contained under `frontend/` with its own `package.json`, tests, and env file.

## Backend

### Tech stack

- Node.js + TypeScript (`strict: true`), Express
- MongoDB (Mongoose) — MongoDB Atlas in production
- Zod for request validation
- `neverthrow` for typed error handling (`Result<T, E>`, no exceptions for business errors — see [ARCHITECTURE.md](./ARCHITECTURE.md))
- Jest + Supertest + `mongodb-memory-server` for testing
- Deployed as a container on Amazon ECS (Express Mode), image hosted on Amazon ECR

### Prerequisites

- Node.js 20+
- npm
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster) for local development
- Docker (optional, only needed to build/run the production image)

### Setup

```bash
npm install
cp .env.example .env
# edit .env with your own values (see table below)
npm run dev          # starts the API with tsx watch, reading src/server.ts
```

The server does not start until it connects to MongoDB — `connect()` runs before `app.listen(...)`.

### Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `PORT` | no | `3000` | |
| `MONGODB_URI` | **yes** | — | Connection string, e.g. `mongodb+srv://user:pass@cluster.mongodb.net/crossval` |
| `JWT_SECRET` | **yes** | — | Minimum 32 characters, validated at startup |
| `JWT_EXPIRES_IN` | no | `24h` | |
| `BCRYPT_ROUNDS` | no | `12` | Minimum 10 |
| `CORS_ORIGIN` | no | `*` in dev | Set to the deployed frontend origin in production |
| `AWS_REGION` | no | `us-east-1` | Informational only, for the deployment region; not read by application logic |

All environment variables are validated once, at process startup, by `src/config/env.ts` (a Zod schema). If anything is missing or malformed, the process logs the exact issue and exits with code 1 — it never starts in a half-configured state. No other module reads `process.env` directly.

### Running tests

```bash
npm test              # unit + service + HTTP + integration tests (all real: mongodb-memory-server, no mocked repositories)
npm run typecheck      # tsc --noEmit, strict mode
npm run lint           # eslint
```

Coverage of `src/domain/pricing/` is 100% (statements, branches, functions, lines). Project-wide coverage is above 85% statements / 71% branches.

### Quick verification

Run this block as-is (`bash`, requires `curl` and `jq`) against the live deployment to see the brief's worked example end-to-end. Change only the `BASE` line to point at a different environment.

```bash
BASE="https://cr-4e1f5aa146b04065be04da1150ecb6f8.ecs.us-east-2.on.aws"
EMAIL="reviewer+$(date +%s)@example.com"

# 1. Sign up
TOKEN=$(curl -s -X POST "$BASE/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password-1234\"}" | jq -r '.token')

# 2. Create a document with the exact 3 lines from the assignment's sample
DOC=$(curl -s -X POST "$BASE/api/v1/documents" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "title": "Quick verification quote",
    "customer": "ACME Co.",
    "issueDate": "2025-09-01",
    "lines": [
      {"description":"Widget A","quantity":2,"unitPriceCents":10000,"discount":{"type":"percent","percent":10},"taxPercent":5},
      {"description":"Widget B","quantity":1,"unitPriceCents":5000,"discount":null,"taxPercent":5},
      {"description":"Service fee","quantity":1,"unitPriceCents":20000,"discount":{"type":"fixed","amountCents":2000},"taxPercent":0}
    ]
  }')
DOC_ID=$(echo "$DOC" | jq -r '.id')
echo "$DOC" | jq '{subtotalCents, totalDiscountCents, totalTaxCents, grandTotalCents}'
```
Expected:
```json
{ "subtotalCents": 45000, "totalDiscountCents": 4000, "totalTaxCents": 1150, "grandTotalCents": 42150 }
```

```bash
# 3. Finalize it
curl -s -X POST "$BASE/api/v1/documents/$DOC_ID/finalize" -H "Authorization: Bearer $TOKEN" | jq '{status}'
```
Expected: `{ "status": "finalized" }`

```bash
# 4. Try to edit it — a finalized document is immutable
curl -s -w "\nHTTP %{http_code}\n" -X PATCH "$BASE/api/v1/documents/$DOC_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"too late"}'
```
Expected:
```
{"error":{"code":"FINALIZED_DOCUMENT_IMMUTABLE","message":"Document is finalized and cannot be modified"}}
HTTP 409
```

```bash
# 5. Summary report for that date
curl -s -G "$BASE/api/v1/reports/summary" -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "from=2025-09-01" --data-urlencode "to=2025-09-01" | jq .
```
Expected:
```json
{ "from": "2025-09-01", "to": "2025-09-01", "documentCount": 1, "grandTotalCents": 42150, "totalTaxCents": 1150, "totalDiscountCents": 4000 }
```
(`EMAIL` is generated fresh on every run via `$(date +%s)`, so each run signs up a new account and `documentCount` is always 1 — the report aggregates every document owned by that account in range.)

### Calculation & rounding policy

All money is represented as **integer cents** (`*Cents: number`) end-to-end — in the domain, in MongoDB, and in the API. Percentages are represented as **integer basis points** (`*Bp`, `0..10000`) in the domain and in storage; the HTTP API accepts and returns human percentages (`0..100`, at most 2 decimal places) and converts at the boundary.

Per line item, in this exact order:

```
lineSubtotalCents = quantity × unitPriceCents                     (exact integer multiplication, no rounding)

discountAmountCents =
  discount === null            → 0
  discount.type === "fixed"    → discount.amountCents
  discount.type === "percent"  → roundHalfUp(lineSubtotalCents × discount.percentBp, 10000)

afterDiscountCents = lineSubtotalCents − discountAmountCents

taxAmountCents = roundHalfUp(afterDiscountCents × taxBp, 10000)   (always on the POST-discount amount)

lineTotalCents = afterDiscountCents + taxAmountCents
```

**Rounding happens in exactly two places per line** — `discountAmountCents` (only when the discount is percent-based) and `taxAmountCents`. No other step rounds. Document-level totals are the sum of the already-rounded line values, never a fresh recomputation from unrounded numbers.

Rounding is **half-up**, implemented with pure integer arithmetic (no floating-point division, no `Math.round`/`toFixed`/`parseFloat` anywhere in the calculation path):

```typescript
// n >= 0, d > 0, both safe integers
function roundHalfUp(n: number, d: number): number {
  return Math.floor((n + d / 2) / d);
}
```

### Worked example

| Line | qty | unitPriceCents | discount | taxBp | subtotal | discount | afterDiscount | tax | total |
|---|---|---|---|---|---|---|---|---|---|
| Widget A | 2 | 10000 | percent 10% (1000bp) | 500 (5%) | 20000 | 2000 | 18000 | 900 | 18900 |
| Widget B | 1 | 5000 | none | 500 (5%) | 5000 | 0 | 5000 | 250 | 5250 |
| Service fee | 1 | 20000 | fixed 2000c | 0 | 20000 | 2000 | 18000 | 0 | 18000 |

Document totals: `subtotalCents = 45000`, `totalDiscountCents = 4000`, `totalTaxCents = 1150`, **`grandTotalCents = 42150`** ($450.00 / $40.00 / $11.50 / $421.50).

Step-by-step for Widget A's tax (the non-trivial rounding case):
```
roundHalfUp(18000 × 500, 10000) = floor((9_000_000 + 5000) / 10000) = floor(900.5) = 900
```

This exact example is verified end-to-end against the live deployment as part of the integration test suite (`tests/integration/brief-flow.test.ts`): signup → create with these 3 lines → `grandTotalCents === 42150` → finalize → attempt to edit (409) → duplicate (totals recalculated, not copied) → report totals match the manual sum.

### Finalize & immutability

A `Document` in status `finalized` is immutable — no metadata field and no line can be modified, added, or removed. Any attempted mutation is rejected with `409 FINALIZED_DOCUMENT_IMMUTABLE`.

This is guaranteed without optimistic-locking machinery by making every mutation a **single conditional write** that includes `status: "draft"` in its own filter:

```
1. findOneAndUpdate({ _id, userId, status: "draft" }, patch, { new: true })
2. document returned  → mutation succeeded
3. null returned:
     findOne({ _id, userId }).select("status")
       → not found → 404 DOCUMENT_NOT_FOUND
       → found     → 409 FINALIZED_DOCUMENT_IMMUTABLE
```

The write itself is the authority on whether the mutation was allowed; the second read only decides *which* error to report. This removes the read-then-write race window entirely — a `finalize` racing a `PATCH` on the same document can never leave it in an inconsistent state, because only one of the two conditional writes can ever match `status: "draft"`.

The same pattern secures every other mutation on `documents` (`updateDraft`, `deleteDraft`, `finalize`), and `userId` is a mandatory, non-optional first parameter on every repository method — no query ever resolves a document by `_id` alone (see [ARCHITECTURE.md](./ARCHITECTURE.md#authorization-model)).

### Assumptions & trade-offs

1. **Report status filter:** not implemented. `GET /reports/summary` aggregates documents of any status (draft and finalized), because hiding drafts would hide real business state from the owner.
2. **`duplicate`:** allowed on any document regardless of status, and always produces a new `draft` with recalculated totals (never copied from the cached values on the source).
3. **Auth:** JWT, HS256, 24h expiration, no refresh token.
4. **Fixed discount exceeding the line subtotal:** rejected (`422 DISCOUNT_EXCEEDS_SUBTOTAL`), never silently clamped — a clamp would hide an input error; a rejection makes it explicit and auditable.
5. **`finalize` on a document with zero lines:** rejected (`422 DOCUMENT_HAS_NO_LINES`).
6. **Finalize validation for `quantity ≤ 0` / negative prices (stretch goal):** two layers, not one. `quantity` (`≥ 1`) and `unitPriceCents` (`≥ 0`) are validated by the same Zod schema on every create/patch, so a stored line can never have an invalid value in the first place — but `finalize` also re-checks every line explicitly (same `422 DOCUMENT_HAS_NO_LINES` code, "Document has invalid lines and cannot be finalized") as a defense-in-depth guard, not because the primary path can be bypassed.
7. **Printable view (stretch goal):** implemented — `/documents/[id]/print` in the frontend, plain HTML via `window.print()` and a `@media print` stylesheet that hides the app chrome, no PDF library.
8. **Report date range:** inclusive on both ends, interpreted in UTC (`from T00:00:00.000Z` .. `to T23:59:59.999Z`).
9. **Units on the wire:** money is always integer cents; percentages are always human values (0–100, max 2 decimals) in requests and responses. Formatting to decimal currency is the frontend's responsibility.
10. **Rounding:** half-up, applied in exactly two places per line, pure integer arithmetic (see above).

### What would be improved before real production use

- Refresh tokens (today, a token that expires means signing in again — there's no rotation).
- WAF (rate limiting is in place: `/api/v1/auth/*` at 10 req/15min, and `/api/v1/documents/*` + `/api/v1/reports/*` at 100 req/15min, both per IP, both returning `429 RATE_LIMITED`).
- **Rate limit is per-process, not global.** `express-rate-limit`'s default store is an in-memory counter local to each running process. ECS runs the API as N task replicas behind a load balancer, and each replica has its own counter — so the effective limit across the deployment is N × the configured number, not the configured number. Evidence measured live: 115 consecutive `GET /documents` requests from the same IP/token never returned `429`, and the `ratelimit` response header's `remaining` value does not decrease monotonically across consecutive requests (observed: 50 → 75 → 74 → 51 → 49 → 73), which only happens if requests are landing on different counters. Fixing this needs a shared store (Redis) or rate limiting at the load balancer, both out of scope for now — see below.
- Filters on `GET /documents` (e.g. by `status`) are not specified and remain out of scope. Pagination itself is implemented — `GET /documents` returns `{items, page, limit, total, totalPages}` (`page` integer ≥1 default 1, `limit` integer 1..100 default 20, `422 INVALID_PAGINATION` on invalid values).
- `Decimal128` / multi-currency support if the system ever needs more than one currency.
- Audit log / change history on documents.
- Explicit optimistic locking (today concurrency safety relies entirely on the conditional-write pattern above, which is correct but doesn't surface a version number to clients).
- Observability: structured logging, request tracing, metrics/alerts beyond the ECS health check.
- Shared rate-limit store (Redis) or rate limiting at the load balancer, so the limit holds across all ECS replicas instead of per-process (see above).

### Deployment

- Container: multi-stage `Dockerfile` (build stage compiles TypeScript with `devDependencies`; runtime stage is `node:20-slim` with only production `dependencies`, running as a non-root user).
- Image registry: Amazon ECR (`crossval-api`, `us-east-2`).
- Runtime: Amazon ECS (Express Mode), deployed from the ECR image, health check on `GET /health`.
- Database: MongoDB Atlas (not DocumentDB — see [ARCHITECTURE.md](./ARCHITECTURE.md) for why).
- Secrets (`JWT_SECRET`, `MONGODB_URI`) are set as ECS task environment variables, never baked into the image or committed to the repository.

## Frontend

Next.js 15 (App Router) app under `frontend/` — the client for the backend API above. Server Components + Server Actions throughout; there is no client-side data-fetching layer and no state management library.

### Tech stack

- Next.js 15 / React 19, TypeScript (`strict: true`)
- Tailwind CSS v4 (`@theme inline` design tokens)
- Server Actions (`"use server"`) for every mutation (auth, documents) — no client-side `fetch` to the API
- Vitest for unit tests

### Prerequisites

- Node.js 20+
- npm
- The backend API reachable from wherever the frontend runs (either the live deployment above, or a local `npm run dev` from the repo root)

### Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# edit .env.local — set API_BASE_URL (see table below)
npm run dev          # next dev --turbopack, http://localhost:3000
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `API_BASE_URL` | **yes** | Host only, e.g. `http://localhost:3000` or the live ECS URL above — `/api/v1` is appended by `apiFetch`. **No `NEXT_PUBLIC_` prefix on purpose**: every API call happens on the Next.js server (Server Actions / Server Components), so this value must never be bundled into client JS. |

### Running tests

```bash
cd frontend
npm test              # vitest run — lib/money.test.ts, lib/error-messages.test.ts
npm run lint           # eslint
npm run build          # next build --turbopack, typechecks as part of the build
```

### Deployment

- Platform: Vercel, deployed from `frontend/` as the project root.
- `API_BASE_URL` is set as a Vercel environment variable (server-only, not exposed to the client — see above).

### Trade-offs

1. **Session token in an httpOnly cookie, not `localStorage`.** On login/signup, the Server Action stores the JWT in an `httpOnly`, `secure`, `sameSite=lax` cookie (`frontend/actions/auth.actions.ts`) and `middleware.ts` reads it server-side to gate every non-public route. The token never reaches client-side JavaScript — `document.cookie` cannot see it, so it isn't readable by an injected script. The usual alternative, storing the token in `localStorage` and attaching it from client code, is simpler but leaves the token fully exposed to any XSS on the page. The trade-off is that the token also isn't directly readable by client components, which is why every API call is a Server Action or Server Component fetch (see next point) rather than a client-side `fetch`.
2. **The frontend performs no arithmetic on money.** All `*Cents` and `*Percent` values displayed (line totals, discounts, tax, document/report grand totals) come directly from API responses — `frontend/lib/money.ts` only formats (`formatCents`, `formatPercent`) and parses user input (`parseCentsInput`, `parsePercentInput`); none of it computes a total. Verifiable directly: `grep -rnE '[A-Za-z_]+Cents\s*[+\-*/]|[A-Za-z_]+Percent\s*[+\-*/]' frontend/app frontend/components frontend/actions frontend/lib` returns nothing — no arithmetic operator is ever applied to a money or percent field client-side. This keeps the pricing/rounding policy (see backend section above) authoritative in exactly one place.
