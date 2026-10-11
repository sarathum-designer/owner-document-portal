# Raghav Realty: Owner Portal

A secure web portal where property owners upload and track verification documents, and administrators review them.

## Features

- **Customer portal** (`customer.html`): owners sign in, submit documents and check verification status
- **Admin console** (`admin.html`): review, verify and manage owner records
- **Authentication:** bcrypt-hashed credentials and JWT sessions
- **Serverless API:** Vercel functions in `/api` backed by Supabase (Postgres)

## Tech

`Supabase` · `Vercel Serverless Functions` · `bcryptjs` · `jsonwebtoken` · HTML/CSS/JS

## Project structure

```text
index.html, customer.html, admin.html   Login, owner portal and admin console
css/, js/                               Page styles and scripts
api/                                    Vercel serverless functions
api/records.js                          One function serving the bill and document-review routes
api/_*.js                               Shared helpers and route handlers (not deployed as separate functions)
```

## Setup

1. Create a Supabase project and run `supabase-setup.sql`, then `bill-migration.sql`, in its SQL editor.
2. Copy `.env.example` and add these variables in **Vercel → Settings → Environment Variables**:
   - `SUPABASE_SERVICE_KEY`: the service-role key (server-side only, never expose it to the client)
   - `JWT_SECRET`: a long random string, e.g. from `openssl rand -base64 32`
3. Deploy:

```bash
npm install
npx vercel --prod
```

## Security notes

- Keep the service-role key in environment variables only and never commit it.
- Admin credentials live in the Supabase `admins` table as hashed values.
