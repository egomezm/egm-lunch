# egm-lunch

A lunch picker for teams. Create a session, share the link or QR code, then everyone suggests up to 3 places, vetoes (one per other person), ranks what's left by drag and drop, and a Borda-count winner is shown with the full scoreboard.

React + TypeScript SPA (Vite 6) that builds to a fully static bundle. Shared state lives in Supabase (Postgres + realtime), accessed from the browser with the public anon key. All writes go through the validated SQL functions in `supabase/schema.sql`.

## Backend setup (one time)

1. Create a Supabase project.
2. SQL Editor: run `supabase/schema.sql`.
3. Copy the Project URL and anon key into `.env.local` (see `.env.example`) and into repo variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

## Connect with SQL Developer

Supabase uses PostgreSQL, while Oracle SQL Developer is primarily an Oracle client. If your SQL Developer installation supports third-party JDBC connections:

1. Download the PostgreSQL JDBC driver from [jdbc.postgresql.org](https://jdbc.postgresql.org/download/) and add its JAR using SQL Developer's third-party JDBC driver settings.
2. In the Supabase Dashboard, open **Connect** and choose **Session pooler**. Use the displayed host, port, and username; these values are specific to your project.
3. Create a PostgreSQL/JDBC connection with driver class `org.postgresql.Driver`, database `postgres`, and JDBC URL `jdbc:postgresql://<pooler-host>:<port>/postgres?sslmode=require`.
4. Enter the Supabase database password in SQL Developer. Do not use the project URL or anon key; those are for the app's Data API, not direct database access.

If your SQL Developer version does not offer a generic third-party JDBC connection type, it cannot connect to Supabase PostgreSQL directly. Use a PostgreSQL client such as DBeaver or pgAdmin instead. Avoid putting the database password in this repository.

## Develop

```bash
cp .env.example .env.local   # set the Supabase values
npm install
npm run dev
```

## Scripts

| Script            | Purpose                      |
| ----------------- | ---------------------------- |
| `npm run build`   | Type-check and build `dist/` |
| `npm run preview` | Serve `dist/` locally        |
| `npm test`        | Vitest + Testing Library     |
| `npm run lint`    | ESLint                       |
| `npm run format`  | Prettier                     |

## Deploy (GitHub Pages)

Push to `main`: GitHub Actions lints, tests, builds and deploys `dist/`.
One-time setup: repo Settings > Pages > Source = **GitHub Actions**; set the two repo variables above.

Notes: `base: './'` and `HashRouter` make the bundle work under `/egm-lunch/` with no server rewrites. `VITE_*` values are public; never store secrets (the service-role key must never be used here).
