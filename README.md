# git::rewriter — Git History Editor

A web UI for rewriting Git history: edit commit authors, messages, and dates, then export a ready-to-run `git-filter-repo` / `git filter-branch` bash script.

**Architecture**: React frontend (public-facing, zero credentials) + Express backend (holds the GitHub token, proxies all API calls).

---

## Features

- Browse all repositories accessible to the configured token
- Switch between branches
- Edit per-commit: author name/email, committer name/email, author/committer date, message
- **Batch mode**: select multiple commits and apply the same author/email changes at once
- Generate a ready-to-run bash script using `git-filter-repo` (with `git filter-branch` fallback for date changes)
- Copy the script to clipboard with one click

---

## Project Structure

```
git-UI-toolbix/
├── server/
│   └── index.js          # Express backend — GitHub API proxy
├── src/
│   ├── App.jsx
│   └── GitHistoryRewriter.jsx   # React frontend
├── .env.example           # Environment variable template
├── vite.config.js         # Dev proxy: /api → localhost:3001
└── package.json
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Heartran/git-UI-toolbix.git
cd git-UI-toolbix
npm install
```

### 2. Configure the backend

```bash
cp .env.example .env
```

Edit `.env`:

```env
# GitHub Personal Access Token with `repo` scope
# Generate at: https://github.com/settings/tokens
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Port for the Express backend (default: 3001)
PORT=3001
```

The token requires the **`repo`** scope to access private repositories. For public repos only, `public_repo` is sufficient.

### 3. Run in development

Start both processes in separate terminals:

```bash
# Terminal 1 — Express backend
npm run server

# Terminal 2 — Vite dev server (proxies /api → localhost:3001)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Using the generated script

The script requires [`git-filter-repo`](https://github.com/newren/git-filter-repo):

```bash
pip install git-filter-repo
```

Then run the downloaded script **inside your local clone** of the repository:

```bash
chmod +x rewrite.sh
./rewrite.sh
```

After the script completes, push the rewritten history:

```bash
git push --force-with-lease origin <branch>
```

> **Warning**: force-pushing rewrites public history. Coordinate with your team before proceeding.

---

## Deploying the frontend to GitHub Pages

The frontend is a static React app and can be hosted on GitHub Pages. The backend must be separately deployed (e.g. on Railway, Render, Fly.io, or your own server) and exposed via HTTPS.

### 1. Set the Vite base path

In `vite.config.js`, uncomment and update the `base` option to match your repository name:

```js
base: '/git-UI-toolbix/',
```

### 2. Point the frontend to the production backend

Set the `VITE_API_BASE` environment variable at build time to your backend URL:

```bash
VITE_API_BASE=https://your-backend.example.com npm run build
```

The `apiFetch` helper in `GitHistoryRewriter.jsx` uses this variable:

```js
const apiFetch = (path) =>
  fetch(`${import.meta.env.VITE_API_BASE || ''}/api${path}`).then(...)
```

### 3. Use the provided GitHub Actions workflow

The repository includes `.github/workflows/deploy.yml`. Push to `main` and the workflow will build and deploy to the `gh-pages` branch automatically.

**Required repository secret** (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `VITE_API_BASE` | Full URL of your deployed backend, e.g. `https://api.example.com` |

Enable GitHub Pages in your repository settings: **Source → Deploy from branch → `gh-pages` / `/ (root)`**.

---

## Backend deployment (any Node.js host)

The backend is a plain Express app. Set the following environment variables on your host:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope |
| `PORT` | Port to listen on (default: `3001`) |

Allow CORS from your GitHub Pages domain by adding it to the `cors()` config in `server/index.js` if you want to restrict origins in production.

---

## Security notes

- The `GITHUB_TOKEN` is **never sent to the browser**. All GitHub API calls are proxied through the backend.
- The generated bash script contains commit SHAs and metadata from your repository but no credentials.
- Restrict CORS in the backend to your frontend origin in production.
