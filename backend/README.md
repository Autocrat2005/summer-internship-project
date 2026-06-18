# Backend

Express + TypeScript + Prisma API for the geospatial intelligence MVP.

## Environment

```bash
copy .env.example .env
```

Required only for persistent storage:

```text
DATABASE_URL=postgresql://...
```

Without `DATABASE_URL`, the API still runs with in-memory location storage and service fallbacks.

## Commands

```bash
npm run dev
npm run build
npm run test
npm run db:migrate
npm run db:migrate:dev
npm run db:push
npm run db:seed
```

## Deploy Notes

- Render root directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Add `DATABASE_URL` from Neon.
- Add `FRONTEND_ORIGIN` with the deployed Vercel frontend origin.
