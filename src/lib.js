// ═══════════════════════════════════════════════════
// Theme
// ═══════════════════════════════════════════════════

export const C = {
  bg: '#0a0a0f',
  surface: '#12121a',
  surfaceHover: '#1a1a25',
  surfaceActive: '#22222e',
  border: '#2a2a3a',
  borderFocus: '#d4a843',
  accent: '#d4a843',
  accentDim: '#a07d2e',
  accentGlow: 'rgba(212,168,67,0.12)',
  text: '#e8e6e0',
  textDim: '#8a8890',
  textMuted: '#5a5a65',
  danger: '#c94040',
  dangerBg: 'rgba(201,64,64,0.1)',
  success: '#4a9e6a',
  successBg: 'rgba(74,158,106,0.1)',
  blue: '#5a8ec9',
};

export const FONT = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  sans: "'DM Sans', 'Satoshi', system-ui, sans-serif",
};

// ═══════════════════════════════════════════════════
// GitHub API
// ═══════════════════════════════════════════════════

const GH = 'https://api.github.com';

export async function ghFetch(path, token, opts = {}) {
  const res = await fetch(`${GH}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `GitHub ${res.status}`);
  }
  return res.json();
}

// OAuth helpers
export const OAUTH_SCOPES = 'repo';

export function buildOAuthUrl(clientId, redirectUri) {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: OAUTH_SCOPES,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeOAuthCode(proxyUrl, clientId, code) {
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, code }),
  });
  if (!res.ok) throw new Error('Token exchange failed');
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

// ═══════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════

export const shortSha = (sha) => sha?.slice(0, 7) || '';

export function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function isoLocal(d) {
  if (!d) return '';
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
}

// ═══════════════════════════════════════════════════
// Script Generator
// ═══════════════════════════════════════════════════

export function generateScript(edits, commits, repoFullName, branch) {
  const editedShas = Object.keys(edits).filter(
    (sha) => Object.values(edits[sha]).some((v) => v?.trim())
  );
  if (!editedShas.length) return null;

  const authorChanges = [];
  const messageChanges = [];
  const dateChanges = [];

  for (const sha of editedShas) {
    const e = edits[sha];
    const commit = commits.find((c) => c.sha === sha);
    if (!commit) continue;

    if (e.authorName || e.authorEmail || e.committerName || e.committerEmail)
      authorChanges.push({ sha, e, commit });
    if (e.message?.trim())
      messageChanges.push({ sha, e, commit });
    if (e.authorDate || e.committerDate)
      dateChanges.push({ sha, e, commit });
  }

  let s = `#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# git::rewriter — Generated Script
# Repo:    ${repoFullName}
# Branch:  ${branch}
# Commits: ${editedShas.length} modified
# Date:    ${new Date().toLocaleString('it-IT')}
# ═══════════════════════════════════════════════════════════════
#
# ⚠  BACKUP YOUR REPO BEFORE RUNNING THIS SCRIPT
#    This rewrites history — there is no undo after force-push.
#
# Prerequisites:
#   pip install git-filter-repo
#
# Usage:
#   cd /path/to/your/repo
#   bash rewrite.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "⚙  git::rewriter — avvio riscrittura..."
echo ""

`;

  // --- Author changes via mailmap ---
  if (authorChanges.length > 0) {
    s += `# ─── Author / Committer Changes (git-filter-repo --mailmap) ──\n\n`;
    s += `MAILMAP_FILE=$(mktemp)\ncat > "$MAILMAP_FILE" <<'MAILMAP'\n`;

    for (const { commit, e } of authorChanges) {
      const origN = commit.commit.author.name;
      const origE = commit.commit.author.email;
      const newN = e.authorName || origN;
      const newE = e.authorEmail || origE;
      s += `${newN} <${newE}> ${origN} <${origE}>\n`;

      // If committer is also changed and different from author
      if (e.committerName || e.committerEmail) {
        const cOrigN = commit.commit.committer.name;
        const cOrigE = commit.commit.committer.email;
        const cNewN = e.committerName || cOrigN;
        const cNewE = e.committerEmail || cOrigE;
        if (cOrigN !== origN || cOrigE !== origE) {
          s += `${cNewN} <${cNewE}> ${cOrigN} <${cOrigE}>\n`;
        }
      }
    }

    s += `MAILMAP\n\necho "  ✓ Applying mailmap (${authorChanges.length} author changes)..."\n`;
    s += `git filter-repo --mailmap "$MAILMAP_FILE" --force\n`;
    s += `rm -f "$MAILMAP_FILE"\necho ""\n\n`;
  }

  // --- Message changes via callback ---
  if (messageChanges.length > 0) {
    s += `# ─── Commit Message Changes (git-filter-repo --message-callback) ──\n\n`;
    s += `echo "  ✓ Rewriting ${messageChanges.length} commit messages..."\n`;
    s += `git filter-repo --message-callback '\n`;
    for (const { sha, e } of messageChanges) {
      const escaped = e.message.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      s += `if commit.original_id and commit.original_id.hex().startswith("${sha}"):\n`;
      s += `    return b"${escaped}\\n"\n`;
    }
    s += `return message\n' --force\necho ""\n\n`;
  }

  // --- Date changes via env filter ---
  if (dateChanges.length > 0) {
    s += `# ─── Date Changes (git filter-branch --env-filter) ────────────\n`;
    s += `# Note: git-filter-repo doesn't natively support per-commit dates,\n`;
    s += `# so we fall back to filter-branch for this operation.\n\n`;
    s += `echo "  ✓ Rewriting ${dateChanges.length} commit dates..."\n`;
    s += `FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --env-filter '\n`;
    for (const { sha, e } of dateChanges) {
      const ad = e.authorDate ? new Date(e.authorDate).toISOString() : '';
      const cd = e.committerDate ? new Date(e.committerDate).toISOString() : '';
      s += `if [ "$GIT_COMMIT" = "${sha}" ]; then\n`;
      if (ad) s += `    export GIT_AUTHOR_DATE="${ad}"\n`;
      if (cd) s += `    export GIT_COMMITTER_DATE="${cd}"\n`;
      s += `fi\n`;
    }
    s += `' -- --all\necho ""\n\n`;
  }

  s += `# ─── Done ─────────────────────────────────────────────────────\n`;
  s += `echo ""\n`;
  s += `echo "═══════════════════════════════════════════════════════"\n`;
  s += `echo "  ✓ Riscrittura completata!"\n`;
  s += `echo ""\n`;
  s += `echo "  Per applicare al remote:"\n`;
  s += `echo "    git push --force-with-lease origin ${branch}"\n`;
  s += `echo ""\n`;
  s += `echo "  ⚠  Force push riscrive la storia pubblica."\n`;
  s += `echo "     Coordina col team prima di procedere."\n`;
  s += `echo "═══════════════════════════════════════════════════════"\n`;

  return s;
}
