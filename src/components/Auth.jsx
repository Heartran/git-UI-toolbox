import { C, FONT } from '../lib';
import { Btn } from './UI';

export default function Auth({ error }) {
  const handleOAuthLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = '/api/auth/github';
  };

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

        {/* OAuth Button */}
        <Btn
          variant="accent"
          onClick={handleOAuthLogin}
          style={{ width: '100%', padding: 12, fontSize: 14, fontWeight: 600 }}
        >
          Login con GitHub
        </Btn>

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
