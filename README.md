# InternetKudo Admin Platform

Production Next.js admin dashboard and API gateway for InternetKudo operations.

## Includes

- Locked admin dashboard with file-backed VPS admin accounts
- OCS creation panel, package-template tools, reseller/account dropdowns, and QR generation
- Live OCS inventory, package, reseller, and balance reads
- Stripe-backed dashboard, orders, payments, and webhook surfaces
- OpenAPI/Swagger docs and normalized API routes

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and configure real server-side secrets locally. Do not commit `.env.local`.

## Checks

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

