# WhatsApp Support CRM (multi-tenant)

## Removed
- Placement **WhatsApp Channel** auto-post (Wapito/WALayer newsletter posting) — tables `whatsapp_channel_settings`, `job_whatsapp_channel_posts` dropped.
- Student **WhatsApp apply** (wa.me / share) is unchanged.

## Panels
| URL | Role |
|-----|------|
| `/super-admin/login` | `SUPER_ADMIN` |
| `/crm/login` | `COMPANY_ADMIN`, `AGENT` |
| `/admin/login` | Marketplace `ADMIN` (unchanged) |

## Bootstrap super admin
After migration, promote a user once (SQL example):

```sql
UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'you@example.com';
```

## WALayer (provider)
- **Auth:** `Authorization: Bearer wsk_live_…`
- **QR connect:** `POST /v1/sessions`, `GET /v1/sessions/:id/pair/stream` (proxied at `/api/crm/connections/:id/pair/stream`)
- **Inbox send:** `POST /v1/sessions/:id/messages` with `Idempotency-Key`
- **Webhooks:** `POST /api/webhooks/walayer` — verify `x-signature` / `x-timestamp` when `webhookSecret` is set
- **Calls:** API documents **reject incoming** only (`POST .../calls/:cid/reject`). No outgoing or in-browser answer — UI shows this honestly.
- **Delivery webhooks:** `message.sent/delivered/read` are listed as *reserved, not emitted yet* in WALayer docs — poll inbox or `GET /v1/messages/:id` for status.

## Env
- `AUTH_SECRET` — encrypts WALayer API key in `crm_platform_settings`
- `WALAYER_WEBHOOK_SECRET` — optional fallback if not stored in DB
- `NEXTAUTH_URL` — used for webhook URL display

## Tenant isolation
All CRM APIs scope by `companyId` from `crm_company_members`. Cross-company access returns 403.

## What’s MVP vs next
| Working with credentials | Stub / phase 2 |
|--------------------------|----------------|
| Companies, plans, limits | Full billing checkout |
| QR connection flow | Media upload composer |
| Inbound webhook → inbox | Campaign send runner |
| Agent reply + attribution label | Advanced reports export |
| Assignment + internal notes | Chatbot rule engine UI |
| Call reject + history | Outgoing calls |
