# BOLESI Backend

Independent Node.js commerce API for the BOLESI storefront.

## Stack
- Node.js 20+, Express 5, PostgreSQL, Prisma 6
- JWT authentication and bcrypt password hashing
- M-Pesa Daraja STK Push (sandbox configuration only until BOLESI production credentials are supplied)

## API routes
- `GET /api/health` — database-aware health check
- `GET /api/config/public` — public payment and fulfilment capability flags
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/admin-bootstrap` — one-time super-admin creation using the `x-admin-setup-token` header
- `GET /api/categories`, `GET /api/products`, `GET /api/products/:slug`, `GET /api/branches`
- `POST/PATCH/DELETE /api/admin/categories`
- `POST/PATCH/DELETE /api/admin/products`; `POST /api/admin/products/:id/images`
- `POST/PATCH /api/admin/branches`; `PUT /api/admin/inventory`
- `GET /api/admin/orders`; `PATCH /api/admin/orders/:id/status`; `POST /api/admin/orders/:id/confirm-payment`
- `POST /api/orders`, `GET /api/orders/:orderNumber`
- `POST /api/payments/mpesa/stk`, `POST /api/payments/mpesa/callback`

All admin routes require a valid super-admin JWT. Checkout prices and stock are read from PostgreSQL, not trusted from the browser. Inventory is reserved during checkout and decremented after successful payment confirmation. Repeated payment callbacks are ignored after terminal processing.

## Local setup
1. Copy `.env.example` to `.env`.
2. Configure PostgreSQL `DATABASE_URL` and a long random `JWT_SECRET`.
3. Run `npm install`.
4. Run `npx prisma generate`.
5. Run `npx prisma db push`.
6. Run `node prisma/seed.js` to add editable starter categories.
7. Run `npm start`.

## Render
- Runtime: Node
- Build: `npm install && npx prisma generate`
- Start: `npm start`
- Health path: `/api/health`
- Region: Singapore
- The start script applies the Prisma schema and seeds starter categories when `DATABASE_URL` is configured. If it is blank, the API can start but database-backed endpoints remain unavailable.

Required environment:
- `DATABASE_URL`: Render Postgres internal connection string
- `JWT_SECRET`: generated secret
- `ADMIN_SETUP_TOKEN`: one-time secret for first super-admin creation
- `ALLOWED_ORIGINS`: comma-separated exact frontend origins
- `DELIVERY_FEE_KES`: set only after BOLESI confirms its delivery fee; delivery is disabled while blank
- Daraja: `MPESA_ENV`, `MPESA_BASE_URL`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_URL`

## Payment safety
- Keep Daraja in sandbox until BOLESI's own production app credentials and shortcode are supplied.
- Never commit secrets or use another business's credentials.
- M-Pesa orders become paid only after the callback is matched to a stored checkout request.
- Pay-at-shop orders remain unpaid until an administrator confirms receipt.
- Do not use a production payment callback URL without configuring the real Daraja app.

## Operational notes
- The initial Render PostgreSQL database is on the free plan and has a limited expiry; upgrade/backup before production launch.
- Branch locations and inventory are not invented or preloaded. Add verified branch details and stock through the admin API.
- Product claims, specifications, prices and warranty terms should be verified with BOLESI before catalogue publication.
