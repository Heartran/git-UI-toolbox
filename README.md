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
git push --force-with-lease origin <branch>
```

> **Warning**: force-pushing rewrites public history permanently. Make sure you have a backup and coordinate with your team before proceeding. Collaborators will need to re-clone or rebase onto the new history.

---

## Deployment

### Frontend — GitHub Pages

The frontend builds to a static bundle and can be hosted anywhere. A GitHub Actions workflow is included.

**1. Set the Vite base path** in `vite.config.js` to match your repository name:

```js
base: '/git-UI-toolbix/',
```

**2. Add the repository secret** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VITE_API_BASE` | Full HTTPS URL of your deployed backend, e.g. `https://api.example.com` |

**3. Enable GitHub Pages** in repository settings: Source → **GitHub Actions**.

Push to `main` — the workflow in `.github/workflows/deploy.yml` will build and deploy automatically.

### Backend — any Node.js host

The backend is a plain Express app with no database and no state. It can be deployed to Railway, Render, Fly.io, a VPS, or any platform that runs Node.js.

Required environment variables:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope |
| `PORT` | Port to listen on (default: `3001`) |

For production, restrict the `cors()` origin in `server/index.js` to your frontend domain.

---

## Security

- `GITHUB_TOKEN` lives exclusively in the backend process — never in the built assets, never sent to the browser.
- The generated bash scripts contain repository metadata (commit SHAs, author names) but no credentials.
- The frontend is fully auditable: it is a static React app with no hidden network calls.

---

## Roadmap

Git UI Toolbox is designed to grow. Planned tools:

- **git::blame-explorer** — visualise blame across file history with author filtering
- **git::conflict-resolver** — side-by-side merge conflict resolution UI
- **git::tag-manager** — create, annotate, delete, and push tags across repositories
- **git::branch-cleaner** — bulk-delete merged or stale branches with preview

Contributions and tool proposals are welcome — open an issue to discuss.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-tool`
3. Follow the existing code style (React functional components, inline styles with the shared design tokens in `GitHistoryRewriter.jsx`)
4. Open a pull request describing what the tool does and why it belongs in the toolbox
