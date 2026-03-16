# Git UI Toolbox

A collection of browser-based tools for Git power users — visual interfaces for operations that would otherwise require arcane command-line incantations.

Each tool in the toolbox is self-contained, works against the GitHub API, and outputs portable shell scripts you can inspect, version, and run locally. No magic, no black boxes: the UI does the thinking, the script does the work.

> **Current tool**: [git::rewriter](#gitrewriter--history-editor) — rewrite commit authors, messages, and dates across any branch.

---

## Architecture

```
Browser (React, zero credentials)
        │
        │  /api/*
        ▼
Express backend  ──►  GitHub API
  (GITHUB_TOKEN)
```

The frontend is a fully public static app. All GitHub API calls are proxied through a lightweight Express backend that holds the token server-side. Credentials never reach the browser.

---

## Tools

### git::rewriter — History Editor

Rewrite the history of any repository you have access to, then export a ready-to-run bash script that applies the changes via `git-filter-repo`.

**What you can edit per commit:**

| Field | Description |
|---|---|
| Author name & email | Change who is recorded as the commit author |
| Committer name & email | Change the committer identity (often the same as author) |
| Author date | Redate when the change was authored |
| Committer date | Redate when the commit was applied |
| Commit message | Rewrite the message body |

**Batch mode**: select any number of commits and apply the same author/email values to all of them at once — useful for consolidating identities across a repository's entire history.

**Script output**: the tool generates a commented bash script using `git-filter-repo` (falling back to `git filter-branch` for per-commit date changes). You copy it, run it locally on your clone, then force-push. The web UI never touches your repository directly.

---

## Project Structure

```
git-UI-toolbix/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages CI/CD
├── server/
│   └── index.js              # Express backend — GitHub API proxy
├── src/
│   ├── App.jsx
│   └── GitHistoryRewriter.jsx
├── .env.example              # Environment variable template
├── vite.config.js            # Dev proxy: /api → localhost:3001
└── package.json
```

---

## Setup

### Prerequisites

- Node.js 18+
- A GitHub Personal Access Token ([create one](https://github.com/settings/tokens)) with the **`repo`** scope (or `public_repo` if you only need public repositories)

### 1. Clone and install

```bash
npm install
```

### 2. Configure the backend

```bash
cp .env.example .env
```

Edit `.env`:

```env
# GitHub Personal Access Token with `repo` scope
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Port for the Express backend (default: 3001)
PORT=3001
```

### 3. Start

Open two terminals:

```bash
# Terminal 1 — Express backend (holds the token, proxies GitHub API)
npm run server

# Terminal 2 — Vite dev server (proxies /api → localhost:3001 automatically)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Applying the generated script

The generated script requires [`git-filter-repo`](https://github.com/newren/git-filter-repo):

```bash
pip install git-filter-repo
```

Run it inside your **local clone** of the target repository:

```bash
chmod +x rewrite.sh
./rewrite.sh
```

Then push the rewritten history:

```bash
npx wrangler deploy worker.js --name gh-oauth-proxy
npx wrangler secret put GITHUB_CLIENT_SECRET
```

> **Warning**: force-pushing rewrites public history permanently. Make sure you have a backup and coordinate with your team before proceeding. Collaborators will need to re-clone or rebase onto the new history.

---

## Deployment

### 1. Create GitHub OAuth App

Before deploying, register an OAuth App on GitHub:

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name:** `git-UI-toolbox`
   - **Homepage URL:** `https://heartran.github.io/git-UI-toolbox/`
   - **Authorization callback URL:** `https://[your-railway-url]/api/auth/github/callback` *(you'll update this after Railway deployment)*
4. Copy **Client ID** and generate **Client Secret**

### 2. Add GitHub Secrets

In your repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | Your OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Your OAuth App Client Secret |

### 3. Deploy Frontend — GitHub Pages

The frontend builds automatically via GitHub Actions.

**Prerequisites:**
- `vite.config.js` has `base: '/git-UI-toolbox/'` (already set)
- Enable GitHub Pages in repo settings: Source → **GitHub Actions**

Push to `main` — `.github/workflows/deploy.yml` handles it.

Frontend will be live at: **https://heartran.github.io/git-UI-toolbox/**

### 4. Deploy Backend — Railway

The backend Express server handles OAuth and proxies GitHub API calls.

**Steps:**

1. Go to https://railway.app and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"** → Select `git-UI-toolbox`
3. Railway auto-detects `railway.json` and deploys automatically
4. Once deployed, copy your Railway URL (e.g., `https://git-ui-toolbox-backend.up.railway.app`)
5. In your GitHub OAuth App settings, update **Authorization callback URL** to:
   ```
   https://your-railway-url/api/auth/github/callback
   ```

Backend environment variables are automatically set from GitHub Secrets.

---

**That's it!** The app is now fully deployed:
- Frontend: Static site on GitHub Pages
- Backend: OAuth + GitHub API proxy on Railway
- Zero configuration needed for users — just "Login con GitHub" 🎉

---

## Security

- **OAuth credentials (Client Secret) never reach the browser** — handled server-side on Railway only
- OAuth state token validated for CSRF protection
- The generated bash scripts contain repository metadata (commit SHAs, author names) but no credentials
- The frontend is fully auditable: it is a static React app with no hidden network calls
- All GitHub API calls proxied through backend — frontend never authenticates directly

---

## Roadmap

Git UI Toolbox is designed to grow. Planned tools:

- **git::blame-explorer** — visualise blame across file history with author filtering
- **git::conflict-resolver** — side-by-side merge conflict resolution UI
- **git::tag-manager** — create, annotate, delete, and push tags across repositories
- **git::branch-cleaner** — bulk-delete merged or stale branches with preview

Contributions and tool proposals are welcome — open an issue to discuss.

---

## Tech Stack

- **Frontend:** React 18 + Vite 6 (static build → GitHub Pages)
- **Backend:** Express.js (Node.js) → Railway
- **Authentication:** GitHub OAuth 2.0 (server-side)
- **API:** GitHub REST API v3 (proxied through backend)
- **Styling:** Zero external UI dependencies (inline styles with design tokens)
- **Deployment:** GitHub Actions (build) + GitHub Pages (frontend) + Railway (backend)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-tool`
3. Follow the existing code style (React functional components, inline styles with the shared design tokens in `GitHistoryRewriter.jsx`)
4. Open a pull request describing what the tool does and why it belongs in the toolbox
