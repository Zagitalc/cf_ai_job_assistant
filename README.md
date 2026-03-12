# OnClickCV

OnClickCV is a CV builder that is being migrated into an AI-powered job application assistant on Cloudflare.

The current app has:
- a React client in `client/`
- a Cloudflare Worker backend in `worker/`
- a legacy Express server in `server/` that is kept only for compatibility/reference during migration

## Current Status

Migration progress against the Cloudflare plan:
- Phase 1 complete: Worker bootstrap and Wrangler setup
- Phase 2 complete: core API routes moved to the Worker
- Phase 3 complete: CV persistence uses SQLite-backed Durable Objects
- Phase 4 in progress: Workers AI review is implemented but still being tuned for structured output reliability
- Phase 5 in progress: assistant chat is live and persisted, with ongoing prompt/response hardening
- Phase 6 partial: Word export works, PDF export requires remote Cloudflare mode
- Phase 7 pending: deployment hardening and cleanup

## Repo Layout

```text
cf_ai_job_assistant/
├── client/                React CV editor and assistant UI
├── worker/                Cloudflare Worker, Durable Objects, Workers AI, Agent
├── server/                Legacy Express backend (not primary runtime)
├── fixtures/              Mock CV payloads for testing
├── scripts/               Root dev scripts
└── README.md
```

Important Worker files:
- `worker/src/index.ts`: API routes and HTTP entrypoint
- `worker/src/durableObject.ts`: CV persistence in Durable Object SQLite
- `worker/src/agent.ts`: job assistant agent
- `worker/src/services/aiReview.ts`: Workers AI review logic
- `worker/src/services/export.ts`: Word/PDF export logic

## Requirements

- Node.js 18+
- npm
- Cloudflare account for remote AI/PDF testing
- Wrangler-compatible Cloudflare auth for remote mode

## Install

From the repo root:

```bash
npm --prefix client install
npm --prefix worker install
npm --prefix server install
```

## Environment Files

These files are intentionally ignored by git:
- `.env`
- `client/.env`
- `server/.env`
- `worker/.dev.vars`

Use them as placeholders only. Do not commit secrets.

Recommended setup:

Root `.env`
```env
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

Client `client/.env`
```env
REACT_APP_API_BASE_URL=http://localhost:8787
REACT_APP_AGENT_BASE_URL=http://localhost:8787
```

Worker `worker/.dev.vars`
```env
# Worker runtime vars only. Do not put Wrangler auth here unless you explicitly need them in Worker runtime.
ENVIRONMENT=development
AI_REVIEW_ENABLED=true
ALLOWED_ORIGINS=http://localhost:3000,https://cf-ai-job-assistant.pages.dev
PAGES_URL=https://cf-ai-job-assistant.pages.dev
```

Important:
- Wrangler CLI auth should come from your shell environment or `wrangler login`, not from committed files.
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are for Wrangler, not for the React app.

## Development Modes

### Local mode

Runs the Worker with local-only bindings and starts the client.

```bash
npm run dev
```

What works:
- CV save/load
- preview
- layout/testing
- Word export

What is intentionally disabled:
- AI Review
- Assistant
- PDF export

Ports:
- client: `http://localhost:3000`
- worker API: `http://localhost:8787`

### Remote Cloudflare mode

Runs the Worker with remote Workers AI and Browser Rendering bindings, then starts the client with AI features enabled.

```bash
npm run dev:remote
```

This is the mode required for:
- AI Review
- Assistant chat
- PDF export

If you prefer separate terminals:

```bash
npm run dev:worker:remote
npm run dev:client
```

Open the app at:

```text
http://localhost:3000
```

The Worker API itself is at:

```text
http://localhost:8787
```

## Cloudflare Auth

Remote mode requires valid Cloudflare auth.

Either:

```bash
npx wrangler login
```

Or export a working API token:

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
```

Minimum practical token scope for this project:
- `User / Memberships / Read`
- `User / User Details / Read`
- `Account / Workers Scripts / Edit`
- `Account / Workers AI / Read`
- `Account / Workers AI / Edit`
- `Account / Browser Rendering / Edit`
- `Account / Account Settings / Read`

Optional:
- `Account / Cloudflare Pages / Edit`
- `Account / Workers Tail / Read`

## Mock CV Fixture

Use the included fixture to seed a realistic CV for testing.

Save payload:
- `fixtures/senior-software-engineer-save-payload.json`

Raw CV data:
- `fixtures/senior-software-engineer-cv.json`

Save it into the Worker:

```bash
curl -X POST http://localhost:8787/api/cv/save \
  -H 'Content-Type: application/json' \
  --data @fixtures/senior-software-engineer-save-payload.json
```

Then in the UI:
- open `Save / Load`
- set `User ID` to `debug-senior-swe`
- click `Load CV`

## Main API Routes

Implemented on the Worker:
- `GET /api/health`
- `POST /api/cv/save`
- `GET /api/cv/:userId`
- `POST /api/ai/review`
- `POST /api/ai/review/stream`
- `POST /api/export/pdf`
- `POST /api/export/word`
- `GET /agents/job-assistant/:userId`

## Testing

Client tests:

```bash
CI=true npm --prefix client test -- --watchAll=false App.test.js
```

Client production build:

```bash
npm --prefix client run build
```

Worker typecheck:

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.json
```

Run that from `worker/`.

## Troubleshooting

### The UI loads but save/load fails

Check that the Worker is running on `localhost:8787`.

Health check:

```bash
curl http://localhost:8787/api/health
```

### AI buttons are missing

That is expected in local mode. Use:

```bash
npm run dev:remote
```

### PDF export is unavailable

That is expected in local mode. PDF export depends on Cloudflare Browser Rendering in remote mode.

### AI review returns a fallback score or fallback summary

That means the Worker could not normalize the Workers AI output cleanly.

In remote mode, Wrangler now logs debug lines like:
- `[ai-review-debug] ...`
- `[assistant-debug] ...`

Use those logs to inspect:
- truncation
- malformed JSON
- wrong response envelope
- schema drift

### Assistant replies appear but suggested patches stay empty

The UI now refreshes the persisted agent snapshot when a chat request completes. If suggestions still do not appear:
- clear the chat
- retry with a fresh `userId`
- inspect `[assistant-debug] response.normalized`

## Notes

- `server/` still exists, but it is not the target runtime going forward.
- `client/build/`, `node_modules/`, `.env*`, and `.dev.vars*` are ignored and should not be committed.
- Before pushing, review `git status` and make sure no secret-bearing local files are staged.
