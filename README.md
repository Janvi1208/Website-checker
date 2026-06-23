# SiteMind AI

Paste a website URL. Get back a design audit, a trust score, a tech-stack
breakdown, real competitors, a business-model classification, a clone-cost
estimate, and a chat interface grounded in what was actually crawled.

This is a two-app project: a Next.js frontend and a separate Express/Node API
backend, talking to each other over HTTP. They are independently runnable,
independently deployable, and live in their own folders with their own
`package.json`, `node_modules`, and build scripts.

```text
sitemind-ai/
|-- frontend/          Next.js 14 App Router + TypeScript + Tailwind
|-- backend/           Express + TypeScript + MongoDB + AI agents
`-- docker-compose.yml Runs MongoDB + backend + frontend together
```

## Latest Updates

- The backend now uses Groq through the OpenAI-compatible API client instead of
  Anthropic directly.
- `GROQ_API_KEY` is now required for AI generation.
- `GROQ_MODEL` is optional and defaults to `openai/gpt-oss-120b`.
- `VOYAGE_API_KEY` is still optional; without it, RAG retrieval falls back to a
  deterministic non-semantic embedding.
- Auth cookies are now cross-site ready: `httpOnly`, `SameSite=None`, `Secure`,
  seven-day expiry, and `path=/`.
- The frontend API fallback currently points to the deployed backend URL in
  `frontend/src/lib/api.ts`, but local development should still set
  `NEXT_PUBLIC_API_URL=http://localhost:4000`.

## Why Split This Way

The frontend never talks to MongoDB or Groq directly. It only calls the
backend's REST API through `frontend/src/lib/api.ts`. The backend never renders
pages; it is a pure JSON API with AI agents, a crawler, screenshot capture,
tech detection, trust analysis, and a RAG pipeline behind it.

That separation lets each side be developed, tested, deployed, and scaled
independently.

## Architecture

```text
+-----------------------+      HTTP + cookies      +-----------------------+
|       frontend/       | -----------------------> |        backend/       |
| Next.js, port 3000    | <----------------------- | Express, port 4000    |
+-----------------------+                          +-----------+-----------+
                                                              |
                                                              v
                                                    +-----------------------+
                                                    |        MongoDB        |
                                                    +-----------------------+
```

Inside the backend, one request to `POST /api/sites/analyze` runs the full
pipeline:

```text
Crawl with fetch + cheerio -> pages, contact info, pricing, FAQs
      |
      |-- Screenshot capture, desktop + mobile
      |-- Tech detection from HTML and headers
      |-- Chunk + embed pages for the RAG index
      v
Research Agent, Groq -> summarizes what the company does
      |
      |-- Competitor Agent, Groq -> likely competitors
      |-- Revenue Agent, Groq -> business model
      |-- UX Agent, Groq -> design scoring from available crawl/screenshot context
      |-- Security Agent, signals + Groq -> trust score
      v
Cost Estimator, Groq -> clone effort, budget, timeline
      |
      v
Stored in MongoDB -> returned to frontend for dashboard and chat
```

Each agent is its own file under `backend/src/lib/agents/`.

## Getting Started

You will run two servers. Three terminals total is the simplest local setup:
one for MongoDB, one for the backend, and one for the frontend.

### 1. MongoDB

Use a local MongoDB install, Docker, or a free MongoDB Atlas cluster. Atlas gives
you a connection string without needing a local database install.

### 2. Backend

```bash
cd backend
npm install
```

Create or update `backend/.env`:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/sitemind
JWT_SECRET=replace_with_a_strong_secret
GROQ_API_KEY=replace_with_your_groq_key
GROQ_MODEL=openai/gpt-oss-120b
VOYAGE_API_KEY=
FRONTEND_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

The backend runs on `http://localhost:4000`. `npm run dev` uses `tsx watch` for
hot reload; `npm run build && npm start` runs the compiled production version.

### 3. Frontend

```bash
cd frontend
npm install
```

Create or update `frontend/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Then run:

```bash
npm run dev
```

The frontend runs on `http://localhost:3000`.

### Running Both With Docker

Create a root `.env` file for Docker Compose:

```env
JWT_SECRET=replace_with_a_strong_secret
GROQ_API_KEY=replace_with_your_groq_key
VOYAGE_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Then run:

```bash
docker compose up --build
```

This starts MongoDB, the backend, and the frontend together. The backend talks
to MongoDB through the `mongo` service name. The frontend receives
`NEXT_PUBLIC_API_URL` as a Docker build argument because Next.js inlines public
environment variables into the client bundle at build time.

## Environment Variables

### `backend/.env`

| Variable | Required | Notes |
|---|---:|---|
| `PORT` | No | Defaults to `4000`. |
| `MONGODB_URI` | Yes | Local MongoDB or MongoDB Atlas connection string. |
| `JWT_SECRET` | Yes | Use a strong random secret, for example from `openssl rand -base64 32`. |
| `GROQ_API_KEY` | Yes | Groq API key used by the backend AI agents. |
| `GROQ_MODEL` | No | Defaults to `openai/gpt-oss-120b`. |
| `FRONTEND_URL` | No | Defaults to `http://localhost:3000`; must match the frontend origin for CORS. |
| `VOYAGE_API_KEY` | No | Enables real semantic embeddings for RAG. Falls back when empty. |
| `NODE_ENV` | No | Defaults to `development`. |

### `frontend/.env`

| Variable | Required | Notes |
|---|---:|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL, for example `http://localhost:4000`. |

## Auth Across Two Origins

The frontend and backend run on different ports/origins. The backend sets the
session token as an `httpOnly` cookie with `SameSite=None` and `Secure`, and the
frontend API client sends requests with `credentials: "include"`.

The backend CORS config in `backend/src/app.ts` allows the configured
`FRONTEND_URL` with `credentials: true`. For login persistence to work, these
pieces must agree:

- `backend/.env` has the exact frontend origin in `FRONTEND_URL`.
- `frontend/.env` has the exact backend origin in `NEXT_PUBLIC_API_URL`.
- Requests are made with credentials enabled.
- In production or cross-site deployments, cookies require HTTPS because they
  are marked `Secure`.

## Verifying It Locally

Once both servers are running:

1. Register on the frontend, scan a real URL, and watch the analysis page poll
   until it is ready.
2. Open the Chat tab and ask a question like "what does this site do?" Confirm
   the answer uses crawled page context.
3. Open browser dev tools, log in, and confirm the `/api/auth/login` response
   includes `Set-Cookie`.
4. Confirm later API requests include the session cookie.

If the screenshot step returns nothing because a site blocks the screenshot
service or your network is restrictive, the UX Agent should return a clearly
labeled fallback instead of fabricating scores.

## Honest Limitations

- No background job queue. The analyze pipeline still runs inline in one HTTP
  request, so large sites should eventually move to BullMQ, Redis, or a
  serverless background job.
- Domain age, WHOIS, and registrar data are not populated yet. The schema and UI
  fields exist, but this needs a paid data provider.
- If `VOYAGE_API_KEY` is unset, embeddings fall back to a deterministic
  non-semantic hash. The app remains demoable, but retrieval quality is better
  with Voyage enabled.
- Crawling is HTTP-only with `fetch` and `cheerio`. Heavily client-rendered SPAs
  may crawl thin. Swapping in Playwright would mainly affect
  `backend/src/lib/crawler.ts`.
- The Groq wrapper keeps older helper names like `callClaudeForJson` for
  compatibility, even though requests now go to Groq.
- Image inputs in the current Groq wrapper are ignored, so vision-style UX
  analysis depends on available text/context unless the model path is upgraded.

## Project Structure

```text
backend/src/
|-- server.ts              Entrypoint: connects to MongoDB and starts Express
|-- app.ts                 Express app, CORS, route mounting, error handler
|-- routes/                auth.ts, sites.ts
|-- controllers/           authController.ts, sitesController.ts
|-- middleware/            requireAuth.ts
|-- models/                User.ts, Site.ts
`-- lib/
    |-- agents/            Research, UX, Security, Competitor, Revenue, Cost
    |-- crawler.ts
    |-- techDetection.ts
    |-- trustAnalysis.ts
    |-- screenshot.ts
    |-- rag.ts
    |-- claude.ts          Groq/OpenAI-compatible API wrapper
    |-- auth.ts
    |-- db.ts
    `-- config.ts

frontend/src/
|-- app/                   Next.js pages and route segments
|-- components/            Shared UI components
`-- lib/api.ts             Backend API client
```
