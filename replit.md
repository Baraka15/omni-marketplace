# Lixar Gramz — powered by BraxAI

A professional, real-time e-commerce marketplace platform built with React+Vite, Express+TypeScript, PostgreSQL+Drizzle ORM, Socket.io, Clerk Auth, and Stripe+Flutterwave payment stubs.

## Architecture

### Monorepo Structure (pnpm workspaces)
- `artifacts/brax/` — React+Vite frontend (`@workspace/brax`)
- `artifacts/api-server/` — Express 5 backend (`@workspace/api-server`)
- `lib/api-spec/` — OpenAPI spec + Orval codegen config
- `lib/api-client-react/` — Generated React Query hooks (do not edit manually)
- `lib/api-zod/` — Generated Zod schemas (do not edit manually)
- `lib/db/` — Drizzle ORM schema and migrations

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS v4, wouter (routing), @tanstack/react-query
- **Auth**: @clerk/react (frontend), @clerk/express (backend)
- **Backend**: Express 5, TypeScript, pino logging
- **Database**: PostgreSQL via Drizzle ORM
- **Real-time**: Socket.io (path: `/ws`)
- **Payments**: Stripe (requires `STRIPE_SECRET_KEY`), Flutterwave (requires `FLUTTERWAVE_SECRET_KEY`)
- **UI**: Shadcn-style components, framer-motion, recharts
- **Code generation**: Orval from OpenAPI spec

## Design System
- **Brand palette**: Deep charcoal background (`hsl(230 28% 16%)`) + teal/green primary (`hsl(165 100% 39%)` = `#00C896`)
- **Feel**: Bloomberg Terminal meets luxury retail — information dense, premium, precise

## Key Files
- `artifacts/api-server/src/app.ts` — Express app, Clerk + Socket.io setup
- `artifacts/api-server/src/routes/index.ts` — all route registrations
- `artifacts/api-server/src/lib/socket.ts` — Socket.io setup, `emitSellerDashboardUpdate()`
- `artifacts/api-server/src/lib/auth.ts` — `requireAuth` middleware, `getCurrentUserId()`
- `lib/api-spec/openapi.yaml` — full OpenAPI spec (do NOT change `info.title`)
- `lib/api-spec/orval.config.ts` — Orval codegen config (mode: "single")
- `lib/db/src/schema/` — all Drizzle table schemas
- `artifacts/brax/src/App.tsx` — Clerk provider + wouter router
- `artifacts/brax/src/pages/` — all page components

## Pages & Routes
| Path | Component | Auth |
|------|-----------|------|
| `/` | Home | public |
| `/products` | Products listing | public |
| `/products/:id` | Product detail | public |
| `/cart` | Cart | required |
| `/checkout` | Checkout | required |
| `/orders` | Order history | required |
| `/orders/:id` | Order detail | required |
| `/rfq` | RFQ list | required |
| `/rfq/new` | Create RFQ | required |
| `/rfq/:id` | RFQ detail | required |
| `/seller/dashboard` | Seller dashboard (real-time) | required |
| `/seller/products` | Seller product management | required |
| `/seller/products/new` | Create product | required |
| `/seller/products/:id/edit` | Edit product | required |
| `/seller/orders` | Seller order management | required |
| `/sign-in` | Clerk sign-in | public |
| `/sign-up` | Clerk sign-up | public |

## API Endpoints (all under `/api`)
- `GET /api/healthz`
- `GET /api/categories`, `GET /api/categories/with-counts`
- `GET /api/products/featured`, `GET /api/products`, `GET /api/products/:id`, `GET /api/products/:id/inventory`
- `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` (auth required)
- `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:id`, `DELETE /api/cart/items/:id` (auth required)
- `GET /api/orders`, `GET /api/orders/recent`, `GET /api/orders/:id`, `POST /api/orders`, `PUT /api/orders/:id/status` (auth required)
- `GET /api/seller/profile`, `POST /api/seller/profile` (auth required)
- `GET /api/seller/products`, `GET /api/seller/orders` (auth required)
- `GET /api/seller/dashboard/stats`, `GET /api/seller/dashboard/revenue-chart` (auth required)
- `GET /api/rfq`, `POST /api/rfq`, `GET /api/rfq/:id`, `PUT /api/rfq/:id`, `POST /api/rfq/:id/quote`, `POST /api/rfq/:id/accept` (auth required)
- `POST /api/payments/stripe/create-intent`, `POST /api/payments/flutterwave/initiate` (auth required)
- `GET /api/marketplace/stats`

## Real-time (Socket.io)
- Server path: `/ws`
- Client connects: `io({ path: "/ws" })`
- Seller subscribes: `socket.emit("seller:subscribe", sellerId)`
- Server emits: `"dashboard:stats:update"` to `seller:<sellerId>` room on new orders

## Database Schema
Tables: `categories`, `sellers`, `products`, `carts`, `cart_items`, `orders`, `order_items`, `rfq`

## Codegen
```bash
pnpm --filter @workspace/api-spec run codegen
```
Regenerates `lib/api-client-react/src/generated/api.ts` and `lib/api-zod/src/generated/api.ts`.

## Environment Variables / Secrets
- `SESSION_SECRET` — set
- `CLERK_SECRET_KEY` — set (via Clerk integration)
- `CLERK_PUBLISHABLE_KEY` — set (via Clerk integration)
- `VITE_CLERK_PUBLISHABLE_KEY` — set (via Clerk integration)
- `DATABASE_URL` — set (PostgreSQL)
- `STRIPE_SECRET_KEY` — **not set** (payments will return 503 until configured)
- `FLUTTERWAVE_SECRET_KEY` — **not set** (payments will return 503 until configured)

## Seed Data
12 products across 8 categories, 1 demo seller ("BRAX Official Store") seeded in the database.

## Development Notes
- Do NOT run `pnpm dev` at workspace root — use workflow restart
- Do NOT edit generated files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`
- Orval mode is `"single"` (not `"split"`) — changing this breaks imports
- API server uses `httpServer` (not `app.listen`) to support Socket.io
- Payment routes return 503 gracefully when keys are not configured
