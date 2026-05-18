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
        {items.map(item => (item._auto || item._tardio) ? (
          <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: item._tardio ? 'rgba(99,102,241,0.07)' : 'var(--green-dim)' }}>
            <td style={{ padding: '9px 8px', fontSize: 13 }}>
              {item._tardio ? <Clock size={12} style={{ marginRight: 6, verticalAlign: 'middle', color: '#818cf8' }} /> : <span style={{ marginRight: 6 }}>🔗</span>}
              {item.descricao}
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: item._tardio ? '#818cf8' : 'var(--green)' }}>
                {item._tardio ? 'TARDIO' : 'AUTO'}
              </span>
            </td>
            <td style={{ padding: '9px 8px' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>{item.categoria}</span>
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: item._tardio ? '#a5b4fc' : colorAccent, fontWeight: 700 }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
            </td>
            <td style={{ padding: '9px 8px', textAlign: 'right' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{item._tardio ? 'via inadimp.' : 'via checklist'}</span>
            </td>
          </tr>
        ) : (
          <EditableRow key={item.id} item={item} categorias={categorias}
            colorAccent={colorAccent}
            onSave={patch => onSave(item.id, patch)}
            onDelete={() => onDelete(item.id)} />
        ))}
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

// ─── INADIMPLENTES DO MÊS ANTERIOR ──────────────────────────────────────────
const InadimplentesAnterior = ({ prevMesData, anoAtual, mesAtual, store }) => {
  if (!prevMesData) return null;
  const { mes: mesRef, ano: anoRef, pagamentos_aptos = {}, pagamentos_tardios = {} } = prevMesData;
  const contatos = store.data?.config?.contatos || {};
  const taxa = store.data?.config?.taxa_condominio || 50;

  const inadimplentes = getAllAptos().filter(key =>
    !contatos[key]?.inabitavel && !pagamentos_aptos[key]
  );
  if (!inadimplentes.length) return null;

  const mesAtualData = store.getMes(anoAtual, mesAtual);
  const pagoAqui = new Set(
    (mesAtualData?.receitas || [])
      .filter(r => r._tardio && r._mes_ref === mesRef && r._ano_ref === anoRef)
      .map(r => r._apto)
  );

  const nomeMesRef = MESES_FULL[mesRef - 1];

  return (
    <Card style={{ marginTop: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
      <SectionHeader>
        <Clock size={13} style={{ display: 'inline', marginRight: 6, color: '#818cf8' }} />
        <span style={{ color: '#a5b4fc' }}>Inadimplentes — {nomeMesRef}/{anoRef}</span>
      </SectionHeader>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
        Clique para registrar o pagamento de {nomeMesRef}/{anoRef} neste mês. A receita entra aqui; {nomeMesRef} não é alterado financeiramente.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {inadimplentes.map(key => {
          const tardioOutro = pagamentos_tardios[key];
          const pagoNesteMes = pagoAqui.has(key);
          const contato = contatos[key] || {};

          if (tardioOutro && !pagoNesteMes) {
            const tag = `${MESES[tardioOutro.mes_pago - 1]}/${tardioOutro.ano_pago}`;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(99,102,241,0.07)', borderRadius: 8, opacity: 0.7 }}>
                <CheckCircle2 size={15} color="#818cf8" />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: '#a5b4fc' }}>{key}</span>
                {contato.nome && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{contato.nome}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#818cf8' }}>Pago em {tag}</span>
              </div>
            );
          }

          return (
            <div key={key}
              onClick={() => pagoNesteMes
                ? store.desfazerPagamentoTardio(anoAtual, mesAtual, key, anoRef, mesRef)
                : store.registrarPagamentoTardio(anoAtual, mesAtual, key, anoRef, mesRef)
              }
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                background: pagoNesteMes ? 'rgba(99,102,241,0.12)' : 'var(--surface2)',
                borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${pagoNesteMes ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                border: pagoNesteMes ? 'none' : '2px solid var(--border2)',
                background: pagoNesteMes ? '#6366f1' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pagoNesteMes && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: pagoNesteMes ? '#a5b4fc' : 'var(--text)' }}>{key}</span>
              {contato.nome && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{contato.nome}</span>}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: pagoNesteMes ? '#818cf8' : 'var(--red)' }}>
                {pagoNesteMes ? '✓ Registrado' : `R$ ${taxa.toFixed(2)}`}
              </span>
            </div>
          );
        })}
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
  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const prevMesData = store.getMes(prevAno, prevMes);

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

      {/* INADIMPLENTES DO MÊS ANTERIOR */}
      <InadimplentesAnterior
        prevMesData={prevMesData}
        anoAtual={ano}
        mesAtual={mes}
        store={store}
      />

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
    </div>
  );
}
