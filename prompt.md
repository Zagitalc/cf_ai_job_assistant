follow the document to transform this current CV maker to a AI-powered job application assistant built on Cloudflare's infrastructure.

# CF_AI_JOB_ASSISTANT — Cloudflare Migration Plan
> Instructions for an AI coding agent. Follow phases in order. Do not skip ahead.
> Git migration is already complete. The repo exists at https://github.com/Zagitalc/cf_ai_job_assistant.

---

## Project Context

This is **OnClickCV / cf_ai_job_assistant** — a full-stack CV builder with AI review features.

Current stack:
- `client/` — React + Tailwind frontend, runs on port 3000
- `server/` — Node.js + Express backend, runs on port 4000
- MongoDB for data persistence
- OpenAI GPT for AI review (SSE streaming)
- Puppeteer for PDF export
- Docker for local dev and deployment

Target stack:
- `client/` — React + Tailwind → **Cloudflare Pages** (no changes to components)
- `server/` → **Cloudflare Worker** (replaces Express)
- MongoDB → **Durable Object built-in SQL** (replaces MongoDB entirely)
- OpenAI → **Workers AI, Llama 3.3** (replaces OpenAI calls)
- Puppeteer → **Cloudflare Browser Rendering** (replaces Puppeteer)
- New: **AIChatAgent** (Agents SDK) for stateful multi-turn job assistant chat

---

## Full Migration Phases (Overview)

| Phase | What | Key Output |
|-------|------|------------|
| **1** | Tooling setup + hello-world Worker | `worker/` directory, `wrangler.toml`, Worker deployed |
| **2** | Port Express routes to Worker | All `/api/*` routes working in Worker |
| **3** | Replace MongoDB with Durable Object SQL | CV data persists in DO, no MongoDB dependency |
| **4** | Replace OpenAI with Workers AI | AI review works via Llama 3.3 + SSE streaming |
| **5** | Add AIChatAgent (new feature) | Stateful multi-turn job assistant chat |
| **6** | Deploy frontend to Cloudflare Pages | Full app live on Cloudflare, no localhost |
| **7** | Replace Puppeteer with Browser Rendering | PDF export works in production |

---

## PHASE 1 — Tooling Setup + Hello-World Worker
> Implement this phase fully before moving on. Verify each step before proceeding to the next.

### Goal
Get a working Cloudflare Worker running locally with Wrangler, confirm it can be deployed, and establish the `worker/` directory structure that all future phases will build on.

### Prerequisites (confirm these exist before starting)
- Node.js v18+ installed (`node --version`)
- npm installed (`npm --version`)
- User is logged into GitHub
- Repo root is `cf_ai_job_assistant/`

---

### Step 1.1 — Install Wrangler globally

```bash
npm install -g wrangler
```

Verify:
```bash
wrangler --version
```
Expected: prints a version number like `wrangler 3.x.x`. If this fails, do not proceed.

---

### Step 1.2 — Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window. The user must log in to their Cloudflare account (or create one free at cloudflare.com). After login, verify:

```bash
wrangler whoami
```

Expected: prints the user's Cloudflare account name and email. If this fails or says "not logged in", do not proceed.

---

### Step 1.3 — Create the worker/ directory structure

From the project root (`cf_ai_job_assistant/`), create the following structure:

```
worker/
  src/
    index.ts        ← Worker entry point (replaces server/server.js)
    agent.ts        ← AIChatAgent class (Phase 5, stub only for now)
    durableObject.ts ← Durable Object class (Phase 3, stub only for now)
  package.json
  tsconfig.json
  wrangler.toml     ← Cloudflare config (equivalent to .env + Docker config)
```

Create these files with the exact content below.

---

### Step 1.4 — Create worker/package.json

```json
{
  "name": "cf-ai-job-assistant-worker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "cf-typegen": "wrangler types"
  },
  "dependencies": {
    "agents": "latest",
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0",
    "wrangler": "^3.0.0"
  }
}
```

Note: **Hono** is a lightweight Express-like router that runs natively in Cloudflare Workers. It will be used in Phase 2 to port the Express routes with minimal changes.

---

### Step 1.5 — Create worker/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

---

### Step 1.6 — Create worker/wrangler.toml

```toml
name = "cf-ai-job-assistant"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Workers AI binding — gives access to Llama 3.3 and other models
[ai]
binding = "AI"

# Durable Object binding — replaces MongoDB (configured in Phase 3)
[[durable_objects.bindings]]
name = "CV_STORE"
class_name = "CVStoreDurableObject"

# Durable Object migration — required when adding a new DO class
[[migrations]]
tag = "v1"
new_classes = ["CVStoreDurableObject"]

# Environment variables (non-secret)
[vars]
ENVIRONMENT = "development"

# For local dev: add secrets via `wrangler secret put SECRET_NAME`
# Never commit secrets to wrangler.toml
```

---

### Step 1.7 — Create worker/src/index.ts (hello-world entry point)

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Env interface — defines all Cloudflare bindings available to this Worker
export interface Env {
  AI: Ai                          // Workers AI binding
  CV_STORE: DurableObjectNamespace // Durable Object binding (Phase 3)
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS — allows the React frontend (localhost:3000 in dev, Pages URL in prod)
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://cf-ai-job-assistant.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check — verify Worker is running
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    message: 'CF AI Job Assistant Worker is running',
    timestamp: new Date().toISOString(),
  })
})

// Root route
app.get('/', (c) => {
  return c.text('CF AI Job Assistant Worker — see /api/health')
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404)
})

export default app
```

---

### Step 1.8 — Create stub files for future phases

**worker/src/durableObject.ts** (stub — Phase 3 will implement this fully):
```typescript
import { DurableObject } from 'cloudflare:workers'
import { Env } from './index'

// Replaces MongoDB in Phase 3
// Each user gets their own Durable Object instance with built-in SQLite
export class CVStoreDurableObject extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    return new Response('Durable Object stub — Phase 3 not yet implemented', { status: 501 })
  }
}
```

**worker/src/agent.ts** (stub — Phase 5 will implement this fully):
```typescript
// AIChatAgent stub — Phase 5 will implement the full job assistant agent
// This will replace the existing OpenAI service with a stateful Cloudflare Agent
export class JobAssistantAgent {
  // Phase 5: extend AIChatAgent from 'agents'
  // Will handle: CV tailoring, job description analysis, multi-turn chat
}
```

---

### Step 1.9 — Install worker dependencies

```bash
cd worker
npm install
```

---

### Step 1.10 — Run the Worker locally

```bash
cd worker
npm run dev
```

Expected output:
```
⛅️ wrangler 3.x.x
------------------
⎔ Starting local server...
[mf:inf] Ready on http://localhost:8787
```

Test it:
```bash
curl http://localhost:8787/api/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "development",
  "message": "CF AI Job Assistant Worker is running",
  "timestamp": "..."
}
```

If this works, Phase 1 is complete.

---

### Step 1.11 — Update root package.json to include worker dev command

In the root `package.json`, update the `scripts` section to add worker commands alongside the existing client/server commands:

```json
{
  "scripts": {
    "dev": "bash scripts/dev.sh",
    "dev:worker": "cd worker && npm run dev",
    "dev:client": "cd client && npm start",
    "dev:server": "cd server && npm start",
    "deploy:worker": "cd worker && npm run deploy"
  }
}
```

---

### Step 1.12 — Optional: Deploy to Cloudflare (verify cloud deploy works)

```bash
cd worker
npm run deploy
```

Expected: Wrangler bundles and uploads the Worker. Output includes a live URL like:
```
https://cf-ai-job-assistant.<your-subdomain>.workers.dev
```

Test the live URL:
```bash
curl https://cf-ai-job-assistant.<your-subdomain>.workers.dev/api/health
```

---

### Phase 1 Completion Checklist
Before moving to Phase 2, confirm ALL of these:

- [ ] `wrangler --version` prints a version number
- [ ] `wrangler whoami` shows the Cloudflare account
- [ ] `worker/` directory exists with all files from Steps 1.3–1.8
- [ ] `npm run dev` in `worker/` starts without errors on port 8787
- [ ] `curl http://localhost:8787/api/health` returns `{ "status": "ok" }`
- [ ] Root `package.json` has `dev:worker` script
- [ ] (Optional) Worker is deployed and live URL returns health check

---

## What Phase 2 Will Do (preview — do not implement yet)

Phase 2 will port all Express routes from `server/routes/` into the Hono router in `worker/src/index.ts`. Each route file maps directly:

| Express route file | Hono equivalent |
|-------------------|-----------------|
| `routes/cv.js` | `app.get/post('/api/cv', ...)` |
| `routes/export.js` | `app.post('/api/export', ...)` |
| `routes/ai.js` | `app.post('/api/ai/review', ...)` |

The Express `req`/`res` pattern maps almost 1:1 to Hono's `c.req`/`c.json()` pattern, so this phase is mostly mechanical translation with minimal logic changes.

