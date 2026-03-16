import { useState, useEffect, useCallback } from 'react';
import { C, FONT, ghFetch, exchangeOAuthCode } from './lib';
import { Notification } from './components/UI';
import Auth from './components/Auth';
import Repos from './components/Repos';
import Editor from './components/Editor';

const GLOBAL_CSS = `
  @keyframes slideIn { from { opacity:0; transform: translateX(16px); } to { opacity:1; transform: translateX(0); } }
  @keyframes fadeUp  { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
  @keyframes pulse   { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
`;

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('gh_token') || '');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('auth'); // auth | repos | editor
  const [repo, setRepo] = useState(null);
  const [error, setError] = useState('');
  const [notif, setNotif] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(false);

  const notify = useCallback((msg, type = 'info') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3500);
  }, []);

  // ─── Authenticate with token ─────────────────
  const authenticate = useCallback(async (tk) => {
    try {
      const u = await ghFetch('/user', tk);
      setToken(tk);
      setUser(u);
      sessionStorage.setItem('gh_token', tk);
      setView('repos');
      setError('');
      notify(`Connesso come @${u.login}`, 'success');
    } catch (e) {
      setError(e.message || 'Autenticazione fallita. Verifica il token.');
      throw e;
    }
  }, [notify]);

  // ─── Handle OAuth callback on mount ──────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('oauth_state');

    if (code && state) {
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);

      if (state !== storedState) {
        setError('OAuth state mismatch — possibile attacco CSRF. Riprova.');
        return;
      }

      sessionStorage.removeItem('oauth_state');
      const clientId = localStorage.getItem('gh_oauth_client_id');
      const proxyUrl = localStorage.getItem('gh_oauth_proxy');

      if (!clientId || !proxyUrl) {
        setError('Client ID o Proxy URL mancanti. Riconfigura OAuth.');
        return;
      }

      setOauthLoading(true);
      exchangeOAuthCode(proxyUrl, clientId, code)
        .then((tk) => authenticate(tk))
        .catch((e) => setError(`OAuth fallito: ${e.message}`))
        .finally(() => setOauthLoading(false));
    }
  }, [authenticate]);

  // ─── Resume session ──────────────────────────
  useEffect(() => {
    if (token && !user) {
      authenticate(token).catch(() => {
        sessionStorage.removeItem('gh_token');
        setToken('');
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth handler ────────────────────────────
  const handleAuth = async ({ type, token: tk }) => {
    setError('');
    if (type === 'pat') {
      try { await authenticate(tk); } catch {}
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setRepo(null);
    setView('auth');
    sessionStorage.removeItem('gh_token');
  };

  const selectRepo = (r) => { setRepo(r); setView('editor'); };
  const backToRepos = () => { setRepo(null); setView('repos'); };

  // ─── Render ──────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: FONT.sans,
    }}>
      <style>{GLOBAL_CSS}</style>
      <Notification notification={notif} />

      {oauthLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,15,0.9)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 13, color: C.accent,
            animation: 'pulse 1.5s infinite',
          }}>
            Completamento OAuth in corso...
          </div>
        </div>
      )}

      {view === 'auth' && <Auth onAuth={handleAuth} error={error} />}
      {view === 'repos' && <Repos token={token} user={user} onSelect={selectRepo} onLogout={handleLogout} />}
      {view === 'editor' && repo && (
        <Editor token={token} repo={repo} onBack={backToRepos} notify={notify} />
      )}
    </div>
  );
}
