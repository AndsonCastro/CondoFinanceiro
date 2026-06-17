import { useState, useRef } from 'react';
import { Settings, Upload, Download, RotateCcw, Database, Phone, Target, RefreshCw, PieChart, Plus, Trash2, MessageCircle, BookOpen } from 'lucide-react';
import { Card, Btn, SectionHeader, useConfirm } from './UI';
import { exportJSON, importJSON, CATEGORIAS_DESPESA, uid } from '../utils/data';
import { exportarParaObsidian } from '../utils/obsidian';
import { getAllAptos } from './ApartamentosChecklist';

const TODOS_APTOS = getAllAptos().sort((a, b) => {
  const [, bA, aA] = a.match(/^B(\d+)-(\d+)$/) || [];
  const [, bB, aB] = b.match(/^B(\d+)-(\d+)$/) || [];
  return parseInt(bA) - parseInt(bB) || parseInt(aA) - parseInt(aB);
});

export default function ConfigView({ config, updateConfig, data, importData, resetToSeed }) {
  const [form, setForm] = useState({ ...config });
  const [msg, setMsg] = useState('');
  const [filtroApto, setFiltroApto] = useState('');
  const [contatosForm, setContatosForm] = useState(() => {
    const base = {};
    TODOS_APTOS.forEach(key => {
      base[key] = { nome: '', tel1: '', tel2: '', proprietario: '', contato1: '', contato2: '', inabitavel: false, isento: false, responsavel: false, vencimento: '', historico_inad_meses: 0, ...(config.contatos?.[key] || {}) };
    });
    return base;
  });
  const [orcamentoForm, setOrcamentoForm] = useState(() => {
    const base = {};
    CATEGORIAS_DESPESA.forEach(c => { base[c] = config.orcamento?.[c] || ''; });
    return base;
  });
  const [recorrentesForm, setRecorrentesForm] = useState(config.despesas_recorrentes || []);
  const [novaRec, setNovaRec] = useState({ descricao: '', categoria: CATEGORIAS_DESPESA[0], valor: '' });
  const fileRef = useRef();
  const { confirm, Dialog } = useConfirm();
  const [avisoMsg, setAvisoMsg] = useState(() => localStorage.getItem('condo_aviso_msg') || 'Olá! Passando para deixar um aviso importante sobre o condomínio.');
  const [avisoModal, setAvisoModal] = useState(null);
  const [avisoTarget, setAvisoTarget] = useState('condomino'); // 'condomino' | 'proprietario'

  const updateContato = (key, field, value) => {
    setContatosForm(f => ({ ...f, [key]: { ...f[key], [field]: value } }));
  };

  const handleSaveContatos = () => {
    updateConfig({ contatos: contatosForm });
    showMsg('✅ Contatos salvos!');
  };

  const handleSaveOrcamento = () => {
    const clean = {};
    Object.entries(orcamentoForm).forEach(([k, v]) => { if (parseFloat(v) > 0) clean[k] = parseFloat(v); });
    updateConfig({ orcamento: clean });
    showMsg('✅ Orçamento salvo!');
  };

  const handleAddRecorrente = () => {
    if (!novaRec.descricao.trim() || !parseFloat(novaRec.valor)) return;
    const nova = { ...novaRec, valor: parseFloat(novaRec.valor), id: uid() };
    const novas = [...recorrentesForm, nova];
    setRecorrentesForm(novas);
    updateConfig({ despesas_recorrentes: novas });
    setNovaRec({ descricao: '', categoria: CATEGORIAS_DESPESA[0], valor: '' });
    showMsg('✅ Despesa recorrente adicionada!');
  };

  const handleRemoveRecorrente = (id) => {
    const novas = recorrentesForm.filter(r => r.id !== id);
    setRecorrentesForm(novas);
    updateConfig({ despesas_recorrentes: novas });
  };

  const handleAvisoSend = () => {
    const row = contatosForm[avisoModal] || {};
    const tel = avisoTarget === 'condomino'
      ? (row.tel1 || '').replace(/\D/g, '')
      : (row.contato1 || '').replace(/\D/g, '');
    localStorage.setItem('condo_aviso_msg', avisoMsg);
    if (tel) window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(avisoMsg)}`, '_blank');
    setAvisoModal(null);
  };

  const hoje = new Date();
  const [taxaVigencia, setTaxaVigencia] = useState({ mes: hoje.getMonth() + 1, ano: hoje.getFullYear() });

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleSave = () => {
    updateConfig(form, { vigenteAno: taxaVigencia.ano, vigenteMes: taxaVigencia.mes });
    showMsg('✅ Configurações salvas!');
  };

  const handleExportObsidian = async () => {
    try {
      const total = await exportarParaObsidian(data);
      showMsg(`✅ ${total} arquivos exportados para o Obsidian!`);
    } catch (e) {
      if (e.name !== 'AbortError') showMsg('❌ ' + e.message);
    }
  };

  const handleExport = () => {
    const exportData = {
      exportado_em: new Date().toISOString(),
      versao: '1.0',
      config: data.config,
      anos: data.anos,
    };
    exportJSON(exportData, `condo_backup_${new Date().toISOString().slice(0,10)}.json`);
    showMsg('✅ Backup exportado!');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirm('Importar vai substituir TODOS os dados atuais. Continuar?');
    if (!ok) return;
    importJSON(file, (imported) => {
      importData(imported);
      showMsg('✅ Dados importados com sucesso!');
    }, (err) => showMsg('❌ ' + err));
    e.target.value = '';
  };

  const handleReset = async () => {
    const ok = await confirm('Isso vai resetar para os dados da planilha original (2021-2022). Tem certeza?');
    if (ok) { resetToSeed(); showMsg('✅ Dados resetados para o histórico original.'); }
  };

  return (
    <div className="fade-in">
      <Dialog />

      {avisoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 480, maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>
              Aviso via WhatsApp — {avisoModal} &nbsp;
              <span style={{ fontSize: 11, fontWeight: 600, color: avisoTarget === 'condomino' ? 'var(--blue)' : 'var(--yellow)', background: avisoTarget === 'condomino' ? 'var(--surface2)' : 'rgba(234,179,8,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                {avisoTarget === 'condomino' ? 'Condômino' : 'Proprietário'}
              </span>
            </h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
              {avisoTarget === 'condomino'
                ? (contatosForm[avisoModal]?.nome ? `${contatosForm[avisoModal].nome} · Tel: ${contatosForm[avisoModal].tel1 || '—'}` : 'Sem nome cadastrado.')
                : (contatosForm[avisoModal]?.proprietario ? `${contatosForm[avisoModal].proprietario} · Contato: ${contatosForm[avisoModal].contato1 || '—'}` : 'Sem proprietário cadastrado.')}
            </p>
            <textarea
              value={avisoMsg}
              onChange={e => setAvisoMsg(e.target.value)}
              rows={5}
              style={{ width: '100%', resize: 'vertical', fontSize: 13, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-ui)', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setAvisoModal(null)} style={{ padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              <button onClick={handleAvisoSend} disabled={avisoTarget === 'condomino' ? !contatosForm[avisoModal]?.tel1 : !contatosForm[avisoModal]?.contato1} style={{ padding: '8px 16px', background: '#1a3a1a', border: '1px solid #25D366', borderRadius: 7, color: '#25D366', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={14} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={22} /> Configurações
        </h2>
      </div>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? 'var(--green-dim)' : 'var(--red-dim)', border: `1px solid ${msg.startsWith('✅') ? 'var(--green)' : 'var(--red)'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>
          {msg}
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <SectionHeader>🏢 Dados do Condomínio</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Nome do Condomínio</label>
            <input value={form.nome_condominio} onChange={e => setForm(f => ({ ...f, nome_condominio: e.target.value }))} style={{ width: '100%' }} placeholder="Ex: Residencial Jardins" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Taxa de Condomínio (R$)</label>
            <input type="number" min="0" step="0.01" value={form.taxa_condominio ?? 50}
              onChange={e => setForm(f => ({ ...f, taxa_condominio: parseFloat(e.target.value) || 0 }))}
              style={{ width: 120 }} />
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 12 }}>Valor cobrado por unidade no checklist de pagamentos.</p>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Vigente a partir de</label>
              <select value={taxaVigencia.mes} onChange={e => setTaxaVigencia(v => ({ ...v, mes: parseInt(e.target.value) }))} style={{ fontSize: 12, padding: '4px 8px' }}>
                {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
              <input type="number" min="2020" max="2099" value={taxaVigencia.ano}
                onChange={e => setTaxaVigencia(v => ({ ...v, ano: parseInt(e.target.value) || hoje.getFullYear() }))}
                style={{ width: 76, fontSize: 12, padding: '4px 8px' }} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Meses anteriores não serão alterados.</span>
            </div>
          </div>
          <Btn variant="primary" onClick={handleSave} style={{ alignSelf: 'flex-start' }}>Salvar Configurações</Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionHeader><Database size={13} style={{ display: 'inline', marginRight: 6 }} /> Backup dos Dados</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          Os dados são salvos automaticamente no navegador (localStorage). Faça backups periódicos em JSON para não perder informações.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Btn variant="primary" onClick={handleExport}>
            <Download size={14} /> Exportar Backup (.json)
          </Btn>
          <Btn variant="ghost" onClick={() => fileRef.current.click()}>
            <Upload size={14} /> Importar Backup (.json)
          </Btn>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionHeader><BookOpen size={13} style={{ display: 'inline', marginRight: 6 }} /> Obsidian — Mente Compartilhada</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          Exporta relatórios mensais, resumos anuais e contatos dos apartamentos como notas <code>.md</code> direto para o seu vault. Selecione a pasta <strong>Condomínio</strong> dentro do vault <strong>MinhaMente</strong>.
        </p>
        <Btn variant="primary" onClick={handleExportObsidian} style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.5)', color: '#a78bfa' }}>
          <BookOpen size={14} /> Sincronizar com Obsidian
        </Btn>
      </Card>

      {/* FUNDO DE RESERVA */}
      <Card style={{ marginBottom: 16 }}>
        <SectionHeader><Target size={13} style={{ display: 'inline', marginRight: 6 }} /> Fundo de Reserva</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Defina uma meta de saldo acumulado. O progresso aparece no dashboard anual.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Meta do Fundo de Reserva (R$)</label>
            <input type="number" min="0" step="100" value={form.fundo_reserva_meta || ''}
              onChange={e => setForm(f => ({ ...f, fundo_reserva_meta: parseFloat(e.target.value) || 0 }))}
              placeholder="Ex: 20000" style={{ width: '100%' }} />
          </div>
          <Btn variant="primary" onClick={() => { updateConfig({ fundo_reserva_meta: form.fundo_reserva_meta || 0 }); showMsg('✅ Meta salva!'); }} style={{ alignSelf: 'flex-end' }}>
            Salvar Meta
          </Btn>
        </div>
      </Card>

      {/* ORÇAMENTO POR CATEGORIA */}
      <Card style={{ marginBottom: 16 }}>
        <SectionHeader><PieChart size={13} style={{ display: 'inline', marginRight: 6 }} /> Orçamento Mensal por Categoria</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Defina limites de gasto por categoria. No mês, aparece uma barra mostrando o consumido vs. orçado.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {CATEGORIAS_DESPESA.map(cat => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ flex: 1, fontSize: 12, color: 'var(--muted)' }}>{cat}</label>
              <input type="number" min="0" step="10" value={orcamentoForm[cat] || ''}
                onChange={e => setOrcamentoForm(f => ({ ...f, [cat]: e.target.value }))}
                placeholder="R$ 0" style={{ width: 100, textAlign: 'right', fontSize: 12, padding: '5px 8px' }} />
            </div>
          ))}
        </div>
        <Btn variant="primary" onClick={handleSaveOrcamento} style={{ alignSelf: 'flex-start' }}>Salvar Orçamento</Btn>
      </Card>

      {/* DESPESAS RECORRENTES */}
      <Card style={{ marginBottom: 16 }}>
        <SectionHeader><RefreshCw size={13} style={{ display: 'inline', marginRight: 6 }} /> Despesas Recorrentes</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Cadastre despesas fixas mensais. Elas serão adicionadas automaticamente ao criar um novo mês.
        </p>
        {recorrentesForm.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {recorrentesForm.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ flex: 1, fontSize: 13 }}>{r.descricao}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 4 }}>{r.categoria}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--red)', fontWeight: 700, minWidth: 70, textAlign: 'right' }}>
                  {r.valor > 0 ? `R$ ${r.valor.toFixed(2)}` : 'variável'}
                </span>
                <button onClick={() => handleRemoveRecorrente(r.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
          <input placeholder="Descrição (ex: Internet)" value={novaRec.descricao}
            onChange={e => setNovaRec(f => ({ ...f, descricao: e.target.value }))}
            style={{ flex: 2, minWidth: 120, fontSize: 12 }} />
          <select value={novaRec.categoria} onChange={e => setNovaRec(f => ({ ...f, categoria: e.target.value }))} style={{ flex: 1.5, minWidth: 120, fontSize: 12 }}>
            {CATEGORIAS_DESPESA.map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="number" step="0.01" min="0" placeholder="R$ valor" value={novaRec.valor}
            onChange={e => setNovaRec(f => ({ ...f, valor: e.target.value }))}
            style={{ width: 100, textAlign: 'right', fontSize: 12 }} />
          <Btn variant="primary" onClick={handleAddRecorrente}><Plus size={13} /> Adicionar</Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <SectionHeader><Phone size={13} style={{ display: 'inline', marginRight: 6 }} /> Contatos dos Apartamentos</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
          Cadastre nome e telefone(s) de cada apartamento para enviar cobranças via WhatsApp no dia do vencimento.
        </p>
        <input
          placeholder="Filtrar apartamento (ex: B3, 201...)"
          value={filtroApto}
          onChange={e => setFiltroApto(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
        />
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1240 }}>
            {/* Cabeçalho */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 120px 120px 36px 1fr 120px 120px 36px 75px 65px 55px 85px 60px', gap: 6, padding: '4px 8px 8px', marginBottom: 4, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Apto</span>
              <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700, letterSpacing: 1 }}>— CONDÔMINO —</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Telefone 1</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Telefone 2</span>
              <span style={{ fontSize: 10, color: '#25D366', fontWeight: 700, letterSpacing: 1, textAlign: 'center' }}>WPP</span>
              <span style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700, letterSpacing: 1 }}>— PROPRIETÁRIO —</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Contato 1</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Contato 2</span>
              <span style={{ fontSize: 10, color: '#25D366', fontWeight: 700, letterSpacing: 1, textAlign: 'center' }}>WPP</span>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>Inabit.</span>
              <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>Isento</span>
              <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>Venc.</span>
              <span style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>Responsável</span>
              <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }} title="Meses inadimplentes antes de Mai/2026">Hist. Inad.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {TODOS_APTOS.filter(key => key.toLowerCase().includes(filtroApto.toLowerCase())).map(key => {
                const inabitavel = contatosForm[key]?.inabitavel || false;
                const isento = contatosForm[key]?.isento || false;
                const responsavel = contatosForm[key]?.responsavel || false;
                const row = contatosForm[key] || {};
                const disabled = inabitavel || isento;
                const rowBg = inabitavel ? 'rgba(255,77,109,0.07)' : isento ? 'rgba(16,217,150,0.05)' : 'var(--surface2)';
                const keyColor = inabitavel ? 'var(--red)' : isento ? 'var(--green)' : 'var(--muted)';
                const wppBtn = (hasPhone, target) => hasPhone && !inabitavel ? (
                  <button
                    onClick={() => { setAvisoTarget(target); setAvisoModal(key); }}
                    title={`Enviar aviso para ${target === 'condomino' ? 'Condômino' : 'Proprietário'}`}
                    style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a3a1a', color: '#25D366', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#25D36633'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#1a3a1a'; }}
                  >
                    <MessageCircle size={13} />
                  </button>
                ) : null;
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 120px 120px 36px 1fr 120px 120px 36px 75px 65px 55px 85px 60px', gap: 6, alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: rowBg, opacity: disabled ? 0.7 : 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: keyColor, fontFamily: 'var(--font-mono)' }}>{key}</span>
                    <input value={row.nome || ''} onChange={e => updateContato(key, 'nome', e.target.value)} disabled={disabled} style={{ fontSize: 12, padding: '5px 8px', opacity: disabled ? 0.4 : 1 }} />
                    <input value={row.tel1 || ''} onChange={e => updateContato(key, 'tel1', e.target.value)} disabled={disabled} style={{ fontSize: 12, padding: '5px 8px', fontFamily: 'var(--font-mono)', opacity: disabled ? 0.4 : 1 }} />
                    <input placeholder="Opcional" value={row.tel2 || ''} onChange={e => updateContato(key, 'tel2', e.target.value)} disabled={disabled} style={{ fontSize: 12, padding: '5px 8px', fontFamily: 'var(--font-mono)', opacity: disabled ? 0.4 : 1 }} />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>{wppBtn(!!row.tel1, 'condomino')}</div>
                    <input value={row.proprietario || ''} onChange={e => updateContato(key, 'proprietario', e.target.value)} disabled={disabled} style={{ fontSize: 12, padding: '5px 8px', opacity: disabled ? 0.4 : 1 }} />
                    <input value={row.contato1 || ''} onChange={e => updateContato(key, 'contato1', e.target.value)} disabled={disabled} style={{ fontSize: 12, padding: '5px 8px', fontFamily: 'var(--font-mono)', opacity: disabled ? 0.4 : 1 }} />
                    <input placeholder="Opcional" value={row.contato2 || ''} onChange={e => updateContato(key, 'contato2', e.target.value)} disabled={disabled} style={{ fontSize: 12, padding: '5px 8px', fontFamily: 'var(--font-mono)', opacity: disabled ? 0.4 : 1 }} />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>{wppBtn(!!row.contato1, 'proprietario')}</div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input type="checkbox" checked={inabitavel} onChange={e => updateContato(key, 'inabitavel', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--red)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input type="checkbox" checked={isento} onChange={e => updateContato(key, 'isento', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--green)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="number" min="1" max="30"
                        value={row.vencimento || ''}
                        onChange={e => updateContato(key, 'vencimento', e.target.value)}
                        placeholder="10"
                        disabled={disabled}
                        title="Dia do vencimento (padrão: 10)"
                        style={{ width: 46, fontSize: 12, padding: '5px 6px', textAlign: 'center', opacity: disabled ? 0.4 : 1 }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input type="checkbox" checked={responsavel} onChange={e => updateContato(key, 'responsavel', e.target.checked)} disabled={!row.proprietario || !row.contato1} title="Proprietário é o responsável pelo pagamento da taxa" style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--yellow)', opacity: (!row.proprietario || !row.contato1) ? 0.3 : 1 }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="number" min="0" max="999"
                        value={row.historico_inad_meses || ''}
                        onChange={e => updateContato(key, 'historico_inad_meses', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                        placeholder="0"
                        title="Meses inadimplentes antes do período rastreado (antes de Mai/2026)"
                        style={{ width: 50, fontSize: 12, padding: '5px 6px', textAlign: 'center', accentColor: 'var(--red)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Btn variant="primary" onClick={handleSaveContatos}>Salvar Contatos</Btn>
        </div>
      </Card>

      <Card>
        <SectionHeader>🔄 Resetar Dados</SectionHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          Restaura os dados históricos originais da planilha <strong>Demonstrativo_de_Receitas_2022.xlsx</strong> (Jan/2021 a Set/2022). Todos os dados atuais serão substituídos.
        </p>
        <Btn variant="ghost" onClick={handleReset} style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}>
          <RotateCcw size={14} /> Restaurar Dados Originais
        </Btn>
      </Card>
    </div>
  );
}
