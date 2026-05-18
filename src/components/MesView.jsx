import { useState } from 'react';
import { Plus, CheckCircle2, Trash2, FileText, FileDown, Clock } from 'lucide-react';
import { MESES, MESES_FULL, CATEGORIAS_RECEITA, CATEGORIAS_DESPESA, calcTotais, fmt, exportCSV, PONTUALIDADE_TOTAL_UNIDADES } from '../utils/data';
import { getAllAptos } from './ApartamentosChecklist';
import { gerarRelatorioPDF } from '../utils/pdf';
import { Card, Btn, KPI, Modal, SectionHeader, EditableRow, Badge, ProgressBar, useConfirm } from './UI';
import ApartamentosChecklist from './ApartamentosChecklist';

// ─── FORMULÁRIO DE ADIÇÃO ────────────────────────────────────────────────────
const AddItemForm = ({ categorias, onAdd, placeholder, accent }) => {
  const [form, setForm] = useState({ descricao: '', categoria: categorias[0], valor: '' });
  const valid = form.descricao.trim() && form.valor && parseFloat(form.valor) > 0;

  const submit = () => {
    if (!valid) return;
    onAdd({ ...form, valor: parseFloat(form.valor) });
    setForm({ descricao: '', categoria: categorias[0], valor: '' });
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
      <input placeholder={placeholder} value={form.descricao}
        onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && submit()}
        style={{ flex: 2, minWidth: 140 }} />
      <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={{ flex: 1.5, minWidth: 120 }}>
        {categorias.map(c => <option key={c}>{c}</option>)}
      </select>
      <input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={form.valor}
        onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
        onKeyDown={e => e.key === 'Enter' && submit()}
        style={{ width: 110, textAlign: 'right' }} />
      <Btn variant={valid ? 'primary' : 'ghost'} onClick={submit} disabled={!valid} style={{ background: valid ? accent : undefined }}>
        <Plus size={14} /> Adicionar
      </Btn>
    </div>
  );
};

// ─── TABELA ITENS ────────────────────────────────────────────────────────────
const ItemTable = ({ items, onSave, onDelete, categorias, colorAccent, emptyMsg }) => {
  if (!items?.length) return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>{emptyMsg}</div>
  );

  const tardios = items.filter(i => i._tardio);
  const outros = items.filter(i => !i._tardio);
  const tardioTotal = tardios.reduce((s, i) => s + i.valor, 0);

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid var(--border2)' }}>
          {['Descrição','Categoria','Valor',''].map(h => (
            <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Valor' ? 'right' : h === '' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {outros.map(item => item._auto ? (
          <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--green-dim)' }}>
            <td style={{ padding: '9px 8px', fontSize: 13 }}>
              <span style={{ marginRight: 6 }}>🔗</span>
              {item.descricao}
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: 'var(--green)' }}>AUTO</span>
            </td>
            <td style={{ padding: '9px 8px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>{item.categoria}</span>
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: colorAccent, fontWeight: 700 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>via checklist</span>
            </td>
          </tr>
        ) : (
          <EditableRow key={item.id} item={item} categorias={categorias}
            colorAccent={colorAccent}
            onSave={patch => onSave(item.id, patch)}
            onDelete={() => onDelete(item.id)} />
        ))}
        {tardios.length > 0 && (
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(99,102,241,0.07)' }}>
            <td style={{ padding: '9px 8px', fontSize: 13 }}>
              <Clock size={12} style={{ marginRight: 6, verticalAlign: 'middle', color: '#818cf8' }} />
              Atrasados
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)' }}>({tardios.length} pagamento{tardios.length > 1 ? 's' : ''})</span>
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#818cf8' }}>TARDIO</span>
            </td>
            <td style={{ padding: '9px 8px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>Taxa de Condomínio</span>
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tardioTotal)}
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>via inadimp.</span>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

// ─── PENDÊNCIAS ──────────────────────────────────────────────────────────────
const PendenciasSection = ({ pendencias, onAdd, onToggle, onDelete }) => {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ descricao: '', tipo: 'a_pagar', valor: '' });

  const submit = () => {
    if (!form.descricao.trim()) return;
    onAdd({ ...form, valor: parseFloat(form.valor) || 0 });
    setForm({ descricao: '', tipo: 'a_pagar', valor: '' });
    setModal(false);
  };

  const abertas = pendencias?.filter(p => !p.resolvida) || [];
  const resolvidas = pendencias?.filter(p => p.resolvida) || [];

  return (
    <Card style={{ marginTop: 16 }}>
      <SectionHeader action={<Btn size="sm" variant="ghost" onClick={() => setModal(true)}><Plus size={12} /> Nova Pendência</Btn>}>
        ⚠️ Pendências ({abertas.length} abertas)
      </SectionHeader>

      {pendencias?.length === 0 && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>Nenhuma pendência registrada</div>
      )}

      {abertas.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => onToggle(p.id)} style={{ background: 'none', border: '2px solid var(--border2)', borderRadius: 4, width: 20, height: 20, cursor: 'pointer', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13 }}>{p.descricao}</span>
            {p.valor > 0 && <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: 12, color: p.tipo === 'a_pagar' ? 'var(--red)' : 'var(--green)' }}>{fmt(p.valor)}</span>}
          </div>
          <Badge color={p.tipo === 'a_pagar' ? 'red' : 'green'}>{p.tipo === 'a_pagar' ? 'A pagar' : 'A receber'}</Badge>
          <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><Trash2 size={13} /></button>
        </div>
      ))}

      {resolvidas.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--muted)', fontSize: 12, padding: '6px 0' }}>
            {resolvidas.length} resolvida(s)
          </summary>
          {resolvidas.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', opacity: 0.5 }}>
              <CheckCircle2 size={16} color="var(--green)" />
              <span style={{ fontSize: 12, textDecoration: 'line-through' }}>{p.descricao}</span>
              <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', marginLeft: 'auto' }}><Trash2 size={12} /></button>
            </div>
          ))}
        </details>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Pendência">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Descrição da pendência" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={{ flex: 1 }}>
              <option value="a_pagar">A Pagar</option>
              <option value="a_receber">A Receber</option>
            </select>
            <input type="number" step="0.01" min="0" placeholder="Valor (opcional)" value={form.valor}
              onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={{ flex: 1, textAlign: 'right' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={submit}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </Card>
  );
};

// ─── PONTUALIDADE (somente visualização — controlada pelo checklist) ──────────
const PontualidadeResumo = ({ pont }) => {
  const total = pont.total_unidades || PONTUALIDADE_TOTAL_UNIDADES;
  const naoPago = Math.max(total - pont.pago_ate_dia10 - pont.pago_apos_dia10, 0);
  return (
    <Card style={{ marginTop: 16 }}>
      <SectionHeader>🏷 Resumo de Pontualidade</SectionHeader>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14 }}>
        Atualizado automaticamente pelo checklist de apartamentos abaixo.
      </p>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { label: 'Total Unidades', value: total, color: 'var(--blue)' },
          { label: 'Pago até dia 10', value: pont.pago_ate_dia10, color: 'var(--green)' },
          { label: 'Pago após dia 10', value: pont.pago_apos_dia10, color: 'var(--yellow)' },
          { label: 'Não pago', value: naoPago, color: naoPago > 0 ? 'var(--red)' : 'var(--muted)' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ProgressBar value={pont.pago_ate_dia10} max={total} color="var(--green)"
          label={`✅ Pago até dia 10 (${total > 0 ? ((pont.pago_ate_dia10 / total) * 100).toFixed(1) : 0}%)`}
          sub={`${pont.pago_ate_dia10}/${total}`} />
        {pont.pago_apos_dia10 > 0 && (
          <ProgressBar value={pont.pago_apos_dia10} max={total} color="var(--yellow)"
            label={`⏰ Pago após dia 10 (${((pont.pago_apos_dia10 / total) * 100).toFixed(1)}%)`}
            sub={`${pont.pago_apos_dia10}/${total}`} />
        )}
        {naoPago > 0 && (
          <ProgressBar value={naoPago} max={total} color="var(--red)"
            label={`❌ Não pago (${((naoPago / total) * 100).toFixed(1)}%)`}
            sub={`${naoPago}/${total}`} />
        )}
      </div>
    </Card>
  );
};

// ─── SALDO INPUT ─────────────────────────────────────────────────────────────
const fmtSaldo = v => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const SaldoInput = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  const handleFocus = () => {
    setRaw(parseFloat((value || 0).toFixed(2)).toString().replace('.', ','));
    setFocused(true);
  };
  const handleChange = e => setRaw(e.target.value);
  const handleBlur = () => {
    const num = parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
    onChange(num);
    setFocused(false);
  };

  return (
    <input
      type="text"
      value={focused ? raw : fmtSaldo(value)}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{ width: 160, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}
    />
  );
};

// ─── INADIMPLENTES ACUMULADOS — grid estilo mapa de pagamentos ───────────────
const InadimplentesAcumulados = ({ anoAtual, mesAtual, store }) => {
  const contatos = store.data?.config?.contatos || {};
  const taxa = store.data?.config?.taxa_condominio || 50;
  const mesAtualData = store.getMes(anoAtual, mesAtual);

  // Set "apto_mesRef_anoRef" de tardios já registrados neste mês
  const tardiosAqui = new Set(
    (mesAtualData?.receitas || [])
      .filter(r => r._tardio)
      .map(r => `${r._apto}_${r._mes_ref}_${r._ano_ref}`)
  );

  const todosAptos = getAllAptos().filter(k => !contatos[k]?.inabitavel);

  // Colunas: meses anteriores que têm pelo menos 1 apt pendente
  const colunas = [];
  for (const [anoStr, anoData] of Object.entries(store.data?.anos || {}).sort()) {
    const anoNum = parseInt(anoStr);
    for (const [mesStr, mesData] of Object.entries(anoData.meses || {}).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
      const mesNum = parseInt(mesStr);
      if (anoNum > anoAtual || (anoNum === anoAtual && mesNum >= mesAtual)) continue;
      const { pagamentos_aptos = {}, pagamentos_tardios = {} } = mesData;
      if (todosAptos.some(k => !pagamentos_aptos[k]))
        colunas.push({ anoRef: anoNum, mesRef: mesNum, pagamentos_aptos, pagamentos_tardios });
    }
  }

  if (!colunas.length) return null;

  // Linhas: apenas aptos com pelo menos 1 mês pendente
  const linhas = todosAptos.filter(k => colunas.some(c => !c.pagamentos_aptos[k]));
  if (!linhas.length) return null;

  const totalPendentes = colunas.reduce((s, { anoRef, mesRef, pagamentos_aptos, pagamentos_tardios }) =>
    s + todosAptos.filter(k =>
      !pagamentos_aptos[k] && !pagamentos_tardios[k] && !tardiosAqui.has(`${k}_${mesRef}_${anoRef}`)
    ).length, 0
  );

  return (
    <Card style={{ marginTop: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
      <SectionHeader>
        <Clock size={13} style={{ display: 'inline', marginRight: 6, color: '#818cf8' }} />
        <span style={{ color: '#a5b4fc' }}>Inadimplências Anteriores</span>
        {totalPendentes > 0 && (
          <span style={{ marginLeft: 8, fontSize: 10, background: 'rgba(239,68,68,0.15)', color: 'var(--red)', padding: '1px 7px', borderRadius: 20, fontWeight: 800 }}>
            {totalPendentes} pendente{totalPendentes > 1 ? 's' : ''}
          </span>
        )}
      </SectionHeader>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
        Clique na célula para registrar/desfazer pagamento de mês anterior. A receita entra neste mês.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 'max-content' }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 12px 4px 4px', textAlign: 'left', color: 'var(--muted)', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>
                Apartamento
              </th>
              {colunas.map(({ anoRef, mesRef }) => (
                <th key={`${anoRef}-${mesRef}`} style={{ padding: '5px 4px', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap', minWidth: 44 }}>
                  <div style={{ fontSize: 10, color: 'var(--text)', opacity: 0.85 }}>{MESES[mesRef - 1]}</div>
                  <div style={{ fontSize: 9, color: '#818cf8', fontWeight: 600 }}>{String(anoRef).slice(2)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(key => {
              const contato = contatos[key] || {};
              return (
                <tr key={key}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '3px 12px 3px 4px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, position: 'sticky', left: 0, background: 'inherit', zIndex: 1, borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {key}
                    {contato.nome && <span style={{ marginLeft: 6, fontFamily: 'var(--font-ui)', fontWeight: 400, fontSize: 10, color: 'var(--muted)' }}>{contato.nome}</span>}
                  </td>
                  {colunas.map(({ anoRef, mesRef, pagamentos_aptos, pagamentos_tardios }) => {
                    if (pagamentos_aptos[key]) {
                      // Pagou no prazo neste mês — célula vazia
                      return <td key={`${anoRef}-${mesRef}`} style={{ padding: '3px 4px' }}><div style={{ width: 16, height: 16, margin: '0 auto' }} /></td>;
                    }
                    const tardioOutro = pagamentos_tardios[key];
                    const pagoAqui = tardiosAqui.has(`${key}_${mesRef}_${anoRef}`);

                    if (tardioOutro && !pagoAqui) {
                      // Pago em outro mês — cinza com ✓
                      return (
                        <td key={`${anoRef}-${mesRef}`} style={{ padding: '3px 4px', textAlign: 'center' }}>
                          <div title={`Pago em ${MESES[tardioOutro.mes_pago - 1]}/${tardioOutro.ano_pago}`}
                            style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(99,102,241,0.22)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#818cf8', fontWeight: 800 }}>
                            ✓
                          </div>
                        </td>
                      );
                    }

                    // Pendente ou registrado neste mês — clicável
                    return (
                      <td key={`${anoRef}-${mesRef}`} style={{ padding: '3px 4px', textAlign: 'center' }}>
                        <div
                          title={pagoAqui
                            ? `Clique para desfazer — ${MESES_FULL[mesRef - 1]}/${anoRef}`
                            : `Registrar pagamento — ${MESES_FULL[mesRef - 1]}/${anoRef} · R$ ${taxa.toFixed(2)}`}
                          onClick={() => pagoAqui
                            ? store.desfazerPagamentoTardio(anoAtual, mesAtual, key, anoRef, mesRef)
                            : store.registrarPagamentoTardio(anoAtual, mesAtual, key, anoRef, mesRef)
                          }
                          style={{
                            width: 16, height: 16, borderRadius: 4,
                            background: pagoAqui ? '#6366f1' : 'rgba(239,68,68,0.65)',
                            margin: '0 auto', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, color: '#fff', fontWeight: 800,
                          }}>
                          {pagoAqui && '✓'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
        {[
          { bg: 'rgba(239,68,68,0.65)', label: 'Pendente — clique para registrar' },
          { bg: '#6366f1', label: 'Registrado neste mês — clique para desfazer' },
          { bg: 'rgba(99,102,241,0.22)', label: 'Pago em outro mês' },
        ].map(({ bg, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── MAIN MES VIEW ───────────────────────────────────────────────────────────
export default function MesView({ mesData, ano, mes, store, onDeleted }) {
  const { confirm, Dialog } = useConfirm();
  const totais = calcTotais(mesData);

  const handleDeleteMes = async () => {
    const ok = await confirm('Tem certeza que deseja excluir todos os dados deste mês?');
    if (ok) {
      onDeleted();
      store.deleteMes(ano, mes);
    }
  };

  const pagamentosAptos = mesData.pagamentos_aptos || {};

  return (
    <div className="fade-in">
      <Dialog />

      {/* HEADER DO MÊS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
            {MESES_FULL[mes - 1]} {ano}
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            Saldo inicial: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 700 }}>{fmt(mesData.saldo_inicial)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="ghost" size="sm" onClick={() => gerarRelatorioPDF(mesData, store.data?.config)}>
            <FileDown size={13} /> PDF
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => exportCSV(mesData, store.data?.config)}>
            <FileDown size={13} /> CSV
          </Btn>
          <Btn variant="ghost" size="sm" onClick={handleDeleteMes} style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}>
            <Trash2 size={13} /> Excluir mês
          </Btn>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KPI icon="🏦" label="Saldo Inicial" value={fmt(mesData.saldo_inicial)} color="var(--blue)" />
        <KPI icon="💰" label="Total Receitas" value={fmt(totais.totalReceitas)} color="var(--green)" />
        <KPI icon="📤" label="Total Despesas" value={fmt(totais.totalDespesas)} color="var(--red)" />
        <KPI icon="⚡" label="Mov. Líquido" value={fmt(totais.movLiquido)}
          color={totais.movLiquido >= 0 ? 'var(--green)' : 'var(--red)'}
          sub={totais.movLiquido >= 0 ? '✅ Superávit' : '⚠️ Déficit'} />
        <KPI icon="🏦" label="Saldo Final" value={fmt(totais.saldoFinal)} color="var(--blue)" />
      </div>

      {/* SALDO INICIAL (EDITÁVEL) */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
            Saldo Inicial do Mês (R$)
          </label>
          <SaldoInput
            value={mesData.saldo_inicial}
            onChange={v => store.updateMes(ano, mes, { saldo_inicial: v })}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Edite apenas se o saldo não foi carregado automaticamente.</span>
        </div>
      </Card>

      {/* RECEITAS + DESPESAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* RECEITAS */}
        <Card>
          <SectionHeader>💰 Receitas</SectionHeader>
          <ItemTable
            items={mesData.receitas}
            categorias={CATEGORIAS_RECEITA}
            colorAccent="var(--green)"
            emptyMsg="Nenhuma receita registrada"
            onSave={(id, patch) => store.updateReceita(ano, mes, id, patch)}
            onDelete={(id) => store.deleteReceita(ano, mes, id)}
          />
          <div style={{ borderTop: '2px solid var(--border2)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
            <span style={{ color: 'var(--green)', fontSize: 16 }}>{fmt(totais.totalReceitas)}</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <AddItemForm categorias={CATEGORIAS_RECEITA} accent="var(--green)"
              placeholder="Ex: Atrasados, Multas..."
              onAdd={(item) => store.addReceita(ano, mes, item)} />
          </div>
        </Card>

        {/* DESPESAS */}
        <Card>
          <SectionHeader>📤 Despesas</SectionHeader>
          <ItemTable
            items={mesData.despesas}
            categorias={CATEGORIAS_DESPESA}
            colorAccent="var(--red)"
            emptyMsg="Nenhuma despesa registrada"
            onSave={(id, patch) => store.updateDespesa(ano, mes, id, patch)}
            onDelete={(id) => store.deleteDespesa(ano, mes, id)}
          />
          <div style={{ borderTop: '2px solid var(--border2)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Total</span>
            <span style={{ color: 'var(--red)', fontSize: 16 }}>{fmt(totais.totalDespesas)}</span>
          </div>
          {/* Orçamento vs Realizado por categoria */}
          {Object.keys(store.data?.config?.orcamento || {}).length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Orçamento vs. Realizado</div>
              {Object.entries(store.data.config.orcamento).map(([cat, budget]) => {
                const gasto = mesData.despesas.filter(d => d.categoria === cat).reduce((s, d) => s + d.valor, 0);
                const pct = budget > 0 ? Math.min((gasto / budget) * 100, 100) : 0;
                const over = gasto > budget;
                return (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: 'var(--muted)' }}>{cat}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: over ? 'var(--red)' : 'var(--muted)', fontWeight: over ? 700 : 400 }}>
                        {fmt(gasto)} / {fmt(budget)}{over ? ' ⚠️' : ''}
                      </span>
                    </div>
                    <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : pct > 75 ? 'var(--yellow)' : 'var(--green)', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            <AddItemForm categorias={CATEGORIAS_DESPESA} accent="var(--red)"
              placeholder="Ex: Enel, Internet, Manutenção..."
              onAdd={(item) => store.addDespesa(ano, mes, item)} />
          </div>
        </Card>
      </div>

      {/* RESUMO DE PONTUALIDADE */}
      <PontualidadeResumo pont={mesData.pontualidade} />

      {/* CHECKLIST DE APARTAMENTOS */}
      <ApartamentosChecklist
        pagamentos={pagamentosAptos}
        pagamentos_tardios={mesData.pagamentos_tardios || {}}
        onChange={(novos) => store.updatePagamentosAptos(ano, mes, novos)}
        contatos={store.data?.config?.contatos || {}}
        taxa={store.data?.config?.taxa_condominio || 50}
        mes={mes}
        ano={ano}
        nomeCondominio={store.data?.config?.nome_condominio}
      />

      {/* PENDÊNCIAS */}
      <PendenciasSection
        pendencias={mesData.pendencias}
        onAdd={(p) => store.addPendencia(ano, mes, p)}
        onToggle={(id) => store.togglePendencia(ano, mes, id)}
        onDelete={(id) => store.deletePendencia(ano, mes, id)}
      />

      {/* NOTAS */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader><FileText size={13} style={{ display: 'inline', marginRight: 6 }} /> Observações do Mês</SectionHeader>
        <textarea
          placeholder="Registre observações importantes, decisões em assembleia, eventos relevantes..."
          value={mesData.notas}
          onChange={e => store.updateNotas(ano, mes, e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-ui)', fontSize: 13, lineHeight: 1.6 }}
        />
      </Card>

      {/* INADIMPLÊNCIAS DE MESES ANTERIORES */}
      <InadimplentesAcumulados
        anoAtual={ano}
        mesAtual={mes}
        store={store}
      />
    </div>
  );
}
