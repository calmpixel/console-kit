<div align="center">
  <span><a href="./README.md">中文</a> | English</span>
</div>

# Helm

Helm, the ops-console frontend base shell (Soybean / Naive UI). Backend API contracts live in the `gokit` repository's `docs/GOKIT_API.md` and `docs/console-frontend-style.md`.

## Running

```bash
cd console-kit
pnpm install
pnpm dev
```

The dev server listens on port `9527` by default (`vite --mode test`); the build output goes to `web/dist` outside the repository.

### Connecting to the real backend (default)

In `.env`, set `VITE_USE_MOCK=false`; the dev server proxies `/api`, `/ui` and `/mock-ui` to the local backend at `http://127.0.0.1:18080` (start the gokit service first).

### Previewing the UI without a backend (local mock)

Set `VITE_USE_MOCK` to `true` in `.env` to log in and browse the system management / dashboard without starting a backend. For personal local overrides, prefer `.env.local` (following Vite's official precedence; `*.local` files are not committed).

## Environment Files

| File        | Mode                 | Key values                                            |
| ----------- | -------------------- | ----------------------------------------------------- |
| `.env`      | common base          | `VITE_USE_MOCK=false`, `VITE_AUTH_ROUTE_MODE=dynamic` |
| `.env.test` | dev (`pnpm dev`)     | backend base `http://127.0.0.1:18080/api/console/v1`  |
| `.env.prod` | build (`pnpm build`) | same-origin `/api/console/v1`                         |

## Scope

Login shell, dashboard (system health), `views/system/**`, notification bell, and the AdminListPage list conventions.
Not included: assets / tenants / game cards.
