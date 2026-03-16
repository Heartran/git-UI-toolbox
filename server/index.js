import express from "express";
import cors from "cors";
import { config } from "dotenv";

config();

const app = express();
const PORT = process.env.PORT || 3001;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API = "https://api.github.com";

if (!GITHUB_TOKEN) {
  console.error("ERROR: GITHUB_TOKEN is not set in environment.");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

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
