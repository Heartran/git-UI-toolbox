import { useState, useEffect, useCallback, useRef } from "react";

// — API helpers (calls our backend, no token in the browser) —
// VITE_API_BASE can be set at build time for production deploys (e.g. GitHub Pages)
const API_BASE = import.meta.env.VITE_API_BASE || "";

const apiFetch = async (path) => {
  const res = await fetch(`${API_BASE}/api${path}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `API ${res.status}`);
  return body;
};

// — Utility helpers —
const shortSha = (sha) => sha?.slice(0, 7) || "";
const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const isoLocal = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

// — Design tokens —
const colors = {
  bg: "#0a0a0f",
  surface: "#12121a",
  surfaceHover: "#1a1a25",
  border: "#2a2a3a",
  borderFocus: "#d4a843",
  accent: "#d4a843",
  accentGlow: "rgba(212,168,67,0.15)",
  text: "#e8e6e0",
  textDim: "#8a8890",
  textMuted: "#5a5a65",
  danger: "#c94040",
  dangerBg: "rgba(201,64,64,0.1)",
  success: "#4a9e6a",
  successBg: "rgba(74,158,106,0.1)",
};

const font = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  sans: "'DM Sans', system-ui, sans-serif",
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  @keyframes slideIn  { from { opacity:0; transform: translateX(20px);  } to { opacity:1; transform: translateX(0);   } }
  @keyframes fadeUp   { from { opacity:0; transform: translateY(15px);  } to { opacity:1; transform: translateY(0);   } }
  @keyframes spin     { to   { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${colors.bg}; }
  ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${colors.textMuted}; }
`;

// — Shared UI primitives —

const Btn = ({ children, onClick, variant = "default", disabled, style: s = {} }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      padding: "8px 16px", border: "1px solid",
      borderColor: variant === "accent" ? colors.accent : variant === "danger" ? colors.danger : colors.border,
      background: variant === "accent" ? colors.accent : "transparent",
      color: variant === "accent" ? colors.bg : variant === "danger" ? colors.danger : colors.text,
      borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: font.mono, fontSize: 12, fontWeight: 600,
      opacity: disabled ? 0.4 : 1, letterSpacing: "0.5px",
      transition: "all 0.15s ease", textTransform: "uppercase",
      ...s,
    }}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, type = "text", style: s = {} }) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      padding: "8px 12px", background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 4, color: colors.text, fontFamily: font.mono, fontSize: 13,
      width: "100%", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box",
      ...s,
    }}
    onFocus={(e) => (e.target.style.borderColor = colors.borderFocus)}
    onBlur={(e) => (e.target.style.borderColor = colors.border)}
  />
);

const Spinner = () => (
  <div style={{
    width: 16, height: 16, border: `2px solid ${colors.border}`,
    borderTopColor: colors.accent, borderRadius: "50%",
    animation: "spin 0.7s linear infinite", display: "inline-block",
  }} />
);

// CommitRow extracted so useState is at component level (Rules of Hooks)
const CommitRow = ({ c, isSelected, hasEdit, edit, onToggleSelect, onSetEdit, onClearEdit }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderBottom: `1px solid ${colors.border}`,
      background: hasEdit ? colors.accentGlow : "transparent",
      transition: "background 0.15s",
    }}>
      {/* Summary row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <input
          type="checkbox" checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(c.sha); }}
          onClick={(e) => e.stopPropagation()}
          style={{ accentColor: colors.accent, cursor: "pointer", width: 14, height: 14, flexShrink: 0 }}
        />
        <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, flexShrink: 0, width: 65 }}>
          {shortSha(c.sha)}
        </span>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: hasEdit ? colors.accent : colors.textMuted,
          border: `2px solid ${hasEdit ? colors.accent : colors.border}`,
        }} />
        <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13, color: hasEdit && edit.message ? colors.accent : colors.text }}>
            {edit.message || c.commit.message.split("\n")[0]}
          </span>
        </div>
        <div style={{
          fontFamily: font.mono, fontSize: 11, flexShrink: 0,
          maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: hasEdit && (edit.authorName || edit.authorEmail) ? colors.accent : colors.textDim,
        }}>
          {edit.authorName || c.commit.author.name}
        </div>
        <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.textMuted, flexShrink: 0, width: 130, textAlign: "right" }}>
          {fmtDate(edit.authorDate || c.commit.author.date)}
        </div>
        <span style={{
          color: colors.textMuted, fontSize: 12, flexShrink: 0,
          transition: "transform 0.2s", transform: expanded ? "rotate(90deg)" : "rotate(0)",
        }}>▶</span>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div style={{
          padding: "12px 12px 16px 50px", background: colors.surface,
          borderTop: `1px solid ${colors.border}`, animation: "fadeUp 0.2s ease",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              ["authorName",      "Author Name",      c.commit.author.name],
              ["authorEmail",     "Author Email",     c.commit.author.email],
              ["committerName",   "Committer Name",   c.commit.committer.name],
              ["committerEmail",  "Committer Email",  c.commit.committer.email],
            ].map(([field, label, orig]) => (
              <div key={field}>
                <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                  {label} <span style={{ color: colors.textMuted }}>({orig})</span>
                </label>
                <Input value={edit[field] || ""} onChange={(v) => onSetEdit(c.sha, field, v)} placeholder={orig} />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                Author Date
              </label>
              <Input type="datetime-local" value={edit.authorDate || isoLocal(c.commit.author.date)} onChange={(v) => onSetEdit(c.sha, "authorDate", v)} />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                Committer Date
              </label>
              <Input type="datetime-local" value={edit.committerDate || isoLocal(c.commit.committer.date)} onChange={(v) => onSetEdit(c.sha, "committerDate", v)} />
            </div>
          </div>
          <div>
            <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
              Commit Message
            </label>
            <textarea
              value={edit.message ?? ""}
              onChange={(e) => onSetEdit(c.sha, "message", e.target.value)}
              placeholder={c.commit.message}
              rows={3}
              style={{
                width: "100%", padding: "8px 12px", background: colors.bg,
                border: `1px solid ${colors.border}`, borderRadius: 4,
                color: colors.text, fontFamily: font.mono, fontSize: 12,
                outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5,
              }}
              onFocus={(e) => (e.target.style.borderColor = colors.borderFocus)}
              onBlur={(e) => (e.target.style.borderColor = colors.border)}
            />
          </div>
          {hasEdit && (
            <div style={{ marginTop: 8, textAlign: "right" }}>
              <Btn variant="danger" onClick={() => onClearEdit(c.sha)} style={{ padding: "4px 10px", fontSize: 10 }}>
                Reset Commit
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// — Main component —
export default function GitHistoryRewriter() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("loading"); // loading | repos | editor | script
  const [repos, setRepos] = useState([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [edits, setEdits] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [batchMode, setBatchMode] = useState(false);
  const [batchValues, setBatchValues] = useState({ authorName: "", authorEmail: "", committerName: "", committerEmail: "" });
  const [scriptGenerated, setScriptGenerated] = useState("");
  const [notification, setNotification] = useState(null);
  const initDone = useRef(false);

  const notify = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Bootstrap: fetch the authenticated user from the backend
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    apiFetch("/user")
      .then((u) => {
        setUser(u);
        setView("repos");
      })
      .catch(() => {
        setError("Impossibile connettersi al backend. Assicurati che il server sia avviato e che GITHUB_TOKEN sia configurato.");
        setView("error");
      });
  }, []);

  // — Repos —
  const loadRepos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await apiFetch("/repos");
      setRepos(r);
    } catch (e) {
      setError("Errore nel caricamento dei repository: " + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (view === "repos") loadRepos();
  }, [view, loadRepos]);

  const searchRepos = async () => {
    if (!repoSearch.trim()) { loadRepos(); return; }
    setLoading(true);
    setError("");
    try {
      const r = await apiFetch(`/repos/search?q=${encodeURIComponent(repoSearch)}&login=${user?.login || ""}`);
      setRepos(r);
    } catch (e) {
      setError("Errore nella ricerca: " + e.message);
    }
    setLoading(false);
  };

  const loadCommits = useCallback(async (repoFullName, branch, pg = 1, reset = false) => {
    const rn = repoFullName || selectedRepo?.full_name;
    const br = branch || selectedBranch;
    if (!rn) return;
    setLoading(true);
    setError("");
    try {
      const [owner, repo] = rn.split("/");
      const c = await apiFetch(`/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(br)}&page=${pg}`);
      setCommits((prev) => reset ? c : [...prev, ...c]);
      setHasMore(c.length === 30);
      setPage(pg);
    } catch (e) {
      setError("Errore nel caricamento dei commit: " + e.message);
    }
    setLoading(false);
  }, [selectedRepo, selectedBranch]);

  const selectRepo = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setCommits([]);
    setEdits({});
    setSelected(new Set());
    setPage(1);
    setHasMore(true);
    setError("");
    try {
      const [owner, name] = repo.full_name.split("/");
      const b = await apiFetch(`/repos/${owner}/${name}/branches`);
      setBranches(b);
      const defaultBr = repo.default_branch || "main";
      setSelectedBranch(defaultBr);
      await loadCommits(repo.full_name, defaultBr, 1, true);
    } catch (e) {
      setError("Errore nel caricamento del repository: " + e.message);
    }
    setLoading(false);
    setView("editor");
  };

  const changeBranch = (br) => {
    setSelectedBranch(br);
    setCommits([]);
    setEdits({});
    setSelected(new Set());
    setPage(1);
    loadCommits(selectedRepo.full_name, br, 1, true);
  };

  // — Edit logic —
  const getEdit = (sha) => edits[sha] || {};
  const setEdit = (sha, field, value) =>
    setEdits((prev) => ({ ...prev, [sha]: { ...prev[sha], [field]: value } }));
  const clearEdit = (sha) =>
    setEdits((prev) => { const n = { ...prev }; delete n[sha]; return n; });
  const clearAllEdits = () => {
    setEdits({});
    setSelected(new Set());
    notify("Tutte le modifiche annullate");
  };

  const toggleSelect = (sha) =>
    setSelected((prev) => { const n = new Set(prev); n.has(sha) ? n.delete(sha) : n.add(sha); return n; });
  const selectAll = () =>
    setSelected(selected.size === commits.length ? new Set() : new Set(commits.map((c) => c.sha)));

  const applyBatch = () => {
    const newEdits = { ...edits };
    selected.forEach((sha) => {
      const ex = newEdits[sha] || {};
      if (batchValues.authorName)    ex.authorName    = batchValues.authorName;
      if (batchValues.authorEmail)   ex.authorEmail   = batchValues.authorEmail;
      if (batchValues.committerName) ex.committerName = batchValues.committerName;
      if (batchValues.committerEmail) ex.committerEmail = batchValues.committerEmail;
      newEdits[sha] = ex;
    });
    setEdits(newEdits);
    setBatchMode(false);
    setBatchValues({ authorName: "", authorEmail: "", committerName: "", committerEmail: "" });
    notify(`Batch applicato a ${selected.size} commit`, "success");
  };

  // — Script generation —
  const generateScript = () => {
    const editedShas = Object.keys(edits).filter(
      (sha) => Object.values(edits[sha]).some((v) => v && v.trim())
    );
    if (editedShas.length === 0) { notify("Nessuna modifica da applicare.", "info"); return; }

    const authorChanges = [], messageChanges = [], dateChanges = [];
    editedShas.forEach((sha) => {
      const e = edits[sha];
      const commit = commits.find((c) => c.sha === sha);
      if (!commit) return;
      if (e.authorName || e.authorEmail || e.committerName || e.committerEmail)
        authorChanges.push({ sha, edit: e, commit });
      if (e.message)
        messageChanges.push({ sha, edit: e, commit });
      if (e.authorDate || e.committerDate)
        dateChanges.push({ sha, edit: e, commit });
    });

    let script = `#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Git History Rewriter — Script Generato
# Repository: ${selectedRepo?.full_name || "N/A"}
# Branch: ${selectedBranch}
# Commit modificati: ${editedShas.length}
# Generato il: ${new Date().toLocaleString("it-IT")}
# ═══════════════════════════════════════════════════════════════
#
# ATTENZIONE: Questo script riscrive la storia del repository.
# Assicurati di avere un backup prima di procedere.
# Dopo l'esecuzione, sarà necessario un force push.
#
# Prerequisito: pip install git-filter-repo
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

`;

    if (authorChanges.length > 0) {
      script += `# ─── Modifica Autori (via git-filter-repo --mailmap) ───────────\n\n`;
      script += `cat > /tmp/git-mailmap <<'MAILMAP'\n`;
      authorChanges.forEach(({ commit, edit }) => {
        const origName  = commit.commit.author.name;
        const origEmail = commit.commit.author.email;
        const newName   = edit.authorName  || origName;
        const newEmail  = edit.authorEmail || origEmail;
        script += `${newName} <${newEmail}> ${origName} <${origEmail}>\n`;
      });
      script += `MAILMAP\n\ngit filter-repo --mailmap /tmp/git-mailmap --force\n\n`;
    }

    if (messageChanges.length > 0) {
      script += `# ─── Modifica Messaggi Commit (via git-filter-repo callback) ───\n\n`;
      script += `git filter-repo --message-callback '\n`;
      messageChanges.forEach(({ sha, edit }) => {
        const escaped = edit.message.replace(/'/g, "'\\''").replace(/\n/g, "\\n");
        script += `  if commit.original_id.hex().startswith("${sha}"):\n`;
        script += `    return b"${escaped}"\n`;
      });
      script += `  return message\n' --force\n\n`;
    }

    if (dateChanges.length > 0) {
      script += `# ─── Modifica Date Commit (via git filter-branch) ─────────────\n`;
      script += `# Nota: git-filter-repo non supporta nativamente date per singoli commit.\n`;
      script += `# Usiamo git filter-branch come fallback.\n\n`;
      script += `git filter-branch -f --env-filter '\n`;
      dateChanges.forEach(({ sha, edit }) => {
        const ad = edit.authorDate    ? new Date(edit.authorDate).toISOString()    : "";
        const cd = edit.committerDate ? new Date(edit.committerDate).toISOString() : "";
        script += `if [ "$GIT_COMMIT" = "${sha}" ]; then\n`;
        if (ad) script += `  export GIT_AUTHOR_DATE="${ad}"\n`;
        if (cd) script += `  export GIT_COMMITTER_DATE="${cd}"\n`;
        script += `fi\n`;
      });
      script += `' -- --all\n\n`;
    }

    script += `# ─── Riepilogo ────────────────────────────────────────────────\n`;
    script += `echo ""\n`;
    script += `echo "✓ Riscrittura completata!"\n`;
    script += `echo "  Per applicare le modifiche al remote:"\n`;
    script += `echo "  git push --force-with-lease origin ${selectedBranch}"\n`;
    script += `echo ""\n`;
    script += `echo "⚠  ATTENZIONE: Force push riscrive la storia pubblica."\n`;
    script += `echo "  Coordina con il team prima di procedere."\n`;

    setScriptGenerated(script);
    setView("script");
  };

  const copyScript = () => {
    navigator.clipboard.writeText(scriptGenerated);
    notify("Script copiato negli appunti!", "success");
  };

  const editCount = Object.keys(edits).filter(
    (sha) => Object.values(edits[sha]).some((v) => v && v.trim())
  ).length;

  // — Layout shell —
  const Shell = ({ children }) => (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: font.sans }}>
      <style>{globalStyles}</style>
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 6,
          background: notification.type === "success" ? colors.successBg : notification.type === "danger" ? colors.dangerBg : colors.surface,
          border: `1px solid ${notification.type === "success" ? colors.success : notification.type === "danger" ? colors.danger : colors.border}`,
          color: notification.type === "success" ? colors.success : notification.type === "danger" ? colors.danger : colors.text,
          fontFamily: font.mono, fontSize: 13, animation: "slideIn 0.3s ease",
        }}>
          {notification.msg}
        </div>
      )}
      {children}
    </div>
  );

  const Header = ({ crumbs = [], actions }) => (
    <div style={{ padding: "12px 24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, letterSpacing: 2, textTransform: "uppercase", cursor: crumbs.length ? "pointer" : "default" }}
          onClick={() => crumbs.length && setView("repos")}
        >
          git::rewriter
        </span>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: colors.textMuted }}>›</span>
            <span style={{ fontFamily: font.mono, fontSize: 12, color: i === crumbs.length - 1 ? colors.text : colors.textDim }}>{c}</span>
          </span>
        ))}
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );

  // — LOADING VIEW —
  if (view === "loading") return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 16 }}>
        <Spinner />
        <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.textDim }}>Connessione al backend...</span>
      </div>
    </Shell>
  );

  // — ERROR VIEW —
  if (view === "error") return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.accent, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>
            git::rewriter
          </div>
          <div style={{ padding: 20, background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: 6, color: colors.danger, fontFamily: font.mono, fontSize: 13, lineHeight: 1.7, textAlign: "left" }}>
            {error}
          </div>
          <p style={{ color: colors.textMuted, fontSize: 12, marginTop: 16, fontFamily: font.mono, lineHeight: 1.8 }}>
            1. Copia <code style={{ color: colors.accent }}>.env.example</code> in <code style={{ color: colors.accent }}>.env</code><br />
            2. Imposta <code style={{ color: colors.accent }}>GITHUB_TOKEN</code><br />
            3. Avvia il backend: <code style={{ color: colors.accent }}>npm run server</code>
          </p>
        </div>
      </div>
    </Shell>
  );

  // — REPOS VIEW —
  if (view === "repos") return (
    <Shell>
      <Header
        crumbs={["repositories"]}
        actions={
          user && (
            <span style={{ fontFamily: font.mono, fontSize: 11, color: colors.textDim, padding: "4px 10px", background: colors.surface, borderRadius: 3, border: `1px solid ${colors.border}` }}>
              @{user.login}
            </span>
          )
        }
      />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        <h2 style={{ fontFamily: font.sans, fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>
          Seleziona un <span style={{ color: colors.accent }}>Repository</span>
        </h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Input
            value={repoSearch}
            onChange={setRepoSearch}
            placeholder="Cerca repository..."
            style={{ flex: 1 }}
          />
          <Btn variant="accent" onClick={searchRepos} disabled={loading}>Cerca</Btn>
          {repoSearch && <Btn onClick={() => { setRepoSearch(""); loadRepos(); }}>✕</Btn>}
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spinner />
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: 12, background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: 4, color: colors.danger, fontSize: 12, fontFamily: font.mono }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {repos.map((r, i) => (
            <div
              key={r.id}
              onClick={() => selectRepo(r)}
              style={{
                padding: "14px 16px", background: colors.surface, borderRadius: 4,
                border: `1px solid ${colors.border}`, cursor: "pointer",
                transition: "all 0.15s", animation: `fadeUp 0.3s ease ${Math.min(i * 25, 400)}ms both`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.borderFocus; e.currentTarget.style.background = colors.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = colors.surface; }}
            >
              <div>
                <div style={{ fontFamily: font.mono, fontSize: 14, fontWeight: 600 }}>
                  <span style={{ color: colors.textDim }}>{r.owner?.login}/</span>
                  <span style={{ color: colors.text }}>{r.name}</span>
                </div>
                {r.description && (
                  <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.description}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                {r.language && (
                  <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.textDim, background: colors.bg, padding: "3px 8px", borderRadius: 3 }}>
                    {r.language}
                  </span>
                )}
                <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.textMuted }}>{r.private ? "🔒" : "🌐"}</span>
                <span style={{ color: colors.accent, fontSize: 14 }}>→</span>
              </div>
            </div>
          ))}
        </div>

        {repos.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: 40, color: colors.textMuted, fontSize: 13 }}>
            Nessun repository trovato.
          </div>
        )}
      </div>
    </Shell>
  );

  // — SCRIPT VIEW —
  if (view === "script") return (
    <Shell>
      <Header
        crumbs={[selectedRepo?.name, "script"]}
        actions={
          <>
            <Btn onClick={() => setView("editor")}>← Editor</Btn>
            <Btn variant="accent" onClick={copyScript}>Copia Script</Btn>
          </>
        }
      />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px", animation: "fadeUp 0.4s ease" }}>
        <h2 style={{ fontFamily: font.sans, fontSize: 22, fontWeight: 700, margin: "0 0 16px 0" }}>
          Script <span style={{ color: colors.accent }}>Generato</span>
        </h2>
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6, padding: 20, overflow: "auto", maxHeight: "calc(100vh - 180px)" }}>
          <pre style={{ fontFamily: font.mono, fontSize: 12, color: colors.text, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {scriptGenerated}
          </pre>
        </div>
      </div>
    </Shell>
  );

  // — EDITOR VIEW —
  return (
    <Shell>
      <Header
        crumbs={[selectedRepo?.name]}
        actions={
          <>
            <select
              value={selectedBranch}
              onChange={(e) => changeBranch(e.target.value)}
              style={{ padding: "6px 10px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.text, fontFamily: font.mono, fontSize: 11, cursor: "pointer", outline: "none" }}
            >
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>

            <div style={{ width: 1, height: 20, background: colors.border }} />

            {editCount > 0 && (
              <span style={{ fontFamily: font.mono, fontSize: 11, color: colors.accent, background: colors.accentGlow, padding: "4px 10px", borderRadius: 3 }}>
                {editCount} modific{editCount === 1 ? "a" : "he"}
              </span>
            )}
            <Btn onClick={() => setBatchMode(!batchMode)} disabled={selected.size === 0}>
              Batch{selected.size > 0 ? ` (${selected.size})` : ""}
            </Btn>
            <Btn variant="danger" onClick={clearAllEdits} disabled={editCount === 0}>Reset</Btn>
            <Btn variant="accent" onClick={generateScript} disabled={editCount === 0}>Genera Script</Btn>
          </>
        }
      />

      {/* Batch panel */}
      {batchMode && selected.size > 0 && (
        <div style={{ padding: "16px 24px", background: colors.accentGlow, borderBottom: `1px solid ${colors.accent}`, animation: "fadeUp 0.2s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, fontWeight: 600 }}>
              BATCH → {selected.size} commit selezionati
            </span>
            <Btn onClick={() => setBatchMode(false)} style={{ padding: "4px 10px" }}>Chiudi</Btn>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
            {[
              ["authorName",    "Author Name",    "Nome autore"],
              ["authorEmail",   "Author Email",   "email@example.com"],
              ["committerName", "Committer Name", "Nome committer"],
              ["committerEmail","Committer Email","email@example.com"],
            ].map(([field, label, ph]) => (
              <div key={field}>
                <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1 }}>{label}</label>
                <Input value={batchValues[field]} onChange={(v) => setBatchValues((p) => ({ ...p, [field]: v }))} placeholder={ph} />
              </div>
            ))}
            <Btn variant="accent" onClick={applyBatch}>Applica</Btn>
          </div>
        </div>
      )}

      {/* Commit list */}
      <div style={{ padding: "0 12px", maxHeight: batchMode ? "calc(100vh - 220px)" : "calc(100vh - 60px)", overflowY: "auto" }}>
        <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${colors.border}`, position: "sticky", top: 0, background: colors.bg, zIndex: 10 }}>
          <input
            type="checkbox"
            checked={selected.size === commits.length && commits.length > 0}
            onChange={selectAll}
            style={{ accentColor: colors.accent, cursor: "pointer", width: 14, height: 14 }}
          />
          <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>
            {commits.length} commit · {selectedBranch}
          </span>
          {loading && <Spinner />}
        </div>

        {commits.map((c) => {
          const edit = getEdit(c.sha);
          const hasEdit = Object.values(edit).some((v) => v && v.trim());
          return (
            <CommitRow
              key={c.sha}
              c={c}
              isSelected={selected.has(c.sha)}
              hasEdit={hasEdit}
              edit={edit}
              onToggleSelect={toggleSelect}
              onSetEdit={setEdit}
              onClearEdit={clearEdit}
            />
          );
        })}

        {hasMore && !loading && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Btn onClick={() => loadCommits(null, null, page + 1)}>Carica altri commit</Btn>
          </div>
        )}

        {commits.length === 0 && !loading && (
          <div style={{ padding: 40, textAlign: "center", color: colors.textMuted, fontFamily: font.mono, fontSize: 12 }}>
            Nessun commit trovato per questo branch.
          </div>
        )}
      </div>

      {error && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: 4, color: colors.danger, fontSize: 12, fontFamily: font.mono, zIndex: 9999 }}>
          {error}
        </div>
      )}
    </Shell>
  );
}
