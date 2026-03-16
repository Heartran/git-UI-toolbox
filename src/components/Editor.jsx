import { useState, useEffect, useCallback } from 'react';
import { C, FONT, ghFetch, shortSha, fmtDate, isoLocal, generateScript } from '../lib';
import { Btn, Input, Textarea, Header, Label, Empty, Loader } from './UI';

// ─── Single commit row (extracted to avoid hooks-in-map issue) ──

function CommitRow({ commit, edit, isSelected, hasEdit, onToggle, onSetEdit, onClearEdit }) {
  const [expanded, setExpanded] = useState(false);
  const c = commit;
  const e = edit;

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      background: hasEdit ? C.accentGlow : 'transparent',
      transition: 'background 0.15s',
    }}>
      {/* Summary row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <input type="checkbox" checked={isSelected}
          onChange={(ev) => { ev.stopPropagation(); onToggle(c.sha); }}
          onClick={(ev) => ev.stopPropagation()}
          style={{ accentColor: C.accent, cursor: 'pointer', width: 14, height: 14, flexShrink: 0 }}
        />
        <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.accent, flexShrink: 0, width: 60 }}>
          {shortSha(c.sha)}
        </span>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
          background: hasEdit ? C.accent : C.border,
        }} />
        <div style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 13, color: hasEdit && e.message ? C.accent : C.text,
        }}>
          {e.message || c.commit.message.split('\n')[0]}
        </div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 11, flexShrink: 0, maxWidth: 150,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: hasEdit && (e.authorName || e.authorEmail) ? C.accent : C.textDim,
        }}>
          {e.authorName || c.commit.author.name}
        </div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 10, color: C.textMuted,
          flexShrink: 0, width: 125, textAlign: 'right',
        }}>
          {fmtDate(e.authorDate || c.commit.author.date)}
        </div>
        <span style={{
          color: C.textMuted, fontSize: 11, flexShrink: 0,
          transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
        }}>
          ▶
        </span>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{
          padding: '12px 12px 16px 48px', background: C.surface,
          borderTop: `1px solid ${C.border}`, animation: 'fadeUp 0.15s ease',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <Label hint={c.commit.author.name}>Author Name</Label>
              <Input value={e.authorName || ''} onChange={(v) => onSetEdit(c.sha, 'authorName', v)}
                placeholder={c.commit.author.name} />
            </div>
            <div>
              <Label hint={c.commit.author.email}>Author Email</Label>
              <Input value={e.authorEmail || ''} onChange={(v) => onSetEdit(c.sha, 'authorEmail', v)}
                placeholder={c.commit.author.email} />
            </div>
            <div>
              <Label hint={c.commit.committer.name}>Committer Name</Label>
              <Input value={e.committerName || ''} onChange={(v) => onSetEdit(c.sha, 'committerName', v)}
                placeholder={c.commit.committer.name} />
            </div>
            <div>
              <Label hint={c.commit.committer.email}>Committer Email</Label>
              <Input value={e.committerEmail || ''} onChange={(v) => onSetEdit(c.sha, 'committerEmail', v)}
                placeholder={c.commit.committer.email} />
            </div>
            <div>
              <Label>Author Date</Label>
              <Input type="datetime-local"
                value={e.authorDate || isoLocal(c.commit.author.date)}
                onChange={(v) => onSetEdit(c.sha, 'authorDate', v)} />
            </div>
            <div>
              <Label>Committer Date</Label>
              <Input type="datetime-local"
                value={e.committerDate || isoLocal(c.commit.committer.date)}
                onChange={(v) => onSetEdit(c.sha, 'committerDate', v)} />
            </div>
          </div>
          <div>
            <Label>Commit Message</Label>
            <Textarea value={e.message ?? ''}
              onChange={(v) => onSetEdit(c.sha, 'message', v)}
              placeholder={c.commit.message} />
          </div>
          {hasEdit && (
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Btn variant="danger" onClick={() => onClearEdit(c.sha)}
                style={{ padding: '4px 10px', fontSize: 10 }}>
                Reset Commit
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────

export default function Editor({ token, repo, onBack, notify }) {
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState(repo.default_branch || 'main');
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [edits, setEdits] = useState({});
  const [batchMode, setBatchMode] = useState(false);
  const [batch, setBatch] = useState({ authorName: '', authorEmail: '', committerName: '', committerEmail: '' });
  const [scriptView, setScriptView] = useState(null);

  // Load branches
  useEffect(() => {
    (async () => {
      try {
        const b = await ghFetch(`/repos/${repo.full_name}/branches?per_page=100`, token);
        setBranches(b);
      } catch {}
    })();
  }, [repo.full_name, token]);

  // Load commits
  const loadCommits = useCallback(async (br, pg, reset) => {
    setLoading(true);
    try {
      const c = await ghFetch(
        `/repos/${repo.full_name}/commits?sha=${encodeURIComponent(br)}&per_page=30&page=${pg}`,
        token
      );
      setCommits((prev) => reset ? c : [...prev, ...c]);
      setHasMore(c.length === 30);
      setPage(pg);
    } catch {}
    setLoading(false);
  }, [repo.full_name, token]);

  useEffect(() => { loadCommits(branch, 1, true); }, [branch, loadCommits]);

  const changeBranch = (br) => {
    setBranch(br);
    setEdits({});
    setSelected(new Set());
    setPage(1);
    setHasMore(true);
  };

  // Edit helpers
  const getEdit = (sha) => edits[sha] || {};
  const setEdit = (sha, field, value) =>
    setEdits((prev) => ({ ...prev, [sha]: { ...prev[sha], [field]: value } }));
  const clearEdit = (sha) =>
    setEdits((prev) => { const n = { ...prev }; delete n[sha]; return n; });
  const clearAll = () => { setEdits({}); setSelected(new Set()); notify('Tutte le modifiche annullate'); };

  const hasEditFn = (sha) => {
    const e = edits[sha];
    return e && Object.values(e).some((v) => v?.trim());
  };

  // Selection
  const toggleSelect = (sha) =>
    setSelected((prev) => { const n = new Set(prev); n.has(sha) ? n.delete(sha) : n.add(sha); return n; });
  const selectAll = () =>
    setSelected(selected.size === commits.length ? new Set() : new Set(commits.map((c) => c.sha)));

  // Batch
  const applyBatch = () => {
    const n = { ...edits };
    selected.forEach((sha) => {
      const ex = n[sha] || {};
      if (batch.authorName) ex.authorName = batch.authorName;
      if (batch.authorEmail) ex.authorEmail = batch.authorEmail;
      if (batch.committerName) ex.committerName = batch.committerName;
      if (batch.committerEmail) ex.committerEmail = batch.committerEmail;
      n[sha] = ex;
    });
    setEdits(n);
    setBatchMode(false);
    setBatch({ authorName: '', authorEmail: '', committerName: '', committerEmail: '' });
    notify(`Batch applicato a ${selected.size} commit`, 'success');
  };

  const editCount = Object.keys(edits).filter(hasEditFn).length;

  // Script generation
  const handleGenerate = () => {
    const script = generateScript(edits, commits, repo.full_name, branch);
    if (!script) { notify('Nessuna modifica da generare.'); return; }
    setScriptView(script);
  };

  const copyScript = () => {
    navigator.clipboard.writeText(scriptView).then(() => notify('Script copiato!', 'success'));
  };

  // ─── Script View ─────────────────────────────

  if (scriptView) {
    return (
      <>
        <Header
          crumbs={[
            { label: 'git::rewriter', onClick: onBack },
            { label: repo.name },
            { label: 'script', active: true },
          ]}
          right={<Btn onClick={() => setScriptView(null)}>← Editor</Btn>}
        />
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 20px', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: FONT.sans, fontSize: 20, fontWeight: 700, margin: 0 }}>
              Script <span style={{ color: C.accent }}>Generato</span>
            </h2>
            <Btn variant="accent" onClick={copyScript}>Copia Script</Btn>
          </div>
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
            padding: 18, overflow: 'auto', maxHeight: 'calc(100vh - 160px)',
          }}>
            <pre style={{
              fontFamily: FONT.mono, fontSize: 12, color: C.text,
              margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7,
            }}>
              {scriptView}
            </pre>
          </div>
        </div>
      </>
    );
  }

  // ─── Editor View ─────────────────────────────

  return (
    <>
      <Header
        crumbs={[
          { label: 'git::rewriter', onClick: onBack },
          { label: repo.name, active: true },
        ]}
        right={
          <>
            {/* Branch */}
            <select value={branch} onChange={(e) => changeBranch(e.target.value)} style={{
              padding: '6px 10px', background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 4, color: C.text, fontFamily: FONT.mono, fontSize: 11,
              cursor: 'pointer', outline: 'none',
            }}>
              {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>

            <div style={{ width: 1, height: 20, background: C.border }} />

            {editCount > 0 && (
              <span style={{
                fontFamily: FONT.mono, fontSize: 11, color: C.accent,
                background: C.accentGlow, padding: '4px 10px', borderRadius: 3,
              }}>
                {editCount} modific{editCount === 1 ? 'a' : 'he'}
              </span>
            )}

            <Btn onClick={() => setBatchMode(!batchMode)} disabled={selected.size === 0}>
              Batch{selected.size > 0 ? ` (${selected.size})` : ''}
            </Btn>
            <Btn variant="danger" onClick={clearAll} disabled={editCount === 0}>Reset</Btn>
            <Btn variant="accent" onClick={handleGenerate} disabled={editCount === 0}>
              Genera Script
            </Btn>
          </>
        }
      />

      {/* Batch panel */}
      {batchMode && selected.size > 0 && (
        <div style={{
          padding: '14px 20px', background: C.accentGlow,
          borderBottom: `1px solid ${C.accent}`, animation: 'fadeUp 0.15s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.accent, fontWeight: 600 }}>
              BATCH → {selected.size} commit selezionati
            </span>
            <Btn onClick={() => setBatchMode(false)} style={{ padding: '4px 10px' }}>Chiudi</Btn>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto',
            gap: 8, alignItems: 'end',
          }}>
            <div>
              <Label>Author Name</Label>
              <Input value={batch.authorName}
                onChange={(v) => setBatch((p) => ({ ...p, authorName: v }))}
                placeholder="Nome autore" />
            </div>
            <div>
              <Label>Author Email</Label>
              <Input value={batch.authorEmail}
                onChange={(v) => setBatch((p) => ({ ...p, authorEmail: v }))}
                placeholder="email@example.com" />
            </div>
            <div>
              <Label>Committer Name</Label>
              <Input value={batch.committerName}
                onChange={(v) => setBatch((p) => ({ ...p, committerName: v }))}
                placeholder="Nome committer" />
            </div>
            <div>
              <Label>Committer Email</Label>
              <Input value={batch.committerEmail}
                onChange={(v) => setBatch((p) => ({ ...p, committerEmail: v }))}
                placeholder="email@example.com" />
            </div>
            <Btn variant="accent" onClick={applyBatch}>Applica</Btn>
          </div>
        </div>
      )}

      {/* Commit list */}
      <div style={{
        overflowY: 'auto',
        maxHeight: batchMode ? 'calc(100vh - 210px)' : 'calc(100vh - 100px)',
      }}>
        {/* Select-all row */}
        <div style={{
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: `1px solid ${C.border}`,
          position: 'sticky', top: 0, background: C.bg, zIndex: 10,
        }}>
          <input type="checkbox"
            checked={selected.size === commits.length && commits.length > 0}
            onChange={selectAll}
            style={{ accentColor: C.accent, cursor: 'pointer', width: 14, height: 14 }}
          />
          <span style={{
            fontFamily: FONT.mono, fontSize: 10, color: C.textMuted,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {commits.length} commit · {branch}
          </span>
        </div>

        {commits.map((c) => (
          <CommitRow
            key={c.sha}
            commit={c}
            edit={getEdit(c.sha)}
            isSelected={selected.has(c.sha)}
            hasEdit={hasEditFn(c.sha)}
            onToggle={toggleSelect}
            onSetEdit={setEdit}
            onClearEdit={clearEdit}
          />
        ))}

        {hasMore && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <Btn onClick={() => loadCommits(branch, page + 1, false)} disabled={loading}>
              {loading ? 'Caricamento...' : 'Carica altri commit'}
            </Btn>
          </div>
        )}

        {commits.length === 0 && !loading && <Empty>Nessun commit trovato.</Empty>}
        {loading && commits.length === 0 && <Loader />}
      </div>
    </>
  );
}
