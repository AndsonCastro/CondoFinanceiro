import { useMemo, useState } from 'react';
import { getAllAptos } from './ApartamentosChecklist';
import { MESES } from '../utils/data';
import { Card, SectionHeader } from './UI';

const STATUS_COLOR = {
  ate10:    'var(--green)',
  apos10:   'var(--yellow)',
  nao_pago: 'var(--red)',
  sem_dado: 'var(--border2)',
};

const STATUS_LABEL = {
  ate10:    'Pago até dia 10',
  apos10:   'Pago após dia 10',
  nao_pago: 'Não pago',
  sem_dado: 'Sem registro',
};

const BLOCOS = [1,2,3,4,5,6,7,8];

export default function InadimplenciaView({ data }) {
  const [filtroBloco, setFiltroBloco] = useState('todos');
  const inabitaveis = useMemo(() =>
    new Set(Object.entries(data.config?.contatos || {}).filter(([, c]) => c.inabitavel).map(([k]) => k))
  , [data.config?.contatos]);

  const mesesOrdenados = useMemo(() => {
    const result = [];
    Object.keys(data.anos || {}).sort().forEach(ano => {
      Object.keys(data.anos[ano].meses || {}).sort((a, b) => a - b).forEach(mes => {
        result.push({ ano: parseInt(ano), mes: parseInt(mes) });
      });
    });
    return result;
  }, [data]);

  const aptos = useMemo(() => {
    const todos = getAllAptos().filter(k => !inabitaveis.has(k));
    if (filtroBloco === 'todos') return todos;
    return todos.filter(k => k.startsWith(`B${filtroBloco}-`));
  }, [filtroBloco, inabitaveis]);

  const getStatus = (ano, mes, key) => {
    const m = data.anos?.[ano]?.meses?.[mes];
    if (!m) return 'sem_dado';
    const s = m.pagamentos_aptos?.[key];
    if (s === 'ate10') return 'ate10';
    if (s === 'apos10') return 'apos10';
    return 'nao_pago';
  };

  const statsGlobal = useMemo(() => {
    let ate10 = 0, apos10 = 0, nao_pago = 0, total = 0;
    getAllAptos().filter(k => !inabitaveis.has(k)).forEach(key => {
      mesesOrdenados.forEach(({ ano, mes }) => {
        const s = getStatus(ano, mes, key);
        if (s !== 'sem_dado') {
          total++;
          if (s === 'ate10') ate10++;
          else if (s === 'apos10') apos10++;
          else nao_pago++;
        }
      });
    });
    return { ate10, apos10, nao_pago, total };
  }, [mesesOrdenados, data]);

  const aptoStats = useMemo(() =>
    getAllAptos().filter(k => !inabitaveis.has(k)).map(key => {
      let ate10 = 0, apos10 = 0, nao_pago = 0, total = 0;
      mesesOrdenados.forEach(({ ano, mes }) => {
        const s = getStatus(ano, mes, key);
        if (s !== 'sem_dado') { total++; if (s === 'ate10') ate10++; else if (s === 'apos10') apos10++; else nao_pago++; }
      });
      return { key, ate10, apos10, nao_pago, total, pct: total > 0 ? Math.round((ate10 / total) * 100) : 0 };
    }), [mesesOrdenados, data]);

  const topInadimp = [...aptoStats].sort((a, b) => b.nao_pago - a.nao_pago).slice(0, 5);

  if (!mesesOrdenados.length) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
        Nenhum dado registrado ainda.
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Histórico de Inadimplência</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
          {mesesOrdenados.length} meses registrados • {getAllAptos().length} apartamentos
        </p>
      </div>

      {/* KPIs globais */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        {[
          { label: 'Pagamentos pontuais (≤10)', value: statsGlobal.ate10, color: 'var(--green)', pct: statsGlobal.total > 0 ? ((statsGlobal.ate10 / statsGlobal.total) * 100).toFixed(1) : 0 },
          { label: 'Pagamentos tardios (>10)', value: statsGlobal.apos10, color: 'var(--yellow)', pct: statsGlobal.total > 0 ? ((statsGlobal.apos10 / statsGlobal.total) * 100).toFixed(1) : 0 },
          { label: 'Não pagamentos registrados', value: statsGlobal.nao_pago, color: 'var(--red)', pct: statsGlobal.total > 0 ? ((statsGlobal.nao_pago / statsGlobal.total) * 100).toFixed(1) : 0 },
        ].map(({ label, value, color, pct }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{pct}% do total</div>
          </div>
        ))}
      </div>

      {/* Top inadimplentes */}
      {topInadimp.some(a => a.nao_pago > 0) && (
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader>🚨 Maiores Inadimplentes</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topInadimp.filter(a => a.nao_pago > 0).map(a => (
              <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 70, fontSize: 13 }}>{a.key}</span>
                <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${a.total > 0 ? (a.nao_pago / a.total) * 100 : 0}%`, background: 'var(--red)', borderRadius: 6 }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{a.nao_pago} não pago{a.nao_pago > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legenda + filtro */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLOR[k] }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Filtrar bloco:</span>
          <select value={filtroBloco} onChange={e => setFiltroBloco(e.target.value)} style={{ padding: '4px 8px', fontSize: 12 }}>
            <option value="todos">Todos</option>
            {BLOCOS.map(b => <option key={b} value={b}>Bloco {b}</option>)}
          </select>
        </div>
      </div>

      {/* Heatmap */}
      <Card>
        <SectionHeader>Mapa de Pagamentos</SectionHeader>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 'max-content' }}>
            <thead>
              <tr>
                <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>
                  Apartamento
                </th>
                {mesesOrdenados.map(({ ano, mes }) => (
                  <th key={`${ano}-${mes}`} style={{ padding: '4px 1px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 24 }}>
                    <div style={{ fontSize: 8 }}>{MESES[mes - 1]}</div>
                    <div style={{ fontSize: 8, opacity: 0.6 }}>{String(ano).slice(2)}</div>
                  </th>
                ))}
                <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>≤10</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>&gt;10</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>❌</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 10 }}>% Pont.</th>
              </tr>
            </thead>
            <tbody>
              {aptos.map(key => {
                const st = aptoStats.find(a => a.key === key);
                return (
                  <tr key={key} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '2px 10px 2px 4px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, position: 'sticky', left: 0, background: 'inherit', zIndex: 1, borderRight: '1px solid var(--border)' }}>
                      {key}
                    </td>
                    {mesesOrdenados.map(({ ano, mes }) => {
                      const s = getStatus(ano, mes, key);
                      return (
                        <td key={`${ano}-${mes}`} style={{ padding: '2px 1px', textAlign: 'center' }}>
                          <div title={`${key} — ${MESES[mes - 1]}/${ano}: ${STATUS_LABEL[s]}`}
                            style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLOR[s], margin: '0 auto', cursor: 'default' }} />
                        </td>
                      );
                    })}
                    <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--green)', fontWeight: 700 }}>{st?.ate10 ?? 0}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--yellow)', fontWeight: 700 }}>{st?.apos10 ?? 0}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>{st?.nao_pago ?? 0}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 800, fontSize: 12, color: (st?.pct ?? 0) >= 80 ? 'var(--green)' : (st?.pct ?? 0) >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                      {st?.pct ?? 0}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
