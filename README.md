# OnClickCV - Local Development Setup

OnClickCV is a full-stack CV builder for creating professional CVs with live preview, template switching, and export to PDF/Word.

## What's New in V2.1

V2.1 focuses on precision and preview/export parity:

- **Virtual A4 paged preview** (stacked pages with page labels instead of one long canvas)
- **Dark mode shell + white paper invariant** (preview paper remains white for print realism)
- **Accordion form UX** with cleaner sectioned editing
- **Form guardrails**:
  - profile summary word counter
  - rich-text draft word counters
  - non-blocking warnings for long entries
  - non-blocking section overfill warning based on preview layout metrics
- **Template B stability tuning** (better grid behavior and long-content wrapping)
- **Improved export parity** for PDF/Word:
  - date formatting consistency (`Sep 2001 - Jul 2003`)
  - rich-text normalization for cleaner output
  - PDF break-control wrappers to reduce awkward mid-item page cuts
  - Word keeps two-column template structure with improved section rendering

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
