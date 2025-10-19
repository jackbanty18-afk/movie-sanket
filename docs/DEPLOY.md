# Deployment guide (Supabase + Vercel)

1) Environment variables
- DATABASE_URL=<your Supabase Postgres URL>
- DB_DRIVER=pg
- JWT_SECRET=<random 32+ chars>
- ADMIN_EMAIL=<your admin email>
- DISABLE_SQLITE=1

Set these in:
- Local: .env.local
- Vercel Project Settings → Environment Variables (Preview/Production)

2) Supabase schema
- Open Supabase SQL editor
- Paste and run contents of supabase/schema.sql

3) Optional: migrate existing local SQLite data
- Ensure .env.local has DATABASE_URL and DB_DRIVER=pg
- Run: node scripts/migrate-sqlite-to-postgres.js

4) Health check locally
- node scripts/check-pg.js
- npm run dev and GET /api/health/db → { ok: true }

5) Auth & admin
- POST /api/auth/signup → POST /api/auth/login → use Authorization: Bearer <token>
- If ADMIN_EMAIL matches your user, admin is auto-assigned on first login

6) Admin APIs (with Bearer token)
- /api/admin/users, /api/admin/logs/stats, /api/admin/movies, /api/admin/theatres-shows, /api/admin/categories, /api/admin/theatre-pricing

7) Deploy to Vercel
- Push to main
- Ensure envs set in Vercel before deploy
- After deploy: GET /api/health/db and test admin endpoints
