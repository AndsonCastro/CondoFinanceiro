import { useMemo } from 'react';
import { CheckCircle2, Circle, MessageCircle } from 'lucide-react';
import { fmt, MESES_FULL } from '../utils/data';
import { Card, SectionHeader, ProgressBar } from './UI';

// ─── CONFIGURAÇÃO FIXA DO CONDOMÍNIO ────────────────────────────────────────
const BLOCOS = [1, 2, 3, 4, 5, 6, 7, 8];
const APTOS  = ['101', '102', '201', '202'];

const aptoKey = (bloco, apto) => `B${bloco}-${apto}`;

export const getAllAptos = () =>
  BLOCOS.flatMap(b => APTOS.map(a => aptoKey(b, a)));

export const calcPontualidadeFromChecks = (pagamentos) => {
  let pago_ate_dia10 = 0;
  let pago_apos_dia10 = 0;
  Object.values(pagamentos || {}).forEach(status => {
    if (status === 'ate10')  pago_ate_dia10++;
    if (status === 'apos10') pago_apos_dia10++;
  });
  return { pago_ate_dia10, pago_apos_dia10 };
};

// ─── BOTÃO DE STATUS ─────────────────────────────────────────────────────────
const StatusBtn = ({ label, color, bg, onClick, active }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      width: 28, height: 28, borderRadius: 6, border: 'none',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, transition: 'all 0.15s',
      background: active ? bg : 'var(--surface2)',
      color: active ? color : 'var(--muted)',
      boxShadow: active ? `0 0 0 2px ${color}55` : 'none',
      transform: active ? 'scale(1.1)' : 'scale(1)',
    }}
  >
    {label}
  </button>
);

// ─── BOTÃO WHATSAPP ──────────────────────────────────────────────────────────
const WhatsAppBtn = ({ href }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    title="Enviar cobrança via WhatsApp"
    style={{
      width: 28, height: 28, borderRadius: 6, border: 'none',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1a3a1a', color: '#25D366', textDecoration: 'none',
      transition: 'all 0.15s', flexShrink: 0,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#25D36633'; }}
    onMouseLeave={e => { e.currentTarget.style.background = '#1a3a1a'; }}
  >
    <MessageCircle size={13} />
  </a>
);

// ─── CARD DE UM BLOCO ────────────────────────────────────────────────────────
const BlocoCard = ({ bloco, pagamentos, onToggle, isDeadline, contatos, taxa, mes, ano, nomeCondominio }) => {
  const TAXA = taxa;
  const aptos = APTOS.map(a => ({
    key: aptoKey(bloco, a),
    label: `Ap ${a}`,
    status: pagamentos[aptoKey(bloco, a)] || null,
    inabitavel: contatos?.[aptoKey(bloco, a)]?.inabitavel || false,
  })).filter(a => !a.inabitavel);

  const pagos = aptos.filter(a => a.status !== null).length;
  const totalBloco = aptos.length;

  const buildWhatsAppLink = (key) => {
    const c = contatos?.[key] || {};
    const tel = (c.tel1 || c.tel2 || '').replace(/\D/g, '');
    if (!tel) return null;
    const nome = c.nome || key;
    const nomeMes = MESES_FULL[(mes || 1) - 1];
    const msg = `Olá, ${nome}! Passando para lembrar que a taxa de condomínio referente a ${nomeMes}/${ano}, no valor de R$ ${TAXA.toFixed(2)}, ainda não foi registrada em nosso sistema. Por favor, efetue o pagamento o quanto antes para evitar juros. Obrigado! — ${nomeCondominio || 'Condomínio'}`;
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
          Bloco {bloco}
        </div>
        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700,
          color: pagos === totalBloco ? 'var(--green)' : pagos > 0 ? 'var(--yellow)' : 'var(--muted)',
          background: pagos === totalBloco ? 'var(--green-dim)' : pagos > 0 ? 'var(--yellow-dim)' : 'var(--surface)',
          padding: '2px 8px', borderRadius: 20,
        }}>
          {pagos}/{totalBloco}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {aptos.map(({ key, label, status }) => {
          const alertar = isDeadline && !status;
          const waLink = (!status) ? buildWhatsAppLink(key) : null;
          return (
            <div key={key}
              className={alertar ? 'pulse-red' : ''}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: status ? 'var(--surface)' : alertar ? 'rgba(255,77,109,0.06)' : 'transparent',
                borderRadius: 8, padding: '6px 10px',
                border: `1px solid ${
                  status === 'ate10' ? 'var(--green)33'
                  : status === 'apos10' ? 'var(--yellow)33'
                  : alertar ? 'transparent'  // controlled by pulse-red keyframe
                  : 'transparent'
                }`,
                transition: 'background 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                {status === 'ate10' ? (
                  <CheckCircle2 size={15} color="var(--green)" />
                ) : status === 'apos10' ? (
                  <CheckCircle2 size={15} color="var(--yellow)" />
                ) : (
                  <Circle size={15} color={alertar ? 'var(--red)' : 'var(--muted)'} />
                )}
                <span style={{
                  fontSize: 13, fontWeight: status ? 700 : 400,
                  color: status ? 'var(--text)' : alertar ? 'var(--red)' : 'var(--muted)',
                }}>
                  {label}
                </span>
                {status && (
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--font-mono)',
                    color: status === 'ate10' ? 'var(--green)' : 'var(--yellow)',
                  }}>
                    {fmt(TAXA)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {waLink && <WhatsAppBtn href={waLink} />}
                <StatusBtn
                  label="≤10"
                  color="var(--green)"
                  bg="var(--green-dim)"
                  active={status === 'ate10'}
                  onClick={() => onToggle(key, status === 'ate10' ? null : 'ate10')}
                />
                <StatusBtn
                  label=">10"
                  color="var(--yellow)"
                  bg="var(--yellow-dim)"
                  active={status === 'apos10'}
                  onClick={() => onToggle(key, status === 'apos10' ? null : 'apos10')}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10 }}>
        <ProgressBar
          value={pagos}
          max={totalBloco}
          color={pagos === totalBloco ? 'var(--green)' : 'var(--yellow)'}
        />
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ApartamentosChecklist({ pagamentos = {}, onChange, contatos = {}, taxa = 50, mes, ano, nomeCondominio }) {
  const TAXA = taxa;
  const hoje = new Date();
  const isDeadline = (
    hoje.getDate() >= 10 &&
    hoje.getMonth() + 1 === mes &&
    hoje.getFullYear() === ano
  );

  const inadimplentesComContato = useMemo(() => {
    return getAllAptos().filter(key => {
      const status = pagamentos[key];
      const c = contatos?.[key] || {};
      const tel = (c.tel1 || c.tel2 || '').replace(/\D/g, '');
      return !status && tel;
    }).length;
  }, [pagamentos, contatos]);

  const inabitaveis = useMemo(() =>
    new Set(Object.entries(contatos).filter(([, c]) => c.inabitavel).map(([k]) => k))
  , [contatos]);

  const stats = useMemo(() => {
    const habitaveis = getAllAptos().filter(k => !inabitaveis.has(k));
    const ate10   = habitaveis.filter(k => pagamentos[k] === 'ate10').length;
    const apos10  = habitaveis.filter(k => pagamentos[k] === 'apos10').length;
    const pagos   = ate10 + apos10;
    const total   = habitaveis.length;
    const nao_pago = total - pagos;
    const totalArrecadado = pagos * TAXA;
    return { ate10, apos10, pagos, total, nao_pago, totalArrecadado };
  }, [pagamentos, inabitaveis, TAXA]);

  const handleToggle = (key, novoStatus) => {
    onChange({ ...pagamentos, [key]: novoStatus });
  };

  const handleCobrarTodos = () => {
    const inadimplentes = getAllAptos().filter(key => !pagamentos[key] && !inabitaveis.has(key));
    inadimplentes.forEach((key, i) => {
      const c = contatos?.[key] || {};
      const tel = (c.tel1 || c.tel2 || '').replace(/\D/g, '');
      if (!tel) return;
      const nome = c.nome || key;
      const nomeMes = MESES_FULL[(mes || 1) - 1];
      const msg = `Olá, ${nome}! Passando para lembrar que a taxa de condomínio referente a ${nomeMes}/${ano}, no valor de R$ ${TAXA.toFixed(2)}, ainda não foi registrada em nosso sistema. Por favor, efetue o pagamento o quanto antes para evitar juros. Obrigado! — ${nomeCondominio || 'Condomínio'}`;
      setTimeout(() => window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank'), i * 500);
    });
  };

  const marcarBloco = (bloco, status) => {
    const updates = {};
    APTOS.forEach(a => { updates[aptoKey(bloco, a)] = status; });
    onChange({ ...pagamentos, ...updates });
  };

  return (
    <Card style={{ marginTop: 16 }}>
      <SectionHeader>
        🏠 Controle de Taxa por Apartamento — R$ {TAXA.toFixed(2)}/unidade
      </SectionHeader>

      {/* Alerta dia 10 */}
      {isDeadline && stats.nao_pago > 0 && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
            ⚠️ Hoje é dia {hoje.getDate()} — prazo de vencimento! {stats.nao_pago} apartamento{stats.nao_pago > 1 ? 's' : ''} ainda não pagou{stats.nao_pago > 1 ? 'ram' : ''}.
          </span>
          {inadimplentesComContato > 0 && (
            <button onClick={handleCobrarTodos}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a3a1a', border: '1px solid #25D366', color: '#25D366', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <MessageCircle size={13} />
              Cobrar todos via WhatsApp ({inadimplentesComContato})
            </button>
          )}
        </div>
      )}

      {/* Legenda */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 20, background: 'var(--green-dim)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--green)' }}>≤10</div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pago até dia 10</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 20, background: 'var(--yellow-dim)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--yellow)' }}>&gt;10</div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pago após dia 10</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageCircle size={13} color="#25D366" />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Cobrar via WhatsApp (aparece em inadimplentes com telefone)</span>
        </div>
      </div>

      {/* Resumo rápido */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        background: 'var(--surface2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16,
      }}>
        {[
          { label: 'Pagos até dia 10', value: stats.ate10, color: 'var(--green)' },
          { label: 'Pagos após dia 10', value: stats.apos10, color: 'var(--yellow)' },
          { label: 'Não pagos', value: stats.nao_pago, color: stats.nao_pago > 0 ? 'var(--red)' : 'var(--muted)' },
          { label: 'Total Arrecadado', value: fmt(stats.totalArrecadado), color: 'var(--green)', mono: true },
        ].map(({ label, value, color, mono }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
            <span style={{ color, fontWeight: 800, fontSize: 18, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)' }}>{value}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{stats.pagos}/{stats.total} unidades</span>
        </div>
      </div>

      {/* Grid de blocos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {BLOCOS.map(bloco => (
          <div key={bloco}>
            <BlocoCard
              bloco={bloco}
              pagamentos={pagamentos}
              onToggle={handleToggle}
              isDeadline={isDeadline}
              contatos={contatos}
              taxa={TAXA}
              mes={mes}
              ano={ano}
              nomeCondominio={nomeCondominio}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'center' }}>
              <button onClick={() => marcarBloco(bloco, 'ate10')}
                style={{ flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700, background: 'var(--green-dim)', color: 'var(--green)', border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Todos ≤10
              </button>
              <button onClick={() => marcarBloco(bloco, 'apos10')}
                style={{ flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700, background: 'var(--yellow-dim)', color: 'var(--yellow)', border: 'none', borderRadius: 6, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Todos &gt;10
              </button>
              <button onClick={() => marcarBloco(bloco, null)}
                style={{ flex: 1, padding: '4px 0', fontSize: 10, fontWeight: 700, background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                Limpar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Barra geral */}
      <div style={{ marginTop: 16 }}>
        <ProgressBar value={stats.ate10} max={stats.total} color="var(--green)"
          label={`✅ Pagos até dia 10 — ${stats.ate10}/${stats.total} (${stats.total > 0 ? ((stats.ate10 / stats.total) * 100).toFixed(0) : 0}%)`}
          sub={fmt(stats.ate10 * TAXA)} />
        {stats.apos10 > 0 && (
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={stats.apos10} max={stats.total} color="var(--yellow)"
              label={`⏰ Pagos após dia 10 — ${stats.apos10}/${stats.total} (${((stats.apos10 / stats.total) * 100).toFixed(0)}%)`}
              sub={fmt(stats.apos10 * TAXA)} />
          </div>
        )}
        {stats.nao_pago > 0 && (
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={stats.nao_pago} max={stats.total} color="var(--red)"
              label={`❌ Não pagos — ${stats.nao_pago}/${stats.total} (${((stats.nao_pago / stats.total) * 100).toFixed(0)}%)`}
              sub={fmt(stats.nao_pago * TAXA)} />
          </div>
        )}
      </div>
    </Card>
  );
}
