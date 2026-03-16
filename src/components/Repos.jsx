import { useState, useEffect, useCallback } from 'react';
import { C, FONT, ghFetch } from '../lib';
import { Btn, Input, Header, Empty, Loader } from './UI';

export default function Repos({ token, user, onSelect, onLogout }) {
  const [repos, setRepos] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ghFetch(
        '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
        token
      );
      setRepos(r);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const doSearch = async () => {
    if (!search.trim()) { load(); return; }
    setLoading(true);
    try {
      const r = await ghFetch(
        `/search/repositories?q=${encodeURIComponent(search)}+user:${user.login}&per_page=30`,
        token
      );
      setRepos(r.items || []);
    } catch {}
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter') doSearch(); };

  return (
    <>
      <Header
        crumbs={[
          { label: 'git::rewriter' },
          { label: 'repositories', active: true },
        ]}
        right={
          <>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.textDim }}>
              @{user?.login}
            </span>
            <Btn variant="danger" onClick={onLogout}>Logout</Btn>
          </>
        }
      />

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '24px 20px' }}>
        <h2 style={{ fontFamily: FONT.sans, fontSize: 22, fontWeight: 700, margin: '0 0 18px' }}>
          Seleziona un <span style={{ color: C.accent }}>Repository</span>
        </h2>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1 }} onKeyDown={handleKey}>
            <Input value={search} onChange={setSearch} placeholder="Cerca repository..." />
          </div>
          <Btn variant="accent" onClick={doSearch}>Cerca</Btn>
        </div>

        {loading && <Loader />}

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {repos.map((r, i) => (
            <div key={r.id} onClick={() => onSelect(r)} style={{
              padding: '13px 16px', background: C.surface, borderRadius: 4,
              border: `1px solid ${C.border}`, cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              animation: `fadeUp 0.25s ease ${Math.min(i * 25, 400)}ms both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.borderFocus;
              e.currentTarget.style.background = C.surfaceHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.background = C.surface;
            }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: C.textDim }}>{r.owner?.login}/</span>
                  <span style={{ color: C.text }}>{r.name}</span>
                </div>
                {r.description && (
                  <div style={{
                    fontSize: 12, color: C.textMuted, marginTop: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.description}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {r.language && (
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 10, color: C.textDim,
                    background: C.bg, padding: '2px 7px', borderRadius: 3,
                  }}>
                    {r.language}
                  </span>
                )}
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.textMuted }}>
                  {r.private ? '🔒' : ''}
                </span>
                <span style={{ color: C.accent, fontSize: 13 }}>→</span>
              </div>
            </div>
          ))}
        </div>

        {repos.length === 0 && !loading && <Empty>Nessun repository trovato.</Empty>}
      </div>
    </>
  );
}
