import express from "express";
import cors from "cors";
import { config } from "dotenv";
import crypto from "crypto";

config();

const app = express();
const PORT = process.env.PORT || 3001;
const GITHUB_CLIENT_ID = process.env.GH_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GH_CLIENT_SECRET;
const GITHUB_API = "https://api.github.com";

// OAuth flow requires client credentials
if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
  console.error("ERROR: GH_CLIENT_ID and GH_CLIENT_SECRET must be set as environment variables.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Simple in-memory state storage for OAuth CSRF protection
// In production, use express-session with a database
const oauthStates = new Map();

// Clean up expired states every 10 minutes (15 min expiry)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 15 * 60 * 1000) {
      oauthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

// — GitHub proxy helper —
async function ghFetch(path, opts = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      ...(opts.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body.message || `GitHub API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

function apiHandler(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// — OAuth Routes —

// Initiate GitHub OAuth flow
app.get("/api/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: "OAuth not configured on server" });
  }

  const state = crypto.randomUUID();
  oauthStates.set(state, { timestamp: Date.now() });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.GITHUB_CALLBACK_URL || `${req.protocol}://${req.get("host")}/api/auth/github/callback`}`,
    scope: "repo",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Handle GitHub OAuth callback
app.get("/api/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state" });
  }

  const stateData = oauthStates.get(state);
  if (!stateData) {
    return res.status(403).json({ error: "Invalid or expired state token (CSRF protection)" });
  }
  oauthStates.delete(state);

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error });
    }

    const accessToken = tokenData.access_token;

    // Redirect to frontend with token in URL (frontend will extract and save to sessionStorage)
    // In production, consider using a secure httpOnly cookie instead
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}/`;
    res.redirect(`${frontendUrl}?token=${encodeURIComponent(accessToken)}`);
  } catch (err) {
    console.error("OAuth token exchange failed:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// — Routes —

// Authenticated user info
app.get("/api/user", apiHandler(() => ghFetch("/user")));

// List repos (owner + collaborator + org member, sorted by updated)
app.get(
  "/api/repos",
  apiHandler(() =>
    ghFetch("/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member")
  )
);

// Search repos
app.get(
  "/api/repos/search",
  apiHandler(async (req) => {
    const { q, login } = req.query;
    if (!q) return [];
    const encoded = encodeURIComponent(`${q} user:${login}`);
    const result = await ghFetch(`/search/repositories?q=${encoded}&per_page=30`);
    return result.items || [];
  })
);

// Branches for a repo
app.get(
  "/api/repos/:owner/:repo/branches",
  apiHandler((req) => {
    const { owner, repo } = req.params;
    return ghFetch(`/repos/${owner}/${repo}/branches?per_page=100`);
  })
);

// Commits for a repo/branch
app.get(
  "/api/repos/:owner/:repo/commits",
  apiHandler((req) => {
    const { owner, repo } = req.params;
    const { sha = "main", page = 1 } = req.query;
    return ghFetch(
      `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(sha)}&per_page=30&page=${page}`
    );
  })
);

app.listen(PORT, () => {
  console.log(`git-history-rewriter backend running on port ${PORT}`);
});
