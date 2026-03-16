import { useState } from 'react';
import { C, FONT, buildOAuthUrl } from '../lib';
import { Btn, Input } from './UI';

export default function Auth({ onAuth, error }) {
  const [tab, setTab] = useState('pat');
  const [patToken, setPatToken] = useState('');
  const [clientId, setClientId] = useState(() => localStorage.getItem('gh_oauth_client_id') || '');
  const [proxyUrl, setProxyUrl] = useState(() => localStorage.getItem('gh_oauth_proxy') || '');
  const [loading, setLoading] = useState(false);

  const handlePAT = async () => {
    if (!patToken.trim()) return;
    setLoading(true);
    await onAuth({ type: 'pat', token: patToken.trim() });
    setLoading(false);
  };

  const handleOAuth = () => {
    if (!clientId.trim()) return;
    localStorage.setItem('gh_oauth_client_id', clientId.trim());
    if (proxyUrl.trim()) localStorage.setItem('gh_oauth_proxy', proxyUrl.trim());
    const redirectUri = `${window.location.origin}${window.location.pathname}`;
    const url = buildOAuthUrl(clientId.trim(), redirectUri);
    window.location.href = url;
  };

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      flex: 1, padding: '10px 0', background: 'transparent', border: 'none',
      borderBottom: `2px solid ${tab === key ? C.accent : 'transparent'}`,
      color: tab === key ? C.accent : C.textDim,
      fontFamily: FONT.mono, fontSize: 11, cursor: 'pointer',
      textTransform: 'uppercase', letterSpacing: 1, transition: 'all 0.15s',
    }}>
      {label}
    </button>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 460, animation: 'fadeUp 0.5s ease' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 11, color: C.accent,
            letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8,
          }}>
            git::rewriter
          </div>
          <h1 style={{
            fontFamily: FONT.sans, fontSize: 28, fontWeight: 700,
            margin: 0, letterSpacing: '-0.5px',
          }}>
            History <span style={{ color: C.accent }}>Editor</span>
          </h1>
          <p style={{ color: C.textDim, fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
            Riscrivi autori, messaggi e date dei commit.
            <br />Genera script git-filter-repo pronti all'uso.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          {tabBtn('pat', 'Personal Access Token')}
          {tabBtn('oauth', 'OAuth Flow')}
        </div>

        {/* PAT */}
        {tab === 'pat' && (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            <label style={{
              fontFamily: FONT.mono, fontSize: 10, color: C.textDim,
              letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6,
            }}>
              GitHub Token
            </label>
            <Input value={patToken} onChange={setPatToken} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" type="password" />
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 8, lineHeight: 1.6 }}>
              Crea un token su{' '}
              <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer"
                style={{ color: C.accent, textDecoration: 'none' }}>
                github.com/settings/tokens
              </a>{' '}
              con scope <code style={{ background: C.surface, padding: '1px 5px', borderRadius: 3 }}>repo</code>
            </p>
            <Btn variant="accent" onClick={handlePAT}
              disabled={loading || !patToken.trim()}
              style={{ width: '100%', marginTop: 16, padding: 12 }}>
              {loading ? 'Connessione...' : 'Connetti'}
            </Btn>
          </div>
        )}

        {/* OAuth */}
        {tab === 'oauth' && (
          <div style={{ animation: 'fadeUp 0.2s ease' }}>
            <label style={{
              fontFamily: FONT.mono, fontSize: 10, color: C.textDim,
              letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6,
            }}>
              OAuth App — Client ID
            </label>
            <Input value={clientId} onChange={setClientId} placeholder="Iv23li_xxxxxxxxx" />

            <div style={{ marginTop: 14 }}>
              <label style={{
                fontFamily: FONT.mono, fontSize: 10, color: C.textDim,
                letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 6,
              }}>
                Token Exchange Proxy URL
              </label>
              <Input value={proxyUrl} onChange={setProxyUrl}
                placeholder="https://your-worker.workers.dev/token" />
            </div>

            <div style={{
              marginTop: 14, padding: 12, background: C.surface,
              borderRadius: 4, border: `1px solid ${C.border}`,
            }}>
              <p style={{ fontSize: 11, color: C.textDim, margin: 0, lineHeight: 1.7 }}>
                <span style={{ color: C.accent }}>①</span> Registra una OAuth App su{' '}
                <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer"
                  style={{ color: C.accent, textDecoration: 'none' }}>
                  github.com/settings/developers
                </a>
                <br />
                <span style={{ color: C.accent }}>②</span> Callback URL:{' '}
                <code style={{ background: C.bg, padding: '1px 5px', borderRadius: 3, fontSize: 10 }}>
                  {window.location.origin}{window.location.pathname}
                </code>
                <br />
                <span style={{ color: C.accent }}>③</span> Deploya il proxy per lo scambio del token
                (vedi <code style={{ background: C.bg, padding: '1px 5px', borderRadius: 3 }}>README.md</code>)
              </p>
            </div>

            <Btn variant="accent" onClick={handleOAuth}
              disabled={!clientId.trim() || !proxyUrl.trim()}
              style={{ width: '100%', marginTop: 16, padding: 12 }}>
              Autorizza con GitHub
            </Btn>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: 12, background: C.dangerBg,
            border: `1px solid ${C.danger}`, borderRadius: 4,
            color: C.danger, fontSize: 12, fontFamily: FONT.mono,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
