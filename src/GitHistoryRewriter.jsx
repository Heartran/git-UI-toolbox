import { useState, useEffect, useCallback, useRef } from "react";

const GITHUB_API = "https://api.github.com";

// — Utility helpers —
const fetchGH = async (path, token, opts = {}) => {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  return res.json();
};

const shortSha = (sha) => sha?.slice(0, 7) || "";
const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const isoLocal = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  const local = new Date(dt.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
};

// — Styles —
const colors = {
  bg: "#0a0a0f",
  surface: "#12121a",
  surfaceHover: "#1a1a25",
  border: "#2a2a3a",
  borderFocus: "#d4a843",
  accent: "#d4a843",
  accentDim: "#a07d2e",
  accentGlow: "rgba(212,168,67,0.15)",
  text: "#e8e6e0",
  textDim: "#8a8890",
  textMuted: "#5a5a65",
  danger: "#c94040",
  dangerBg: "rgba(201,64,64,0.1)",
  success: "#4a9e6a",
  successBg: "rgba(74,158,106,0.1)",
  blue: "#5a8ec9",
};

const font = {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace",
  sans: "'DM Sans', 'Satoshi', system-ui, sans-serif",
};

// — Sub-components —

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  @keyframes slideIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
  @keyframes fadeUp { from { opacity:0; transform: translateY(15px); } to { opacity:1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${colors.bg}; }
  ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: ${colors.textMuted}; }
`;

const Btn = ({ children, onClick, variant = "default", disabled, style: s = {} }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      padding: "8px 16px",
      border: "1px solid",
      borderColor:
        variant === "accent" ? colors.accent : variant === "danger" ? colors.danger : colors.border,
      background:
        variant === "accent" ? colors.accent : "transparent",
      color:
        variant === "accent" ? colors.bg : variant === "danger" ? colors.danger : colors.text,
      borderRadius: 4,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: font.mono,
      fontSize: 12,
      fontWeight: 600,
      opacity: disabled ? 0.4 : 1,
      letterSpacing: "0.5px",
      transition: "all 0.15s ease",
      textTransform: "uppercase",
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
      padding: "8px 12px",
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 4,
      color: colors.text,
      fontFamily: font.mono,
      fontSize: 13,
      width: "100%",
      outline: "none",
      transition: "border-color 0.15s",
      boxSizing: "border-box",
      ...s,
    }}
    onFocus={(e) => (e.target.style.borderColor = colors.borderFocus)}
    onBlur={(e) => (e.target.style.borderColor = colors.border)}
  />
);

// CommitRow is extracted so useState is called at the component level, not inside a map
const CommitRow = ({ c, isSelected, hasEdit, edit, onToggleSelect, onSetEdit, onClearEdit }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        borderBottom: `1px solid ${colors.border}`,
        background: hasEdit ? colors.accentGlow : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Commit summary row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(c.sha); }}
          onClick={(e) => e.stopPropagation()}
          style={{ accentColor: colors.accent, cursor: "pointer", width: 14, height: 14, flexShrink: 0 }}
        />

        <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, flexShrink: 0, width: 65 }}>
          {shortSha(c.sha)}
        </span>

        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: hasEdit ? colors.accent : colors.textMuted,
          flexShrink: 0,
          border: `2px solid ${hasEdit ? colors.accent : colors.border}`,
        }} />

        <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 13, color: hasEdit && edit.message ? colors.accent : colors.text }}>
            {edit.message || c.commit.message.split("\n")[0]}
          </span>
        </div>

        <div style={{
          fontFamily: font.mono, fontSize: 11,
          color: hasEdit && (edit.authorName || edit.authorEmail) ? colors.accent : colors.textDim,
          flexShrink: 0, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {edit.authorName || c.commit.author.name}
        </div>

        <div style={{ fontFamily: font.mono, fontSize: 10, color: colors.textMuted, flexShrink: 0, width: 130, textAlign: "right" }}>
          {fmtDate(edit.authorDate || c.commit.author.date)}
        </div>

        <span style={{
          color: colors.textMuted, fontSize: 12, flexShrink: 0,
          transition: "transform 0.2s",
          transform: expanded ? "rotate(90deg)" : "rotate(0)",
        }}>▶</span>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div style={{
          padding: "12px 12px 16px 50px",
          background: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          animation: "fadeUp 0.2s ease",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                Author Name <span style={{ color: colors.textMuted }}>({c.commit.author.name})</span>
              </label>
              <Input value={edit.authorName || ""} onChange={(v) => onSetEdit(c.sha, "authorName", v)} placeholder={c.commit.author.name} />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                Author Email <span style={{ color: colors.textMuted }}>({c.commit.author.email})</span>
              </label>
              <Input value={edit.authorEmail || ""} onChange={(v) => onSetEdit(c.sha, "authorEmail", v)} placeholder={c.commit.author.email} />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                Committer Name <span style={{ color: colors.textMuted }}>({c.commit.committer.name})</span>
              </label>
              <Input value={edit.committerName || ""} onChange={(v) => onSetEdit(c.sha, "committerName", v)} placeholder={c.commit.committer.name} />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
                Committer Email <span style={{ color: colors.textMuted }}>({c.commit.committer.email})</span>
              </label>
              <Input value={edit.committerEmail || ""} onChange={(v) => onSetEdit(c.sha, "committerEmail", v)} placeholder={c.commit.committer.email} />
            </div>
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
                width: "100%", padding: "8px 12px",
                background: colors.bg, border: `1px solid ${colors.border}`,
                borderRadius: 4, color: colors.text,
                fontFamily: font.mono, fontSize: 12,
                outline: "none", resize: "vertical",
                boxSizing: "border-box", lineHeight: 1.5,
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

// — Main Component —
export default function GitHistoryRewriter() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("auth"); // auth | repos | editor | script
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
  const [batchValues, setBatchValues] = useState({
    authorName: "", authorEmail: "", committerName: "", committerEmail: "",
  });
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthStep, setOauthStep] = useState(null);
  const [deviceCode, setDeviceCode] = useState(null);
  const [scriptGenerated, setScriptGenerated] = useState("");
  const [notification, setNotification] = useState(null);
  const [authTab, setAuthTab] = useState("pat"); // pat | oauth
  const pollRef = useRef(null);

  const notify = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // — Auth —
  const loginPAT = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError("");
    try {
      const u = await fetchGH("/user", token);
      setUser(u);
      setAuthed(true);
      setView("repos");
      notify(`Autenticato come ${u.login}`, "success");
    } catch {
      setError("Token non valido o scaduto. Riprova.");
    }
    setLoading(false);
  };

  const startOAuth = async () => {
    if (!oauthClientId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: oauthClientId, scope: "repo" }),
      });
      if (!res.ok) throw new Error("Failed to start device flow");
      const data = await res.json();
      setDeviceCode(data);
      setOauthStep("waiting");
      startPolling(data);
    } catch {
      setError(
        "Errore nell'avvio OAuth. Verifica il Client ID e che l'app abbia il Device Flow abilitato. " +
        "Nota: il Device Flow di GitHub potrebbe essere bloccato da CORS nel browser."
      );
    }
    setLoading(false);
  };

  const startPolling = (dc) => {
    const interval = (dc.interval || 5) * 1000;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: oauthClientId,
            device_code: dc.device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
        });
        const data = await res.json();
        if (data.access_token) {
          clearInterval(pollRef.current);
          setToken(data.access_token);
          const u = await fetchGH("/user", data.access_token);
          setUser(u);
          setAuthed(true);
          setView("repos");
          setOauthStep(null);
          notify(`OAuth completato! Benvenuto ${u.login}`, "success");
        }
      } catch {}
    }, interval);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // — Repos —
  const loadRepos = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchGH(
        "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
        token
      );
      setRepos(r);
    } catch {
      setError("Errore nel caricamento dei repository.");
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (authed && view === "repos") loadRepos();
  }, [authed, view, loadRepos]);

  const searchRepos = async () => {
    if (!repoSearch.trim()) { loadRepos(); return; }
    setLoading(true);
    try {
      const r = await fetchGH(
        `/search/repositories?q=${encodeURIComponent(repoSearch)}+user:${user.login}&per_page=30`,
        token
      );
      setRepos(r.items || []);
    } catch {
      setError("Errore nella ricerca.");
    }
    setLoading(false);
  };

  const loadCommits = useCallback(async (repoName, branch, pg = 1, reset = false) => {
    const rn = repoName || selectedRepo?.full_name;
    const br = branch || selectedBranch;
    if (!rn) return;
    setLoading(true);
    try {
      const c = await fetchGH(
        `/repos/${rn}/commits?sha=${encodeURIComponent(br)}&per_page=30&page=${pg}`,
        token
      );
      if (reset) {
        setCommits(c);
      } else {
        setCommits((prev) => [...prev, ...c]);
      }
      setHasMore(c.length === 30);
      setPage(pg);
    } catch {
      setError("Errore nel caricamento dei commit.");
    }
    setLoading(false);
  }, [selectedRepo, selectedBranch, token]);

  const selectRepo = async (repo) => {
    setSelectedRepo(repo);
    setLoading(true);
    setCommits([]);
    setEdits({});
    setSelected(new Set());
    setPage(1);
    setHasMore(true);
    try {
      const b = await fetchGH(`/repos/${repo.full_name}/branches?per_page=100`, token);
      setBranches(b);
      const defaultBr = repo.default_branch || "main";
      setSelectedBranch(defaultBr);
      await loadCommits(repo.full_name, defaultBr, 1, true);
    } catch {
      setError("Errore nel caricamento del repository.");
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
  const setEdit = (sha, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [sha]: { ...prev[sha], [field]: value },
    }));
  };

  const toggleSelect = (sha) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(sha) ? n.delete(sha) : n.add(sha);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === commits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(commits.map((c) => c.sha)));
    }
  };

  const applyBatch = () => {
    const newEdits = { ...edits };
    selected.forEach((sha) => {
      const existing = newEdits[sha] || {};
      if (batchValues.authorName) existing.authorName = batchValues.authorName;
      if (batchValues.authorEmail) existing.authorEmail = batchValues.authorEmail;
      if (batchValues.committerName) existing.committerName = batchValues.committerName;
      if (batchValues.committerEmail) existing.committerEmail = batchValues.committerEmail;
      newEdits[sha] = existing;
    });
    setEdits(newEdits);
    setBatchMode(false);
    setBatchValues({ authorName: "", authorEmail: "", committerName: "", committerEmail: "" });
    notify(`Batch applicato a ${selected.size} commit`, "success");
  };

  const clearEdit = (sha) => {
    setEdits((prev) => { const n = { ...prev }; delete n[sha]; return n; });
  };

  const clearAllEdits = () => {
    setEdits({});
    setSelected(new Set());
    notify("Tutte le modifiche annullate");
  };

  // — Script generation —
  const generateScript = () => {
    const editedShas = Object.keys(edits).filter((sha) => {
      const e = edits[sha];
      return Object.values(e).some((v) => v && v.trim());
    });
    if (editedShas.length === 0) { notify("Nessuna modifica da applicare.", "info"); return; }

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

    const authorChanges = [];
    const messageChanges = [];
    const dateChanges = [];

    editedShas.forEach((sha) => {
      const e = edits[sha];
      const commit = commits.find((c) => c.sha === sha);
      if (!commit) return;
      if (e.authorName || e.authorEmail || e.committerName || e.committerEmail) {
        authorChanges.push({ sha, edit: e, commit });
      }
      if (e.message) {
        messageChanges.push({ sha, edit: e, commit });
      }
      if (e.authorDate || e.committerDate) {
        dateChanges.push({ sha, edit: e, commit });
      }
    });

    if (authorChanges.length > 0) {
      script += `# ─── Modifica Autori (via git-filter-repo --mailmap) ───────────\n\n`;
      script += `cat > /tmp/git-mailmap <<'MAILMAP'\n`;
      authorChanges.forEach(({ commit, edit }) => {
        const origName = commit.commit.author.name;
        const origEmail = commit.commit.author.email;
        const newName = edit.authorName || origName;
        const newEmail = edit.authorEmail || origEmail;
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
      script += `# Nota: git-filter-repo non supporta nativamente date per commit specifici.\n`;
      script += `# Usiamo git filter-branch per questo.\n\n`;
      script += `git filter-branch -f --env-filter '\n`;
      dateChanges.forEach(({ sha, edit }) => {
        const ad = edit.authorDate ? new Date(edit.authorDate).toISOString() : "";
        const cd = edit.committerDate ? new Date(edit.committerDate).toISOString() : "";
        script += `if [ "$GIT_COMMIT" = "${sha}" ]; then\n`;
        if (ad) script += `  export GIT_AUTHOR_DATE="${ad}"\n`;
        if (cd) script += `  export GIT_COMMITTER_DATE="${cd}"\n`;
        script += `fi\n`;
      });
      script += `' -- --all\n\n`;
    }

    script += `# ─── Force Push ───────────────────────────────────────────────\n`;
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

  // — Count edits —
  const editCount = Object.keys(edits).filter(
    (sha) => Object.values(edits[sha]).some((v) => v && v.trim())
  ).length;

  // — Render —
  const containerStyle = {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    fontFamily: font.sans,
    position: "relative",
    overflow: "hidden",
  };

  const Notification = () =>
    notification ? (
      <div style={{
        position: "fixed", top: 20, right: 20, zIndex: 9999,
        padding: "12px 20px", borderRadius: 6,
        background:
          notification.type === "success" ? colors.successBg
          : notification.type === "danger" ? colors.dangerBg
          : colors.surface,
        border: `1px solid ${
          notification.type === "success" ? colors.success
          : notification.type === "danger" ? colors.danger
          : colors.border
        }`,
        color:
          notification.type === "success" ? colors.success
          : notification.type === "danger" ? colors.danger
          : colors.text,
        fontFamily: font.mono, fontSize: 13,
        animation: "slideIn 0.3s ease",
      }}>
        {notification.msg}
      </div>
    ) : null;

  // — AUTH VIEW —
  if (view === "auth") return (
    <div style={containerStyle}>
      <style>{globalStyles}</style>
      <Notification />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 480, animation: "fadeUp 0.5s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.accent, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
              git::rewriter
            </div>
            <h1 style={{ fontFamily: font.sans, fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
              History <span style={{ color: colors.accent }}>Editor</span>
            </h1>
            <p style={{ color: colors.textDim, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
              Riscrivi autori, messaggi e date dei commit.<br />
              Genera script git-filter-repo pronti all&rsquo;uso.
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${colors.border}` }}>
            {[["pat", "Personal Access Token"], ["oauth", "OAuth Device Flow"]].map(([key, label]) => (
              <button key={key} onClick={() => setAuthTab(key)} style={{
                flex: 1, padding: "10px 0", background: "transparent", border: "none",
                borderBottom: `2px solid ${authTab === key ? colors.accent : "transparent"}`,
                color: authTab === key ? colors.accent : colors.textDim,
                fontFamily: font.mono, fontSize: 11,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, transition: "all 0.15s",
              }}>
                {label}
              </button>
            ))}
          </div>

          {authTab === "pat" ? (
            <div style={{ animation: "fadeUp 0.3s ease" }}>
              <label style={{ fontFamily: font.mono, fontSize: 11, color: colors.textDim, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                GitHub Token
              </label>
              <Input value={token} onChange={setToken} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" type="password" />
              <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                Crea un token su{" "}
                <span style={{ color: colors.accent }}>github.com/settings/tokens</span> con scope{" "}
                <code style={{ background: colors.surface, padding: "1px 5px", borderRadius: 3 }}>repo</code>
              </p>
              <Btn variant="accent" onClick={loginPAT} disabled={loading || !token.trim()} style={{ width: "100%", marginTop: 16, padding: "12px" }}>
                {loading ? "Connessione..." : "Connetti"}
              </Btn>
            </div>
          ) : (
            <div style={{ animation: "fadeUp 0.3s ease" }}>
              {!oauthStep ? (
                <>
                  <label style={{ fontFamily: font.mono, fontSize: 11, color: colors.textDim, letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                    OAuth App Client ID
                  </label>
                  <Input value={oauthClientId} onChange={setOauthClientId} placeholder="Iv1.xxxxxxxxx" />
                  <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 1.6 }}>
                    Registra una OAuth App su{" "}
                    <span style={{ color: colors.accent }}>github.com/settings/developers</span> e abilita il Device Flow.
                  </p>
                  <div style={{ marginTop: 12, padding: 12, background: colors.surface, borderRadius: 4, border: `1px solid ${colors.border}` }}>
                    <p style={{ fontSize: 11, color: colors.textDim, margin: 0, lineHeight: 1.6 }}>
                      <span style={{ color: colors.accent }}>⚠</span> Il Device Flow di GitHub potrebbe richiedere un proxy CORS per funzionare dal browser. In alternativa, usa un PAT.
                    </p>
                  </div>
                  <Btn variant="accent" onClick={startOAuth} disabled={loading || !oauthClientId.trim()} style={{ width: "100%", marginTop: 16, padding: "12px" }}>
                    {loading ? "Avvio..." : "Avvia OAuth Flow"}
                  </Btn>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: colors.textDim, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                    Inserisci questo codice su github.com
                  </div>
                  <div style={{
                    fontFamily: font.mono, fontSize: 32, fontWeight: 700, color: colors.accent,
                    padding: "16px 24px", background: colors.surface, borderRadius: 8,
                    border: `2px solid ${colors.accent}`, display: "inline-block", letterSpacing: 4,
                  }}>
                    {deviceCode?.user_code || "..."}
                  </div>
                  <p style={{ marginTop: 16 }}>
                    <a
                      href={deviceCode?.verification_uri || "https://github.com/login/device"}
                      target="_blank" rel="noreferrer"
                      style={{ color: colors.accent, fontFamily: font.mono, fontSize: 13 }}
                    >
                      → github.com/login/device
                    </a>
                  </p>
                  <div style={{ marginTop: 16, color: colors.textDim, fontSize: 12, animation: "pulse 2s infinite" }}>
                    In attesa di autorizzazione...
                  </div>
                  <Btn variant="danger" onClick={() => { clearInterval(pollRef.current); setOauthStep(null); }} style={{ marginTop: 16 }}>
                    Annulla
                  </Btn>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, padding: 12, background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: 4, color: colors.danger, fontSize: 12, fontFamily: font.mono }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // — REPOS VIEW —
  if (view === "repos") return (
    <div style={containerStyle}>
      <style>{globalStyles}</style>
      <Notification />
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, letterSpacing: 2, textTransform: "uppercase" }}>git::rewriter</span>
          <span style={{ color: colors.textMuted }}>›</span>
          <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.textDim }}>repositories</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: font.mono, fontSize: 11, color: colors.textDim }}>@{user?.login}</span>
          <Btn variant="danger" onClick={() => { setAuthed(false); setToken(""); setView("auth"); setUser(null); }}>Logout</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        <h2 style={{ fontFamily: font.sans, fontSize: 22, fontWeight: 700, margin: "0 0 20px 0" }}>
          Seleziona un <span style={{ color: colors.accent }}>Repository</span>
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Input value={repoSearch} onChange={setRepoSearch} placeholder="Cerca repository..." style={{ flex: 1 }} />
          <Btn variant="accent" onClick={searchRepos}>Cerca</Btn>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40, fontFamily: font.mono, fontSize: 12, color: colors.textDim }}>
            Caricamento...
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
                transition: "all 0.15s", animation: `fadeUp 0.3s ease ${i * 30}ms both`,
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
                <span style={{ fontFamily: font.mono, fontSize: 10, color: colors.textMuted }}>
                  {r.private ? "🔒" : "🌐"}
                </span>
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
    </div>
  );

  // — SCRIPT VIEW —
  if (view === "script") return (
    <div style={containerStyle}>
      <style>{globalStyles}</style>
      <Notification />
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, letterSpacing: 2, textTransform: "uppercase" }}>git::rewriter</span>
          <span style={{ color: colors.textMuted }}>›</span>
          <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.textDim }}>{selectedRepo?.name}</span>
          <span style={{ color: colors.textMuted }}>›</span>
          <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.text }}>script</span>
        </div>
        <Btn onClick={() => setView("editor")}>← Torna all&rsquo;Editor</Btn>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px", animation: "fadeUp 0.4s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: font.sans, fontSize: 22, fontWeight: 700, margin: 0 }}>
            Script <span style={{ color: colors.accent }}>Generato</span>
          </h2>
          <Btn variant="accent" onClick={copyScript}>Copia Script</Btn>
        </div>
        <div style={{
          background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6,
          padding: 20, overflow: "auto", maxHeight: "calc(100vh - 180px)",
        }}>
          <pre style={{ fontFamily: font.mono, fontSize: 12, color: colors.text, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {scriptGenerated}
          </pre>
        </div>
      </div>
    </div>
  );

  // — EDITOR VIEW —
  return (
    <div style={containerStyle}>
      <style>{globalStyles}</style>
      <Notification />

      {/* Header */}
      <div style={{ padding: "12px 24px", borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{ fontFamily: font.mono, fontSize: 12, color: colors.accent, letterSpacing: 2, textTransform: "uppercase", cursor: "pointer" }}
            onClick={() => { setView("repos"); setSelectedRepo(null); }}
          >
            git::rewriter
          </span>
          <span style={{ color: colors.textMuted }}>›</span>
          <span style={{ fontFamily: font.mono, fontSize: 12, color: colors.text, fontWeight: 600 }}>{selectedRepo?.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <select value={selectedBranch} onChange={(e) => changeBranch(e.target.value)} style={{
            padding: "6px 10px", background: colors.surface, border: `1px solid ${colors.border}`,
            borderRadius: 4, color: colors.text, fontFamily: font.mono, fontSize: 11, cursor: "pointer", outline: "none",
          }}>
            {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>

          <div style={{ width: 1, height: 20, background: colors.border, margin: "0 4px" }} />

          {editCount > 0 && (
            <span style={{ fontFamily: font.mono, fontSize: 11, color: colors.accent, background: colors.accentGlow, padding: "4px 10px", borderRadius: 3 }}>
              {editCount} modific{editCount === 1 ? "a" : "he"}
            </span>
          )}

          <Btn onClick={() => setBatchMode(!batchMode)} disabled={selected.size === 0}>
            Batch {selected.size > 0 ? `(${selected.size})` : ""}
          </Btn>
          <Btn variant="danger" onClick={clearAllEdits} disabled={editCount === 0}>Reset</Btn>
          <Btn variant="accent" onClick={generateScript} disabled={editCount === 0}>Genera Script</Btn>
        </div>
      </div>

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
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Author Name</label>
              <Input value={batchValues.authorName} onChange={(v) => setBatchValues((p) => ({ ...p, authorName: v }))} placeholder="Nome autore" />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Author Email</label>
              <Input value={batchValues.authorEmail} onChange={(v) => setBatchValues((p) => ({ ...p, authorEmail: v }))} placeholder="email@example.com" />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Committer Name</label>
              <Input value={batchValues.committerName} onChange={(v) => setBatchValues((p) => ({ ...p, committerName: v }))} placeholder="Nome committer" />
            </div>
            <div>
              <label style={{ fontFamily: font.mono, fontSize: 9, color: colors.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Committer Email</label>
              <Input value={batchValues.committerEmail} onChange={(v) => setBatchValues((p) => ({ ...p, committerEmail: v }))} placeholder="email@example.com" />
            </div>
            <Btn variant="accent" onClick={applyBatch}>Applica</Btn>
          </div>
        </div>
      )}

      {/* Commit list */}
      <div style={{ padding: "0 12px", maxHeight: batchMode ? "calc(100vh - 220px)" : "calc(100vh - 110px)", overflowY: "auto" }}>
        {/* Select all bar */}
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
        </div>

        {commits.map((c) => {
          const edit = getEdit(c.sha);
          const hasEdit = Object.values(edit).some((v) => v && v.trim());
          const isSelected = selected.has(c.sha);
          return (
            <CommitRow
              key={c.sha}
              c={c}
              isSelected={isSelected}
              hasEdit={hasEdit}
              edit={edit}
              onToggleSelect={toggleSelect}
              onSetEdit={setEdit}
              onClearEdit={clearEdit}
            />
          );
        })}

        {hasMore && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <Btn onClick={() => loadCommits(null, null, page + 1)} disabled={loading}>
              {loading ? "Caricamento..." : "Carica altri commit"}
            </Btn>
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
    </div>
  );
}
