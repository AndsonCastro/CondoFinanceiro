import { useState, forwardRef } from 'react';
import { X, ChevronDown } from 'lucide-react';

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = 'primary', size = 'md', disabled, style = {}, ...rest }) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-ui)', fontWeight: 600, borderRadius: 8,
    transition: 'all 0.15s', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    ...{ sm: { padding: '5px 12px', fontSize: 13 }, md: { padding: '9px 18px', fontSize: 14 }, lg: { padding: '11px 24px', fontSize: 15 } }[size],
  };
  const variants = {
    primary:  { background: 'var(--blue)', color: '#fff' },
    success:  { background: 'var(--green)', color: '#0a1a0f' },
    danger:   { background: 'var(--red)', color: '#fff' },
    ghost:    { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border2)' },
    outline:  { background: 'transparent', color: 'var(--blue)', border: '1px solid var(--blue)' },
    muted:    { background: 'var(--surface2)', color: 'var(--muted)' },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
};

// ─── CARD ────────────────────────────────────────────────────────────────────
export const Card = forwardRef(({ children, style = {}, className = '' }, ref) => (
  <div ref={ref} className={className} style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 20, ...style
  }}>{children}</div>
));

// ─── KPI CARD ────────────────────────────────────────────────────────────────
export const KPI = ({ label, value, sub, color, icon, trend }) => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 150
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      {icon && <span style={{ fontSize: 18, opacity: 0.8 }}>{icon}</span>}
    </div>
    <div style={{ color: color || 'var(--text)', fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
      {value}
    </div>
    {(sub || trend !== undefined) && (
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend !== undefined && (
          <span style={{ fontSize: 11, color: trend >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{sub}</span>}
      </div>
    )}
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'blue' }) => {
  const colors = {
    blue:   { bg: 'var(--blue-dim)', color: 'var(--blue)' },
    green:  { bg: 'var(--green-dim)', color: 'var(--green)' },
    red:    { bg: 'var(--red-dim)', color: 'var(--red)' },
    yellow: { bg: 'var(--yellow-dim)', color: 'var(--yellow)' },
  };
  return (
    <span style={{
      ...colors[color], fontSize: 11, fontWeight: 700, padding: '3px 8px',
      borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: 0.5
    }}>{children}</span>
  );
};

// ─── MODAL ───────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, width = 500 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20
    }}>
      <div onClick={e => e.stopPropagation()} className="slide-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: 14, width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
};

// ─── INLINE EDIT ROW ─────────────────────────────────────────────────────────
export const EditableRow = ({ item, onSave, onDelete, categorias, colorAccent = 'var(--blue)', extraCol }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ descricao: item.descricao, categoria: item.categoria, valor: item.valor });

  const save = () => { onSave(form); setEditing(false); };

  const hasExtra = extraCol !== undefined;

  if (editing) return (
    <tr style={{ background: 'var(--surface2)' }}>
      <td style={{ padding: '8px 6px' }}>
        <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} style={{ width: '100%' }} />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={{ width: '100%' }}>
          {categorias.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 6px' }}>
        <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
          style={{ width: '100%', textAlign: 'right' }} />
      </td>
      {hasExtra && <td style={{ padding: '8px 6px' }} />}
      <td style={{ padding: '8px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <Btn size="sm" variant="success" onClick={save}>✓</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setEditing(false)} style={{ marginLeft: 4 }}>✕</Btn>
      </td>
    </tr>
  );

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ padding: '9px 8px', fontSize: 13 }}>{item.descricao}</td>
      <td style={{ padding: '9px 8px' }}>
        <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.7, background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>{item.categoria}</span>
      </td>
      <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: colorAccent, fontWeight: 600 }}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
      </td>
      {hasExtra && <td style={{ padding: '9px 8px' }}>{extraCol}</td>}
      <td style={{ padding: '9px 8px', textAlign: 'right', opacity: 0 }} className="row-actions">
        <Btn size="sm" variant="ghost" onClick={() => setEditing(true)}>✏</Btn>
        <Btn size="sm" variant="ghost" onClick={onDelete} style={{ marginLeft: 4, color: 'var(--red)' }}>🗑</Btn>
      </td>
    </tr>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
export const SectionHeader = ({ children, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85 }}>{children}</h3>
    {action}
  </div>
);

// ─── CONFIRM DIALOG ──────────────────────────────────────────────────────────
export const useConfirm = () => {
  const [state, setState] = useState({ open: false, msg: '', resolve: null });

  const confirm = (msg) => new Promise(resolve => setState({ open: true, msg, resolve }));

  const Dialog = () => state.open ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%', margin: 16 }}>
        <p style={{ marginBottom: 20, fontSize: 14 }}>{state.msg}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => { state.resolve(false); setState({ open: false }); }}>Cancelar</Btn>
          <Btn variant="danger" onClick={() => { state.resolve(true); setState({ open: false }); }}>Confirmar</Btn>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, Dialog };
};

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, max, color = 'var(--blue)', label, sub }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      {(label || sub) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          {label && <span style={{ fontSize: 13, color: 'var(--text)', opacity: 0.8 }}>{label}</span>}
          {sub && <span style={{ fontSize: 13, fontWeight: 700 }}>{sub}</span>}
        </div>
      )}
      <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

// Inject row hover effect via style tag
const style = document.createElement('style');
style.textContent = `
  tr:hover .row-actions { opacity: 1 !important; }
  .row-actions { transition: opacity 0.15s; }
`;
document.head.appendChild(style);
