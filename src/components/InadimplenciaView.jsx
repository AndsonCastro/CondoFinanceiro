import { useMemo, useState } from 'react';
import { getAllAptos } from './ApartamentosChecklist';
import { isAdiantadoParaMes } from '../hooks/useStore';
import { MESES } from '../utils/data';
import { Card, SectionHeader } from './UI';

const STATUS_COLOR = {
  ate10:     'var(--green)',
  apos10:    'var(--yellow)',
  tardio:    '#818cf8',
  nao_pago:  'var(--red)',
  sem_dado:  'var(--border2)',
  adiantado: '#2dd4bf',
};

const STATUS_LABEL = {
  ate10:     'Pago até dia 10',
  apos10:    'Pago após dia 10',
  tardio:    'Pago em outro mês',
  nao_pago:  'Não pago',
  sem_dado:  'Sem registro',
  adiantado: 'Adiantado',
};

const BLOCOS = [1,2,3,4,5,6,7,8];

export default function InadimplenciaView({ data }) {
  const [filtroBloco, setFiltroBloco] = useState('todos');
  const contatos = data.config?.contatos || {};
  const inabitaveis = useMemo(() =>
    new Set(Object.entries(contatos).filter(([, c]) => c.inabitavel || c.isento).map(([k]) => k))
  , [contatos]);

  const mesesOrdenados = useMemo(() => {
    const result = [];
    Object.keys(data.anos || {}).sort().forEach(ano => {
      const anoNum = parseInt(ano);
      Object.keys(data.anos[ano].meses || {}).sort((a, b) => a - b).forEach(mes => {
        const mesNum = parseInt(mes);
        const m = data.anos[ano].meses[mes];
        const isGestao = anoNum > 2026 || (anoNum === 2026 && mesNum >= 5);
        const temChecklist = m?.pagamentos_aptos && Object.keys(m.pagamentos_aptos).length > 0;
        if (isGestao || temChecklist) {
          result.push({ ano: anoNum, mes: mesNum });
        }
      });
    });
    return result;
  }, [data]);

  const aptos = useMemo(() => {
    const todos = getAllAptos()
      .filter(k => !inabitaveis.has(k))
      .sort((a, b) => {
        const [, bA, aA] = a.match(/^B(\d+)-(\d+)$/);
        const [, bB, aB] = b.match(/^B(\d+)-(\d+)$/);
        return parseInt(bA) - parseInt(bB) || parseInt(aA) - parseInt(aB);
      });
    if (filtroBloco === 'todos') return todos;
    return todos.filter(k => k.startsWith(`B${filtroBloco}-`));
  }, [filtroBloco, inabitaveis]);

  const adiantamentos = data.config?.adiantamentos || [];

  const getStatus = (ano, mes, key) => {
    const m = data.anos?.[ano]?.meses?.[mes];
    if (!m) return 'sem_dado';
    if (isAdiantadoParaMes(key, ano, mes, adiantamentos)) return 'adiantado';
    const s = m.pagamentos_aptos?.[key];
    if (s === 'ate10') return 'ate10';
    if (s === 'apos10') return 'apos10';
    if (m.pagamentos_tardios?.[key]) return 'tardio';
    return 'nao_pago';
  };

  const statsGlobal = useMemo(() => {
    let ate10 = 0, apos10 = 0, nao_pago = 0, adiantado = 0, total = 0;
    getAllAptos().filter(k => !inabitaveis.has(k)).forEach(key => {
      mesesOrdenados.forEach(({ ano, mes }) => {
        const s = getStatus(ano, mes, key);
        if (s !== 'sem_dado') {
          total++;
          if (s === 'ate10') ate10++;
          else if (s === 'apos10' || s === 'tardio') apos10++;
          else if (s === 'adiantado') adiantado++;
          else nao_pago++;
        }
      });
    });
    return { ate10, apos10, nao_pago, adiantado, total };
  }, [mesesOrdenados, data, inabitaveis, adiantamentos]);

  const aptoStats = useMemo(() =>
    getAllAptos().filter(k => !inabitaveis.has(k)).map(key => {
      let ate10 = 0, apos10 = 0, nao_pago = 0, adiantado = 0, total = 0;
      mesesOrdenados.forEach(({ ano, mes }) => {
        const s = getStatus(ano, mes, key);
        if (s !== 'sem_dado') {
          total++;
          if (s === 'ate10') ate10++;
          else if (s === 'apos10' || s === 'tardio') apos10++;
          else if (s === 'adiantado') adiantado++;
          else nao_pago++;
        }
      });
      const historico = contatos[key]?.historico_inad_meses || 0;
      return { key, ate10, apos10, nao_pago, adiantado, total, historico, pct: total > 0 ? Math.round((ate10 / total) * 100) : 0 };
    }), [mesesOrdenados, data, inabitaveis, adiantamentos, contatos]);

  const temHistorico = aptoStats.some(a => a.historico > 0);
  const topInadimp = [...aptoStats].sort((a, b) => (b.nao_pago + b.historico) - (a.nao_pago + a.historico)).slice(0, 5);

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
          ...(statsGlobal.adiantado > 0 ? [{ label: 'Adiantados', value: statsGlobal.adiantado, color: '#2dd4bf', pct: statsGlobal.total > 0 ? ((statsGlobal.adiantado / statsGlobal.total) * 100).toFixed(1) : 0 }] : []),
        ].map(({ label, value, color, pct }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{pct}% do total</div>
          </div>
        ))}
      </div>

      {/* Top inadimplentes */}
      {topInadimp.some(a => (a.nao_pago + a.historico) > 0) && (
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader>🚨 Maiores Inadimplentes</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topInadimp.filter(a => (a.nao_pago + a.historico) > 0).map(a => {
              const total = a.nao_pago + a.historico;
              const maxTotal = Math.max(...topInadimp.map(x => x.nao_pago + x.historico), 1);
              return (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, minWidth: 70, fontSize: 13 }}>{a.key}</span>
                  <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 6, height: 8, overflow: 'hidden', display: 'flex' }}>
                    {a.nao_pago > 0 && <div style={{ height: '100%', width: `${(a.nao_pago / maxTotal) * 100}%`, background: 'var(--red)', borderRadius: a.historico ? '6px 0 0 6px' : 6 }} />}
                    {a.historico > 0 && <div style={{ height: '100%', width: `${(a.historico / maxTotal) * 100}%`, background: 'rgba(239,68,68,0.35)', borderRadius: a.nao_pago ? '0 6px 6px 0' : 6 }} />}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>
                    {total} não pago{total > 1 ? 's' : ''}
                    {a.historico > 0 && <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}> (+{a.historico} hist.)</span>}
                  </span>
                </div>
              );
            })}
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
                {temHistorico && (
                  <th style={{ padding: '6px 4px', textAlign: 'center', color: 'rgba(239,68,68,0.6)', fontWeight: 700, fontSize: 9, whiteSpace: 'nowrap', minWidth: 40, borderRight: '1px solid var(--border)' }}>
                    <div>Hist.</div>
                    <div style={{ fontSize: 8, opacity: 0.7 }}>antes</div>
                  </th>
                )}
                {mesesOrdenados.map(({ ano, mes }) => (
                  <th key={`${ano}-${mes}`} style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 44 }}>
                    <div style={{ fontSize: 9 }}>{MESES[mes - 1]}</div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{String(ano).slice(2)}</div>
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
                    <td style={{ padding: '4px 12px', position: 'sticky', left: 0, background: 'inherit', zIndex: 1, borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12 }}>{key}</div>
                      {contatos[key]?.nome && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{contatos[key].nome}</div>}
                    </td>
                    {temHistorico && (() => {
                      const hist = contatos[key]?.historico_inad_meses || 0;
                      return (
                        <td style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                          {hist > 0 ? (
                            <span title={`${hist} meses inadimplente antes do período rastreado`} style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: 'var(--red)', background: 'rgba(239,68,68,0.12)', padding: '1px 5px', borderRadius: 10 }}>
                              {hist}m
                            </span>
                          ) : null}
                        </td>
                      );
                    })()}
                    {mesesOrdenados.map(({ ano, mes }) => {
                      const s = getStatus(ano, mes, key);
                      return (
                        <td key={`${ano}-${mes}`} style={{ padding: '4px', textAlign: 'center' }}>
                          <div title={`${key} — ${MESES[mes - 1]}/${ano}: ${STATUS_LABEL[s]}`}
                            style={{ width: 16, height: 16, borderRadius: 4, background: STATUS_COLOR[s], margin: '0 auto', cursor: 'default' }} />
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
