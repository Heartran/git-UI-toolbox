import { C, FONT } from '../lib';

// ─── Button ──────────────────────────────────────

export function Btn({ children, onClick, variant = 'default', disabled, style = {} }) {
  const colors = {
    accent: { bg: C.accent, border: C.accent, text: C.bg },
    danger: { bg: 'transparent', border: C.danger, text: C.danger },
    default: { bg: 'transparent', border: C.border, text: C.text },
  };
  const v = colors[variant] || colors.default;
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: '8px 16px', border: `1px solid ${v.border}`,
      background: v.bg, color: v.text, borderRadius: 4,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: FONT.mono, fontSize: 11, fontWeight: 600,
      opacity: disabled ? 0.4 : 1, letterSpacing: '0.5px',
      transition: 'all 0.15s', textTransform: 'uppercase',
      whiteSpace: 'nowrap', ...style,
    }}>
      {children}
    </button>
  );
}

// ─── Text Input ──────────────────────────────────

export function Input({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input type={type} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '8px 12px', background: C.bg,
        border: `1px solid ${C.border}`, borderRadius: 4,
        color: C.text, fontFamily: FONT.mono, fontSize: 13,
        width: '100%', outline: 'none', transition: 'border-color 0.15s',
        boxSizing: 'border-box', ...style,
      }}
      onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  );
}

// ─── Textarea ────────────────────────────────────

export function Textarea({ value, onChange, placeholder, rows = 3, style = {} }) {
  return (
    <textarea value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: '100%', padding: '8px 12px', background: C.bg,
        border: `1px solid ${C.border}`, borderRadius: 4,
        color: C.text, fontFamily: FONT.mono, fontSize: 12,
        outline: 'none', resize: 'vertical', boxSizing: 'border-box',
        lineHeight: 1.5, ...style,
      }}
      onFocus={(e) => (e.target.style.borderColor = C.borderFocus)}
      onBlur={(e) => (e.target.style.borderColor = C.border)}
    />
  );
}

// ─── Notification ────────────────────────────────

export function Notification({ notification }) {
  if (!notification) return null;
  const t = notification.type;
  const color = t === 'success' ? C.success : t === 'danger' ? C.danger : C.textDim;
  const bg = t === 'success' ? C.successBg : t === 'danger' ? C.dangerBg : C.surface;
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      padding: '10px 18px', borderRadius: 5,
      background: bg, border: `1px solid ${color}`, color,
      fontFamily: FONT.mono, fontSize: 12,
      animation: 'slideIn 0.25s ease',
      pointerEvents: 'none',
    }}>
      {notification.msg}
    </div>
  );
}

// ─── Header Breadcrumb ───────────────────────────

export function Header({ crumbs, right }) {
  return (
    <div style={{
      padding: '12px 20px', borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 8, background: C.bg,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {i > 0 && <span style={{ color: C.textMuted, fontSize: 11 }}>›</span>}
            <span onClick={c.onClick} style={{
              fontFamily: FONT.mono, fontSize: 12,
              color: i === 0 ? C.accent : c.active ? C.text : C.textDim,
              fontWeight: c.active ? 600 : 400,
              letterSpacing: i === 0 ? 2 : 0,
              textTransform: i === 0 ? 'uppercase' : 'none',
              cursor: c.onClick ? 'pointer' : 'default',
            }}>
              {c.label}
            </span>
          </span>
        ))}
      </div>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{right}</div>}
    </div>
  );
}

// ─── Label ───────────────────────────────────────

export function Label({ children, hint }) {
  return (
    <label style={{
      fontFamily: FONT.mono, fontSize: 9, color: C.textDim,
      textTransform: 'uppercase', letterSpacing: 1,
      display: 'block', marginBottom: 4,
    }}>
      {children}
      {hint && <span style={{ color: C.textMuted, textTransform: 'none', letterSpacing: 0 }}> ({hint})</span>}
    </label>
  );
}

// ─── Empty state ─────────────────────────────────

export function Empty({ children }) {
  return (
    <div style={{
      padding: 40, textAlign: 'center', color: C.textMuted,
      fontFamily: FONT.mono, fontSize: 12,
    }}>
      {children}
    </div>
  );
}

// ─── Loading ─────────────────────────────────────

export function Loader() {
  return (
    <div style={{
      padding: 40, textAlign: 'center',
      fontFamily: FONT.mono, fontSize: 12, color: C.textDim,
    }}>
      <span style={{ animation: 'pulse 1.5s infinite' }}>Caricamento...</span>
    </div>
  );
}
