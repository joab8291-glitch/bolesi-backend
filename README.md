# BOLESI Backend

Independent Node.js API for the BOLESI ecommerce storefront. Designed for deployment as a Render Web Service and integration with the BOLESI Next.js frontend.

## Stack
- Node.js 20+
- Express 5
- PostgreSQL + Prisma
- M-Pesa Daraja STK Push (sandbox by default)
- JWT-based customer/admin authentication (implementation phase)
- Branch-level inventory and order fulfilment

## Local setup
1. Copy `.env.example` to `.env` and configure values.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Apply schema: `npx prisma db push`
5. Start: `npm run dev`

## Render
- Runtime: Node
- Build command: `npm install && npx prisma generate`
- Start command: `npm start`
- Health check path: `/api/health`
- Bind to `0.0.0.0` and use Render's `PORT`.

## M-Pesa
Configure Daraja sandbox credentials first. Never commit secrets. STK callback must be a public HTTPS URL and must update an order only after a verified successful callback. Do not mark pay-at-shop orders as paid until staff confirm receipt.

## Security
CORS is allow-listed, Helmet is enabled, API rate limiting is active, and secrets are read from environment variables. Do not commit production credentials.