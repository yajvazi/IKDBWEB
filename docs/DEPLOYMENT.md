# Deployment

This project is a Next.js App Router application intended to run on the VPS mounted filesystem. The current workspace mount is `/root`; the app lives at `/root/internetkudo-admin-platform`.

Minimum runtime:

- Node.js 22+
- PostgreSQL or Supabase Postgres
- Supabase Auth
- Stripe account and webhook endpoint
- Telco-vision OCS access, or `OCS_MOCK_MODE=true` outside production

Production must set `OCS_MOCK_MODE=false`. Startup validation fails if required production variables are absent.

Commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run start
```
