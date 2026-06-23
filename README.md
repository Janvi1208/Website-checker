# SiteMind AI

Paste a website URL. Get back a design audit, a trust score, a tech-stack
breakdown, real competitors, a business-model classification, a clone-cost
estimate — and a chat interface grounded in what was actually crawled.

This is a **two-app project**: a Next.js frontend and a separate Express/Node
API backend, talking to each other over HTTP. They're independently
runnable, independently deployable, and live in their own folders with their
own `package.json`, `node_modules`, and CI job.

```
sitemind-ai/
├── frontend/     Next.js 14 (App Router) + TypeScript + Tailwind — UI only
├── backend/      Express + TypeScript + MongoDB — all API logic + AI agents
└── docker-compose.yml   runs mongo + backend + frontend together
```

## Why split this way

The frontend never talks to MongoDB or Anthropic directly — it only calls
the backend's REST API (`frontend/src/lib/api.ts` is the single place that
knows the backend's URL). The backend never renders anything — it's a pure
JSON API with five AI agents, a crawler, and a RAG pipeline behind it. That
separation is the actual point of the exercise: each side can be developed,
tested, deployed, and scaled independently, by different people, on
different schedules.

## Architecture

```
┌─────────────────────┐         HTTP + cookies          ┌──────────────────────┐
│      frontend/       │ ───────────────────────────────▶│       backend/        │
│   Next.js (port 3000) │◀─────────────────────────────── │  Express (port 4000)  │
└─────────────────────┘                                  └──────────┬───────────┘
                                                                      │
                                                          ┌───────────┴───────────┐
                                                          │       MongoDB          │
                                                          └────────────────────────┘
```

Inside the backend, one request to `POST /api/sites/analyze` runs the full
pipeline:

```
Crawl (fetch + cheerio) → pages, contact info, pricing, FAQs
      │
      ├──► Screenshot capture (desktop + mobile)
      ├──► Tech detection (HTML + header signatures)
      ├──► Chunk + embed pages (RAG index)
      │
      ▼
Research Agent (Claude) — summarizes what the company does
      │
      ├──► Competitor Agent (Claude + web search)
      ├──► Revenue Agent (Claude)            — business model
      ├──► UX Agent (Claude vision)           — design scores
      ├──► Security Agent (real signals + Claude) — trust score
      │
      ▼
Cost Estimator (Claude) — clone effort, budget, timeline
      │
      ▼
Stored in MongoDB ──► returned to frontend for the dashboard / chat
```

Each agent is its own file under `backend/src/lib/agents/`.

## Getting started

You'll run two servers. Three terminals total (one is MongoDB) is the
simplest path for local dev:

### 1. MongoDB

Use a local install, or the fastest path — a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster, which gives you a
connection string with no local install at all.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# fill in MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY
npm run dev
```

Runs on **http://localhost:4000**. `npm run dev` uses `tsx watch` for hot
reload; `npm run build && npm start` runs the compiled production version.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL defaults to http://localhost:4000, matching the backend above
npm run dev
```

Runs on **http://localhost:3000**. Open that in your browser.

### Running both with Docker instead

```bash
cp .env.example .env   # fill in JWT_SECRET and ANTHROPIC_API_KEY
docker compose up --build
```

This starts MongoDB, the backend, and the frontend together — no local
Node install needed at all. See `docker-compose.yml` for how the three
containers are wired (backend talks to `mongo` by its service name; frontend
is built with `NEXT_PUBLIC_API_URL` baked in as a build arg, since that
variable is inlined into the client JS bundle at build time, not read at
container runtime).

## Environment variables

**`backend/.env`**

| Variable | Required | Notes |
|---|---|---|
| `PORT` | No | Defaults to `4000` |
| `MONGODB_URI` | Yes | Local Mongo or [Atlas](https://www.mongodb.com/atlas) |
| `JWT_SECRET` | Yes | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Yes | [console.anthropic.com](https://console.anthropic.com) |
| `FRONTEND_URL` | Yes | Must match the frontend's origin exactly, for CORS |
| `VOYAGE_API_KEY` | No | Without it, RAG retrieval runs on a non-semantic fallback |

**`frontend/.env.local`**

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Where the backend lives, e.g. `http://localhost:4000` |

## Auth, across two origins

The frontend and backend run on different ports/origins, so this isn't a
same-site cookie setup by default. The backend sets the session token as an
`httpOnly` cookie and the frontend's API client (`frontend/src/lib/api.ts`)
sends every request with `credentials: "include"`; the backend's CORS
config (`backend/src/app.ts`) explicitly allows `FRONTEND_URL` with
`credentials: true`. All three pieces have to agree for login to actually
persist — if you change ports, update both `.env` files to match.

## Verifying it locally

A few features depend on reaching arbitrary external sites and services —
this was built and type-checked in a sandboxed environment with a
locked-down network allowlist, so the full pipeline could not be exercised
against a live website during development. Worth specifically checking once
you have both servers running:

1. **Register on the frontend → scan a real URL → watch the analysis page
   poll to "ready".** Exercises the crawler, screenshot service, and all
   five backend agents, plus the cross-origin cookie auth end-to-end.
2. **Chat tab** — ask "what does this site do?" and confirm the answer
   cites page paths, not just a generic summary.
3. **Open browser dev tools → Network tab** while logging in — confirm the
   `Set-Cookie` header is present on the `/api/auth/login` response and
   that subsequent requests include it.

If the screenshot step returns nothing (some sites block the screenshot
service, or you're on a restrictive network), the UX Agent returns a
clearly-labeled "not analyzed" result rather than fabricating scores —
that's intentional, not a bug.

## Honest limitations

- **No background job queue.** The analyze pipeline runs inline in one
  request (the backend's HTTP server timeout is extended to ~150s to give
  it room). A 50-page enterprise site would need this moved to a real queue
  (BullMQ + Redis, or a serverless background function).
- **Domain age / WHOIS / registrar data isn't populated** — needs a paid
  API. The fields exist in the schema and UI but are `null`. See
  `backend/src/lib/agents/securityAgent.ts`.
- **Embeddings fall back to a non-semantic hash if `VOYAGE_API_KEY` is
  unset.** The RAG pipeline still runs end-to-end; retrieval quality is
  much better with a real embedding model.
- **Crawling is HTTP-only (no headless browser).** Heavily client-rendered
  SPAs may crawl thin. Swapping in Playwright is a contained change to
  `backend/src/lib/crawler.ts`.

## Project structure

```
backend/src/
├── server.ts              # Entrypoint — connects to Mongo, starts Express
├── app.ts                  # Express app, CORS, route mounting, error handler
├── routes/                 # auth.ts, sites.ts
├── controllers/             # authController.ts, sitesController.ts
├── middleware/              # requireAuth.ts
├── models/                  # User.ts, Site.ts (Mongoose schemas)
└── lib/
    ├── agents/               # Research, UX, Security, Competitor, Revenue, Cost
    ├── crawler.ts, techDetection.ts, trustAnalysis.ts, screenshot.ts, rag.ts
    └── claude.ts, auth.ts, db.ts, config.ts

frontend/src/
├── app/                     # Next.js pages (landing, login, register, dashboard, sites/[id], settings)
├── components/               # Shared UI (score gauges, chat panel, tables, nav)
└── lib/api.ts                # The only file that knows the backend's URL
```
