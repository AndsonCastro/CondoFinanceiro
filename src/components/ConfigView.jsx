import { useState, useRef } from 'react';
import { Settings, Upload, Download, RotateCcw, Database, Phone, Target, RefreshCw, PieChart, Plus, Trash2 } from 'lucide-react';
import { Card, Btn, SectionHeader, useConfirm } from './UI';
import { exportJSON, importJSON, CATEGORIAS_DESPESA, uid } from '../utils/data';
import { getAllAptos } from './ApartamentosChecklist';

const TODOS_APTOS = getAllAptos();

export default function ConfigView({ config, updateConfig, data, importData, resetToSeed }) {
  const [form, setForm] = useState({ ...config });
  const [msg, setMsg] = useState('');
  const [filtroApto, setFiltroApto] = useState('');
  const [contatosForm, setContatosForm] = useState(() => {
    const base = {};
    TODOS_APTOS.forEach(key => {
      base[key] = { nome: '', tel1: '', tel2: '', ...(config.contatos?.[key] || {}) };
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

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const handleSave = () => {
    updateConfig(form);
    showMsg('✅ Configurações salvas!');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflowY: 'auto' }}>
          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 90px', gap: 8, padding: '4px 8px' }}>
            {['Apto', 'Nome do Condômino', 'Telefone 1', 'Telefone 2', 'Inabitável'].map(h => (
              <span key={h} style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textAlign: h === 'Inabitável' ? 'center' : 'left' }}>{h}</span>
            ))}
          </div>
          {TODOS_APTOS.filter(key => key.toLowerCase().includes(filtroApto.toLowerCase())).map(key => {
            const inabitavel = contatosForm[key]?.inabitavel || false;
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 90px', gap: 8, alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: inabitavel ? 'rgba(255,77,109,0.07)' : 'var(--surface2)', opacity: inabitavel ? 0.7 : 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: inabitavel ? 'var(--red)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{key}</span>
                <input
                  placeholder="Ex: João Silva"
                  value={contatosForm[key]?.nome || ''}
                  onChange={e => updateContato(key, 'nome', e.target.value)}
                  disabled={inabitavel}
                  style={{ fontSize: 12, padding: '5px 8px', opacity: inabitavel ? 0.4 : 1 }}
                />
                <input
                  placeholder="Ex: 11999999999"
                  value={contatosForm[key]?.tel1 || ''}
                  onChange={e => updateContato(key, 'tel1', e.target.value)}
                  disabled={inabitavel}
                  style={{ fontSize: 12, padding: '5px 8px', fontFamily: 'var(--font-mono)', opacity: inabitavel ? 0.4 : 1 }}
                />
                <input
                  placeholder="Opcional"
                  value={contatosForm[key]?.tel2 || ''}
                  onChange={e => updateContato(key, 'tel2', e.target.value)}
                  disabled={inabitavel}
                  style={{ fontSize: 12, padding: '5px 8px', fontFamily: 'var(--font-mono)', opacity: inabitavel ? 0.4 : 1 }}
                />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={inabitavel}
                    onChange={e => updateContato(key, 'inabitavel', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--red)' }}
                  />
                </div>
              </div>
            );
          })}
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
