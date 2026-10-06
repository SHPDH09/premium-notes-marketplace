# NoteVault Pro — Premium Notes Selling Platform

Production-ready notes marketplace with **Student Panel**, **Admin Panel**, secure checkout, coupons, and purchase-gated PDF access.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers (server-side APIs)
- **Database:** PostgreSQL (Supabase-compatible)
- **Auth:** NextAuth (credentials, JWT, role-based access)
- **Storage:** S3-compatible object storage (Supabase Storage S3)
- **Payments:** Cashfree PG
- **Deploy:** Vercel

## Project Structure

```
prisma/
  schema.prisma          # Data model
  migrations/            # SQL migrations
scripts/
  seed.ts                # Admin bootstrap (env-based password)
src/
  app/                   # Routes (public, student, admin, API)
  components/            # UI + layouts
  config/brand.ts        # Configurable brand name/logo text
  lib/                   # Auth, pricing, storage, payments, cart, orders
```

## Database Schema

Core tables: `users`, `admin_profiles`, `notes`, `coupons`, `coupon_notes`, `coupon_redemptions`, `cart_meta`, `cart_items`, `orders`, `order_items`, `transactions`, `purchases`.

See `prisma/schema.prisma` and `prisma/migrations/20260201000000_init/migration.sql`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. **Never commit secrets.**

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session/JWT signing secret |
| `NEXT_PUBLIC_APP_URL` | Public site URL (for payment return/webhook URLs) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial admin seed only |
| `STORAGE_*` | S3-compatible storage for covers/PDFs |
| `PAYMENT_API_KEY` / `PAYMENT_SECRET` | Cashfree credentials |
| `CASHFREE_ENV` / `NEXT_PUBLIC_CASHFREE_ENV` | `sandbox` or `production` |
| `ALLOW_DEV_PAYMENT` | `true` locally to skip gateway (disable in production) |
| `VERCEL_TOKEN` | Optional CLI deploy token (not used at runtime) |

Branding: `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_LOGO_TEXT`, `NEXT_PUBLIC_SUPPORT_EMAIL`.

## Local Setup

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL and AUTH_SECRET

npm run db:push          # or npm run db:migrate
npm run db:seed          # creates admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run dev
```

## Admin Login Setup

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in environment (Vercel + local).
2. Run `npm run db:seed` once after migrations.
3. Open `/admin/login` and sign in with those credentials.
4. Passwords are stored as bcrypt hashes only.

## Routes

**Public:** `/`, `/notes`, `/notes/[id]`, `/login`, `/register`

**Student:** `/dashboard`, `/cart`, `/purchases`, `/transactions`, `/profile`

**Admin:** `/admin/login`, `/admin`, `/admin/notes`, `/admin/coupons`, `/admin/users`, `/admin/transactions`, `/admin/profile`, `/admin/settings/password`

## Security Notes

- Prices, coupons, and ownership are validated **server-side** during checkout.
- Students cannot access admin APIs/routes; users only see their own purchases/transactions.
- PDFs use short-lived signed URLs via `/api/purchases/[noteId]/access` after purchase verification.
- No database or payment secrets are exposed to the browser.

## Vercel Deployment

1. Import the GitHub repository in Vercel.
2. Add all environment variables from `.env.example`.
3. Build command: `npm run build` (runs `prisma generate`).
4. After first deploy, run migrations against production DB:
   - `npx prisma migrate deploy` (from CI or local with production `DATABASE_URL`)
5. Run seed once: `npm run db:seed` with production env vars.

Set `NEXT_PUBLIC_APP_URL` to your Vercel domain and configure Cashfree webhook/return URLs accordingly.

## Scripts

- `npm run db:push` — sync schema (dev)
- `npm run db:migrate` — apply migrations (prod)
- `npm run db:seed` — create/update admin user
