# OnClickCV - Local Development Setup

OnClickCV is a full-stack CV builder for creating professional CVs with live preview, template switching, and export to PDF/Word.

## What's New in V3.1

V3.1 introduces the new glass UX system and a single, coherent AI review journey:

- **Unified Glass UI (Desktop + Mobile)**:
  - Dark navy mesh canvas across dashboard, editor, AI sheet, and preview
  - Frosted glass cards/sheets and reduced visual noise in card controls
  - Mobile moved from FAB speed-dial to fixed bottom navigation
- **Simplified Dashboard Cards**:
  - Per-card AI buttons removed
  - One primary card action (Edit/Open) with compact section metadata
  - Post-review section markers show where pending AI suggestions exist
- **AI Review as Bottom Sheet**:
  - Grouped suggestion cards by issue type (`impact`, `clarity`, `ats`, `length`)
  - Diff-style presentation (`originalText` vs `suggestedText`)
  - Per-suggestion **Apply** / **Dismiss** and confirmable **Apply All**
- **Streaming AI Review Delivery**:
  - New SSE endpoint: `POST /api/ai/review/stream`
  - Event flow: `start` -> `overall` -> `suggestion` -> `complete` (or `error`)
  - Client progressively renders suggestions with fallback to the existing `/api/ai/review` endpoint
- **Backend Suggestion Contract Upgrade**:
  - Suggestions now include `issueType` and `originalText` in normalized output
  - Existing `/api/ai/review` endpoint remains for compatibility

## Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js** (recommended v18+)
- **npm** (comes with Node.js)
- **Git** (optional but recommended)

## Quick Start

Follow these steps to set up and run OnClickCV locally:

### Step 1: Clone the repository (if using Git)

```bash
git clone https://github.com/<your-username>/OnClickCV.git
```

Replace `<your-username>` with your GitHub username or repository URL.

Alternatively, if you already have the code downloaded, skip this step.

### Step 2: Install dependencies

Navigate to the project directories and install the required dependencies:

```bash
# Install backend and frontend dependencies
cd server && npm install
cd ../client && npm install

# Back to project root
cd ..
```

### Step 3: One-click start (recommended)

Run both backend and frontend with a single command from the project root:

```bash
npm run dev
```

This script:
- Checks that ports `4000` (backend) and `3000` (frontend) are free
- Starts backend first
- Waits until backend is listening
- Starts frontend second

### Step 4: Manual start (fallback)

If you prefer running each app separately:

```bash
# Terminal 1
cd server
npm start

# Terminal 2
cd client
npm start
```

### Step 4.1: Enable AI Review (V3)

AI review is feature-flagged and configured via environment files:

`server/.env`

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/onclickcv
AI_REVIEW_ENABLED=true
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
OPENAI_MODEL=gpt-5-mini
```

`client/.env`

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_AI_REVIEW_ENABLED=true
```

Important:
- Keep `OPENAI_API_KEY` only in `server/.env` (never in `client/.env`).
- Restart server/client after changing env files.

### Step 5: Set up Tailwind CSS (Frontend)

Tailwind CSS is already configured in this project. If you need to set it up again or want to understand the process, follow these steps **inside the `client` folder**:

```bash
# Install Tailwind CSS and its dependencies
npm install -D tailwindcss postcss autoprefixer

# Initialize Tailwind config files
npx tailwindcss init -p
```

Edit `tailwind.config.js` to include:

```js
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

In `src/index.css`, ensure you have only:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

You can now use Tailwind utility classes throughout your React components.

The backend server runs by default on `http://localhost:4000`, and the frontend runs on `http://localhost:3000`.

## Docker

You can run OnClickCV as a single app container (frontend + backend) with MongoDB.

### Build the image

From project root:

```bash
docker build -t zach1328/onclickcv:latest .
```

### Run with Docker Compose (recommended)

```bash
docker compose up -d --build
```

Open:
- `http://localhost:4000`

Stop:

```bash
docker compose down
```

### Run with `docker run` (manual)

```bash
docker network create onclickcv-net

docker volume create onclickcv-mongo-data

docker run -d \
  --name onclickcv-mongo \
  --network onclickcv-net \
  -v onclickcv-mongo-data:/data/db \
  mongo:7

docker run -d \
  --name onclickcv-app \
  --network onclickcv-net \
  -p 4000:4000 \
  -e MONGODB_URI=mongodb://onclickcv-mongo:27017/onclickcv \
  zach1328/onclickcv:latest
```

Open:
- `http://localhost:4000`

### Run app container against MongoDB on your Mac host

If MongoDB is already running on your machine (outside Docker), use:

```bash
docker run -p 4000:4000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/onclickcv \
  zach1328/onclickcv:latest
```

### Push to Docker Hub

```bash
docker login
docker push zach1328/onclickcv:latest
```

## Usage

- Use the **CV Form** on the left to fill out your personal information, add skills dynamically, and add multiple education entries with rich text formatting.
- Preview your CV changes in real-time on the right side with virtual A4 pagination.
- Export your CV as a PDF or Word document by using the export buttons at the bottom of the form.

## Project Structure

```
OnClickCV
├── client
│   ├── public
│   └── src
│       ├── components
│       ├── templates
│       ├── App.js
│       └── index.css
│
└── server
    ├── controllers
    ├── routes
    ├── package.json
    └── server.js
```

## Customization

- **Templates:** Customize or add your own CV templates in `client/src/templates`.
- **Styles:** Update styles globally in `client/src/index.css` or template-specific CSS. For modern UI, use [Tailwind CSS](https://tailwindcss.com/docs/utility-first).

## Troubleshooting

- Why backend first? Frontend calls backend endpoints at `http://localhost:4000` directly (see `client/src/App.js`). If backend is not up, requests fail.
- Recommended: use `npm run dev` from root so startup order is handled automatically.
- If issues persist, verify ports (`4000` backend, `3000` frontend) are not occupied.

## Test Commands

Run these from project root:

```bash
# Client tests (targeted)
cd client
npm test -- --watchAll=false --runInBand src/App.test.js src/components/CVForm.test.js src/components/CVPreview.test.js

# Server tests (targeted)
cd ../server
SKIP_DB_SETUP=1 npm test -- --runInBand tests/export.controller.test.js
```

## Repo Hygiene (Avoid Leaks)

- Do not commit runtime cache artifacts from `client/node_modules/.cache/*`.
- Commit only source code, test files, and intentional config/docs changes.
- Keep environment files (`.env*`) out of version control.

## Dependencies Used

- **Frontend:** React, React Quill (WYSIWYG Editor), Tailwind CSS, axios (for requests, optional)
- **Backend:** Node.js, Express, Puppeteer (PDF generation), docx (Word generation), CORS

---
