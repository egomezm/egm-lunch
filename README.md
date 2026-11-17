# egm-lunch

Lightweight React + TypeScript SPA (Vite 6). Builds to a fully static bundle; data is persisted via client-side `fetch` calls to an external API.

## Develop

```bash
cp .env.example .env.local   # set VITE_API_BASE_URL
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
One-time setup: repo Settings > Pages > Source = **GitHub Actions**; set repo variable `VITE_API_BASE_URL`.

Notes: `base: './'` and `HashRouter` make the bundle work under `/egm-lunch/` with no server rewrites. `VITE_*` values are public; never store secrets. The API must allow CORS from the Pages origin.
