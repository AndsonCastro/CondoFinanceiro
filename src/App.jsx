import { useState, useCallback, useRef } from 'react';
import { BarChart3, CalendarDays, Settings, Plus, ChevronDown, ChevronRight, Save, FolderOpen, AlertTriangle } from 'lucide-react';
import useStore from './hooks/useStore';
import { MESES, MESES_FULL, calcTotais, fmt, exportJSON, importJSON } from './utils/data';
import MesView from './components/MesView';
import DashboardAnual from './components/DashboardAnual';
import ConfigView from './components/ConfigView';
import InadimplenciaView from './components/InadimplenciaView';
import { Btn, Modal, Badge } from './components/UI';

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ store, nav, setNav }) {
  const anos = store.getAnos();
  const [expanded, setExpanded] = useState(() => {
    const a = store.getAnos();
    return a.length ? { [a[a.length - 1]]: true } : {};
  });
  const [modalNovoMes, setModalNovoMes] = useState(false);
  const [novoMesForm, setNovoMesForm] = useState({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 });
  const [saveMsg, setSaveMsg] = useState('');
  const fileRef = useRef();

  const handleSave = async () => {
    const payload = { exportado_em: new Date().toISOString(), versao: '1.0', config: store.data.config, anos: store.data.anos };
    const json = JSON.stringify(payload, null, 2);
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `condo_${new Date().toISOString().slice(0, 10)}.json`,
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        setSaveMsg('Salvo!');
        setTimeout(() => setSaveMsg(''), 2000);
      } catch (e) {
        if (e.name !== 'AbortError') setSaveMsg('Erro ao salvar');
      }
    } else {
      exportJSON(payload, `condo_${new Date().toISOString().slice(0, 10)}.json`);
      setSaveMsg('Salvo!');
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const handleLoad = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
        });
        const file = await handle.getFile();
        importJSON(file, (imported) => { store.importData(imported); setSaveMsg('Carregado!'); setTimeout(() => setSaveMsg(''), 2000); }, () => setSaveMsg('Erro ao carregar'));
      } catch (e) {
        if (e.name !== 'AbortError') setSaveMsg('Erro ao carregar');
      }
    } else {
      fileRef.current.click();
    }
  };

  const toggleAno = (ano) => setExpanded(e => ({ ...e, [ano]: !e[ano] }));

  const handleNovoMes = () => {
    const { ano, mes } = novoMesForm;
    store.createOrGetMes(ano, mes);
    setNav({ type: 'mes', ano, mes });
    setModalNovoMes(false);
  };

  return (
    <aside style={{
      width: 230, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>🏢 {store.config?.nome_condominio || 'Condomínio'}</div>
        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>Gestão Financeira</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflow: 'auto', padding: '12px 8px' }}>
        {/* Dashboard anual por ano */}
        {anos.map(ano => (
          <div key={ano}>
            <button onClick={() => toggleAno(ano)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none',
                background: nav.type === 'dashboard' && nav.ano === ano ? 'var(--blue-dim)' : 'transparent',
                color: nav.type === 'dashboard' && nav.ano === ano ? 'var(--blue)' : 'var(--text)',
                cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'background 0.15s' }}
              onMouseEnter={e => { if (!(nav.type === 'dashboard' && nav.ano === ano)) e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { if (!(nav.type === 'dashboard' && nav.ano === ano)) e.currentTarget.style.background = 'transparent'; }}>
              {expanded[ano] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <BarChart3 size={13} />
              <span style={{ flex: 1, textAlign: 'left' }} onClick={(e) => { e.stopPropagation(); setNav({ type: 'dashboard', ano }); }}>{ano}</span>
            </button>

            {expanded[ano] && (
              <div style={{ marginLeft: 14, marginBottom: 4 }}>
                {store.getAno(ano).map(mesData => {
                  const t = calcTotais(mesData);
                  const isActive = nav.type === 'mes' && nav.ano === ano && nav.mes === mesData.mes;
                  return (
                    <button key={mesData.id} onClick={() => setNav({ type: 'mes', ano, mes: mesData.mes })}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: 'none',
                        background: isActive ? 'var(--surface2)' : 'transparent',
                        color: isActive ? 'var(--text)' : 'var(--muted)',
                        cursor: 'pointer', fontSize: 12, transition: 'background 0.15s',
                        borderLeft: isActive ? '2px solid var(--blue)' : '2px solid transparent' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                      <CalendarDays size={11} />
                      <span style={{ flex: 1, textAlign: 'left', fontWeight: isActive ? 700 : 400 }}>{MESES[mesData.mes - 1]}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: t.movLiquido >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {t.movLiquido >= 0 ? '+' : ''}{(t.movLiquido / 1000).toFixed(1)}k
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Botão novo mês */}
        <button onClick={() => setModalNovoMes(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: '1px dashed var(--border2)',
            background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, marginTop: 8, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}>
          <Plus size={13} /> Novo Mês
        </button>
      </nav>

      {/* Save / Load */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 10px 0' }}>
        {saveMsg && (
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--green)', marginBottom: 6 }}>{saveMsg}</div>
        )}
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <button onClick={handleSave}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px 0', borderRadius: 7, border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}>
            <Save size={12} /> Salvar
          </button>
          <button onClick={handleLoad}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px 0', borderRadius: 7, border: '1px solid var(--border2)',
              background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}>
            <FolderOpen size={12} /> Carregar
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleLoad} />
        </div>
      </div>

      {/* Inadimplência link */}
      <button onClick={() => setNav({ type: 'inadimplencia' })}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
          background: nav.type === 'inadimplencia' ? 'var(--surface2)' : 'transparent', border: 'none',
          color: nav.type === 'inadimplencia' ? 'var(--red)' : 'var(--muted)', cursor: 'pointer', fontSize: 13, transition: 'background 0.15s' }}>
        <AlertTriangle size={14} /> Inadimplência
      </button>

      {/* Settings link */}
      <button onClick={() => setNav({ type: 'config' })}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px 14px',
          background: nav.type === 'config' ? 'var(--surface2)' : 'transparent', border: 'none',
          color: nav.type === 'config' ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontSize: 13, transition: 'background 0.15s' }}>
        <Settings size={14} /> Configurações
      </button>

      {/* Modal novo mês */}
      <Modal open={modalNovoMes} onClose={() => setModalNovoMes(false)} title="Adicionar Novo Mês">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Mês</label>
              <select value={novoMesForm.mes} onChange={e => setNovoMesForm(f => ({ ...f, mes: parseInt(e.target.value) }))} style={{ width: '100%' }}>
                {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Ano</label>
              <input type="number" value={novoMesForm.ano} min="2020" max="2099"
                onChange={e => setNovoMesForm(f => ({ ...f, ano: parseInt(e.target.value) || new Date().getFullYear() }))}
                style={{ width: '100%' }} />
            </div>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            O saldo inicial será calculado automaticamente a partir do saldo final do mês anterior.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalNovoMes(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={handleNovoMes}>Criar Mês</Btn>
          </div>
        </div>
      </Modal>
    </aside>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const store = useStore();
  const anos = store.getAnos();

  const [nav, setNav] = useState(() => {
    if (!anos.length) return { type: 'config' };
    const lastAno = anos[anos.length - 1];
    const mesesAno = store.getAno(lastAno);
    if (mesesAno.length) {
      const last = mesesAno[mesesAno.length - 1];
      return { type: 'mes', ano: lastAno, mes: last.mes };
    }
    return { type: 'dashboard', ano: lastAno };
  });

  const renderContent = () => {
    if (nav.type === 'config') {
      return <ConfigView config={store.config} updateConfig={store.updateConfig}
        data={store.data} importData={store.importData} resetToSeed={store.resetToSeed} />;
    }
    if (nav.type === 'inadimplencia') {
      return <InadimplenciaView data={store.data} />;
    }
    if (nav.type === 'dashboard') {
      const meses = store.getAno(nav.ano);
      return <DashboardAnual meses={meses} ano={nav.ano} config={store.data?.config} />;
    }
    if (nav.type === 'mes') {
      let mesData = store.getMes(nav.ano, nav.mes);
      if (!mesData) mesData = store.createOrGetMes(nav.ano, nav.mes);
      return <MesView mesData={mesData} ano={nav.ano} mes={nav.mes} store={store}
        onDeleted={() => setNav({ type: 'dashboard', ano: nav.ano })} />;
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar store={store} nav={nav} setNav={setNav} />
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px', minWidth: 0 }}>
        {renderContent()}
      </main>
    </div>
  );
}
