# git::rewriter — History Editor

Visual tool to rewrite git history. Browse your GitHub repos, edit commit authors, messages, and dates through a dark-mode UI, then generate ready-to-run `git-filter-repo` / `git filter-branch` scripts.

## Features

- **GitHub auth** — PAT (instant) or OAuth (Authorization Code flow)
- **Repo browser** — search and browse all your repos
- **Commit editor** — per-commit editing of author, committer, message, dates
- **Batch operations** — select multiple commits and apply changes in bulk
- **Script generation** — generates bash scripts using `git-filter-repo` (mailmap + callbacks) and `git filter-branch` (dates)
- **Pagination** — lazy-loads commits 30 at a time

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/git-UI-toolbox/` and authenticate with a GitHub PAT.

## Deploy to GitHub Pages

Push to `main` — the included GitHub Actions workflow builds and deploys automatically.

**Requirements:**
1. Go to repo **Settings → Pages → Source** and select **GitHub Actions**
2. The workflow at `.github/workflows/deploy.yml` handles the rest

## Authentication

### Option A: Personal Access Token (recommended for quick use)

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Create a token with `repo` scope
3. Paste it in the app

### Option B: OAuth (for production / shared use)

OAuth requires a small server-side component to exchange the authorization code for an access token (GitHub blocks direct browser requests to their token endpoint via CORS).

#### 1. Register an OAuth App

- Go to [github.com/settings/developers](https://github.com/settings/developers)
- **New OAuth App**
- Set **Authorization callback URL** to your deployed app URL:
  ```
  https://heartran.github.io/git-UI-toolbox/
  ```
- Note the **Client ID**

#### 2. Deploy a Token Exchange Proxy

The simplest option is a **Cloudflare Worker** (free tier is plenty):

```javascript
// worker.js — Cloudflare Worker for GitHub OAuth token exchange
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://heartran.github.io',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { client_id, code } = await request.json();

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id,
        client_secret: env.GITHUB_CLIENT_SECRET, // Set as Worker secret
        code,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://heartran.github.io',
      },
    });
  },
};
```

Deploy it:
```bash
npx wrangler deploy worker.js --name gh-oauth-proxy
npx wrangler secret put GITHUB_CLIENT_SECRET
```

#### 3. Configure in the app

Enter the **Client ID** and the **Worker URL** (e.g. `https://gh-oauth-proxy.your-subdomain.workers.dev`) in the OAuth tab.

## How It Works

The app does **not** modify your repository directly. Instead:

1. You browse commits via the GitHub API
2. You edit metadata through the UI
3. The app generates a bash script that uses:
   - `git-filter-repo --mailmap` for author/committer changes
   - `git-filter-repo --message-callback` for commit messages
   - `git filter-branch --env-filter` for date changes
4. You run the script locally on your cloned repo
5. You `git push --force-with-lease` when ready

### Prerequisites for running generated scripts

```bash
pip install git-filter-repo
```

## Tech Stack

- React 18 + Vite 6
- Zero external UI dependencies
- GitHub REST API v3
- Deployed via GitHub Actions → GitHub Pages

## License

MIT
