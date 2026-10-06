# TechLaunchpad — Premium Notes Selling Platform

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

Set `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` to your **live site URL** (custom domain or Vercel URL). They must match the domain students use in the browser, or login/cart cookies will not work.

**Cashfree:** In [merchant.cashfree.com](https://merchant.cashfree.com) → **Developers**, whitelist every domain you use (e.g. `https://www.techlaunchpad.in` and `https://premium-notes-marketplace.vercel.app`). Without whitelisting, checkout shows “Broken Link / domain not enabled”.

**Checkout shows wrong name (e.g. Quantronsoft on UPI scan):** That text comes from your **Cashfree merchant business profile**, not from this repo. Update it in the Cashfree dashboard: **Payment Gateway → One Click Checkout → Customisation → Visual Customisation** (brand name + logo). For the **UPI QR payee name**, change **Account / Business → Trade or brand name** to **TechLaunchpad**, or contact Cashfree support to update the QR display name. Optional env: `PAYMENT_MERCHANT_LABEL=TechLaunchpad` (order note/tags on each payment).

### Sync env vars with Vercel CLI

This agent runtime does **not** receive your Vercel token unless you add it as a Cloud Agent secret. To push variables in one step locally or in a trusted CI job:

```bash
export VERCEL_TOKEN=your_token
cp .env.example .env.vercel.local   # fill real values; never commit
chmod +x scripts/sync-vercel-env.sh
./scripts/sync-vercel-env.sh production
```

Use `./scripts/sync-vercel-env.sh all` to mirror vars to Preview and Development too.

**`DATABASE_URL` must be the PostgreSQL URI** from Supabase (starts with `postgresql://`), not the `https://….supabase.co` project URL.

**Large PDF/cover uploads:** Admin uploads go **directly to S3-compatible storage** (presigned URLs) so they bypass Vercel’s ~4.5MB function body limit. Enable **CORS** on your storage bucket to allow `PUT` from your site origin (e.g. `https://premium-notes-marketplace.vercel.app`).

## Scripts

- `npm run db:push` — sync schema (dev)
- `npm run db:migrate` — apply migrations (prod)
- `npm run db:seed` — create/update admin user
