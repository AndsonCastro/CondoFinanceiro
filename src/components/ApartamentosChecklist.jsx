import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, MessageCircle, Clock, CreditCard } from 'lucide-react';
import { fmt, MESES, MESES_FULL } from '../utils/data';
import { isAdiantadoParaMes } from '../hooks/useStore';
import { Card, SectionHeader, ProgressBar } from './UI';

// ─── CONFIGURAÇÃO FIXA DO CONDOMÍNIO ────────────────────────────────────────
const BLOCOS = [1, 3, 5, 7, 2, 4, 6, 8];
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
const StatusBtn = ({ label, color, bg, onClick, active, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    style={{
      minWidth: 28, height: 28, padding: '0 5px', borderRadius: 6, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, transition: 'all 0.15s',
      background: active ? bg : 'var(--surface2)',
      color: active ? color : disabled ? 'var(--border)' : 'var(--muted)',
      boxShadow: active ? `0 0 0 2px ${color}55` : 'none',
      transform: active ? 'scale(1.1)' : 'scale(1)',
      opacity: disabled ? 0.45 : 1,
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
const BlocoCard = ({ bloco, pagamentos, onToggle, diaHoje, isMesAtual, contatos, taxa, mes, ano, nomeCondominio, pagamentos_tardios, adiantamentos, onAdiantar, onDesfazerAdiantamento }) => {
  const TAXA = taxa;
  const [adtModal, setAdtModal] = useState(null);
  const mesAbs = (a, m) => a * 12 + m;

  const aptos = APTOS.map(a => {
    const k = aptoKey(bloco, a);
    const adt = (adiantamentos || []).find(ad =>
      ad.apto === k &&
      mesAbs(ano, mes) > mesAbs(ad.ano_origem, ad.mes_origem) &&
      mesAbs(ano, mes) <= mesAbs(ad.ano_origem, ad.mes_origem) + ad.qtd_meses
    );
    return {
      key: k,
      label: `Ap ${a}`,
      nome: contatos?.[k]?.nome || null,
      status: pagamentos[k] || null,
      inabitavel: contatos?.[k]?.inabitavel || false,
      isento: contatos?.[k]?.isento || false,
      adt: adt || null,
    };
  });

  const pagos = aptos.filter(a => !a.inabitavel && !a.isento && (a.status !== null || a.adt !== null)).length;
  const totalBloco = aptos.filter(a => !a.inabitavel && !a.isento).length;

  const buildWhatsAppLink = (key) => {
    const c = contatos?.[key] || {};
    const useProprietario = c.responsavel && c.contato1;
    const tel = useProprietario
      ? c.contato1.replace(/\D/g, '')
      : (c.tel1 || c.tel2 || '').replace(/\D/g, '');
    if (!tel) return null;
    const nome = useProprietario ? (c.proprietario || c.nome || key) : (c.nome || key);
    const nomeMes = MESES_FULL[(mes || 1) - 1];
    const venc = parseInt(c.vencimento) || 10;
    const isAtrasado = diaHoje > venc;
    const valorMsg = isAtrasado ? TAXA * 1.10 : TAXA;
    const contexto = isAtrasado
      ? `que venceu no dia ${venc}, no valor atualizado de R$ ${valorMsg.toFixed(2)} (acréscimo de 10% por atraso)`
      : `que vence hoje, no valor de R$ ${valorMsg.toFixed(2)}`;
    const msg = `Olá, ${nome}! Passando para lembrar que a taxa de condomínio referente a ${nomeMes}/${ano}, ${contexto}, ainda não foi registrada em nosso sistema. Por favor, efetue o pagamento o quanto antes. Obrigado! — ${nomeCondominio || 'Condomínio'}`;
    return `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <>
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
          {aptos.map(({ key, label, nome, status, inabitavel, isento, adt }) => {
            if (inabitavel || isento) {
              const badge = inabitavel
                ? { label: 'INABITÁVEL', color: 'var(--red)', bg: 'rgba(255,77,109,0.12)' }
                : { label: 'ISENTO', color: 'var(--green)', bg: 'rgba(16,217,150,0.12)' };
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: inabitavel ? 'rgba(255,77,109,0.05)' : 'rgba(16,217,150,0.05)',
                  borderRadius: 8, padding: '6px 10px',
                  border: `1px solid ${inabitavel ? 'rgba(255,77,109,0.15)' : 'rgba(16,217,150,0.15)'}`,
                  opacity: 0.7,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Circle size={15} color={badge.color} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, lineHeight: 1 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', lineHeight: 1 }}>{nome || label}</span>
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: badge.color, background: badge.bg, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
                    {badge.label}
                  </span>
                </div>
              );
            }

            // Adiantamento
            if (adt) {
              const mesesRestantes = mesAbs(adt.ano_origem, adt.mes_origem) + adt.qtd_meses - mesAbs(ano, mes) + 1;
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(20,184,166,0.07)', borderRadius: 8, padding: '6px 10px',
                  border: '1px solid rgba(20,184,166,0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <CreditCard size={15} color="#2dd4bf" />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 12, color: '#2dd4bfaa', fontWeight: 600, lineHeight: 1 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#99f6e4', lineHeight: 1 }}>{nome || label}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#2dd4bf', background: 'rgba(20,184,166,0.15)', padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
                      ADT {mesesRestantes}m
                    </span>
                    <button
                      onClick={() => onDesfazerAdiantamento(adt.id)}
                      title="Desfazer adiantamento"
                      style={{
                        width: 20, height: 20, borderRadius: 4, border: 'none',
                        cursor: 'pointer', background: 'rgba(20,184,166,0.15)',
                        color: '#2dd4bf', fontWeight: 800, fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >×</button>
                  </div>
                </div>
              );
            }

            const tardio = pagamentos_tardios?.[key];
            // Cores: sempre no dia 10 global (para todos os apartamentos)
            const alertarAmarelo = isMesAtual && diaHoje === 10 && !status && !tardio;
            const alertarVermelho = isMesAtual && diaHoje > 10 && !status && !tardio;
            const alertar = alertarAmarelo || alertarVermelho;
            const corAlerta = alertarVermelho ? 'var(--red)' : 'var(--yellow)';
            // WPP: usa a data de vencimento configurada por apartamento
            const venc = parseInt(contatos?.[key]?.vencimento) || 10;
            const wppAtivo = isMesAtual && diaHoje >= venc && !status && !tardio;
            const waLink = wppAtivo ? buildWhatsAppLink(key) : null;

            if (tardio) {
              const tag = `${MESES[tardio.mes_pago - 1]}/${String(tardio.ano_pago).slice(2)}`;
              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(99,102,241,0.07)', borderRadius: 8, padding: '6px 10px',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Clock size={15} color="#818cf8" />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 12, color: '#818cf8aa', fontWeight: 600, lineHeight: 1 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', lineHeight: 1 }}>{nome || label}</span>
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>
                    PAGO MÊS {tag}
                  </span>
                </div>
              );
            }

            return (
              <div key={key}
                className={alertarVermelho ? 'pulse-red' : ''}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: status ? 'var(--surface)' : alertarVermelho ? 'rgba(255,77,109,0.06)' : alertarAmarelo ? 'rgba(234,179,8,0.06)' : 'transparent',
                  borderRadius: 8, padding: '6px 10px',
                  border: `1px solid ${
                    status === 'ate10' ? 'var(--green)33'
                    : status === 'apos10' ? 'var(--yellow)33'
                    : alertarVermelho ? 'var(--red)44'
                    : alertarAmarelo ? 'var(--yellow)44'
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
                    <Circle size={15} color={alertar ? corAlerta : 'var(--muted)'} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, lineHeight: 1 }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize: 13, fontWeight: 700, lineHeight: 1,
                        color: alertar ? corAlerta : 'var(--text)',
                      }}>
                        {nome || label}
                      </span>
                    </span>
                    {alertarVermelho && (
                      <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>
                        🚨 Em atraso — {fmt(TAXA * 1.10)}
                      </span>
                    )}
                  </div>
                  {status && (
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: status === 'ate10' ? 'var(--green)' : 'var(--yellow)' }}>
                      {fmt(status === 'apos10' ? TAXA * 1.10 : TAXA)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {waLink && <WhatsAppBtn href={waLink} />}
                  {!status && (
                    <StatusBtn
                      label="ADT"
                      color="#2dd4bf"
                      bg="rgba(20,184,166,0.15)"
                      active={false}
                      onClick={() => setAdtModal({ key, nome: nome || key, qtd: 1 })}
                    />
                  )}
                  <StatusBtn label="≤10" color="var(--green)" bg="var(--green-dim)" active={status === 'ate10'} onClick={() => onToggle(key, status === 'ate10' ? null : 'ate10')} />
                  <StatusBtn label=">10" color="var(--yellow)" bg="var(--yellow-dim)" active={status === 'apos10'} onClick={() => onToggle(key, status === 'apos10' ? null : 'apos10')} />
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

      {/* Modal de adiantamento */}
      {adtModal && (
        <div
          onClick={() => setAdtModal(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', borderRadius: 16, padding: 28, minWidth: 290,
              border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--text)' }}>
              Pagamento Adiantado
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 6 }}>
              {adtModal.nome}
            </div>
            <div style={{ fontSize: 12, color: '#2dd4bf', marginBottom: 16, background: 'rgba(20,184,166,0.08)', padding: '6px 10px', borderRadius: 6 }}>
              Meses adiantados <strong>além do mês atual</strong> (o mês atual está incluído)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setAdtModal(m => ({ ...m, qtd: Math.max(1, m.qtd - 1) }))}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text)', fontWeight: 800,
                  fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{ fontWeight: 900, fontSize: 32, color: '#2dd4bf', fontFamily: 'var(--font-mono)', minWidth: 44, textAlign: 'center' }}>
                {adtModal.qtd}
              </span>
              <button
                onClick={() => setAdtModal(m => ({ ...m, qtd: m.qtd + 1 }))}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--text)', fontWeight: 800,
                  fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginBottom: 4 }}>
              Mês atual: {fmt(TAXA)} (via checklist)
            </div>
            <div style={{ fontSize: 13, color: '#2dd4bf', textAlign: 'center', marginBottom: 22, fontWeight: 700 }}>
              + {adtModal.qtd} {adtModal.qtd === 1 ? 'mês' : 'meses'} adiantados: {fmt(adtModal.qtd * TAXA)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setAdtModal(null)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface2)', color: 'var(--muted)', fontWeight: 700,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { onAdiantar(adtModal.key, adtModal.qtd); setAdtModal(null); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: 'rgba(20,184,166,0.25)', color: '#2dd4bf', fontWeight: 800,
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function ApartamentosChecklist({ pagamentos = {}, pagamentos_tardios = {}, onChange, contatos = {}, taxa = 50, mes, ano, nomeCondominio, adiantamentos = [], onAdiantar, onDesfazerAdiantamento }) {
  const TAXA = taxa;
  const hoje = new Date();
  const isMesAtual = hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano;
  const isDia10     = isMesAtual && hoje.getDate() === 10;
  const isAposDia10 = isMesAtual && hoje.getDate() > 10;

  const inabitaveis = useMemo(() =>
    new Set(Object.entries(contatos).filter(([, c]) => c.inabitavel).map(([k]) => k))
  , [contatos]);

  const isentos = useMemo(() =>
    new Set(Object.entries(contatos).filter(([, c]) => c.isento).map(([k]) => k))
  , [contatos]);

  const inadimplentesComContato = useMemo(() => {
    const diaHoje = hoje.getDate();
    return getAllAptos().filter(key => {
      if (inabitaveis.has(key) || isentos.has(key)) return false;
      if (pagamentos[key] || pagamentos_tardios[key]) return false;
      if (isAdiantadoParaMes(key, ano, mes, adiantamentos)) return false;
      const c = contatos?.[key] || {};
      const useProprietario = c.responsavel && c.contato1;
      const tel = useProprietario ? c.contato1.replace(/\D/g, '') : (c.tel1 || '').replace(/\D/g, '');
      if (!tel) return false;
      const venc = parseInt(c.vencimento) || 10;
      return isMesAtual && diaHoje >= venc;
    }).length;
  }, [pagamentos, pagamentos_tardios, contatos, inabitaveis, isentos, isMesAtual, adiantamentos, ano, mes]);

  const stats = useMemo(() => {
    const habitaveis = getAllAptos().filter(k => !inabitaveis.has(k) && !isentos.has(k));
    const adiantados = habitaveis.filter(k => isAdiantadoParaMes(k, ano, mes, adiantamentos)).length;
    const ate10   = habitaveis.filter(k => !isAdiantadoParaMes(k, ano, mes, adiantamentos) && pagamentos[k] === 'ate10').length;
    const apos10  = habitaveis.filter(k => !isAdiantadoParaMes(k, ano, mes, adiantamentos) && pagamentos[k] === 'apos10').length;
    const tardios = habitaveis.filter(k => !isAdiantadoParaMes(k, ano, mes, adiantamentos) && !pagamentos[k] && pagamentos_tardios[k]).length;
    const pagos   = ate10 + apos10;
    const total   = habitaveis.length;
    const nao_pago = total - pagos - tardios - adiantados;
    const totalArrecadado = pagos * TAXA;
    return { ate10, apos10, pagos, tardios, adiantados, total, nao_pago, totalArrecadado };
  }, [pagamentos, pagamentos_tardios, inabitaveis, isentos, TAXA, adiantamentos, ano, mes]);

  const handleToggle = (key, novoStatus) => {
    onChange({ ...pagamentos, [key]: novoStatus });
  };

  const handleCobrarTodos = () => {
    const inadimplentes = getAllAptos().filter(key =>
      !pagamentos[key] && !pagamentos_tardios[key] &&
      !inabitaveis.has(key) && !isentos.has(key) &&
      !isAdiantadoParaMes(key, ano, mes, adiantamentos)
    );
    inadimplentes.forEach((key, i) => {
      const c = contatos?.[key] || {};
      const useProprietario = c.responsavel && c.contato1;
      const tel = useProprietario
        ? c.contato1.replace(/\D/g, '')
        : (c.tel1 || c.tel2 || '').replace(/\D/g, '');
      if (!tel) return;
      const nome = useProprietario ? (c.proprietario || c.nome || key) : (c.nome || key);
      const nomeMes = MESES_FULL[(mes || 1) - 1];
      const venc = parseInt(c.vencimento) || 10;
      const isAtrasado = hoje.getDate() > venc;
      const valorMsg = isAtrasado ? TAXA * 1.10 : TAXA;
      const contexto = isAtrasado
        ? `que venceu no dia ${venc}, no valor atualizado de R$ ${valorMsg.toFixed(2)} (acréscimo de 10% por atraso)`
        : `que vence hoje, no valor de R$ ${valorMsg.toFixed(2)}`;
      const msg = `Olá, ${nome}! Passando para lembrar que a taxa de condomínio referente a ${nomeMes}/${ano}, ${contexto}, ainda não foi registrada em nosso sistema. Por favor, efetue o pagamento o quanto antes. Obrigado! — ${nomeCondominio || 'Condomínio'}`;
      setTimeout(() => window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank'), i * 500);
    });
  };

  const marcarBloco = (bloco, status) => {
    const updates = {};
    APTOS.forEach(a => {
      const key = aptoKey(bloco, a);
      if (!isentos.has(key) && !isAdiantadoParaMes(key, ano, mes, adiantamentos)) {
        updates[key] = status;
      }
    });
    onChange({ ...pagamentos, ...updates });
  };

  return (
    <Card style={{ marginTop: 16 }}>
      <SectionHeader>
        🏠 Controle de Taxa por Apartamento — R$ {TAXA.toFixed(2)}/unidade
      </SectionHeader>

      {/* Alerta dia 10 — último dia sem acréscimo */}
      {isDia10 && stats.nao_pago > 0 && (
        <div style={{
          background: 'var(--yellow-dim)', border: '1px solid var(--yellow)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ color: 'var(--yellow)', fontWeight: 700, fontSize: 13 }}>
            ⚠️ Hoje é o último dia para pagamento da taxa sem acréscimo! {stats.nao_pago} apartamento{stats.nao_pago > 1 ? 's' : ''} ainda não pagou{stats.nao_pago > 1 ? 'ram' : ''}. Após hoje será cobrada multa de 10%.
          </span>
          {inadimplentesComContato > 0 && (
            <button onClick={handleCobrarTodos}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(234,179,8,0.15)', border: '1px solid var(--yellow)', color: 'var(--yellow)', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <MessageCircle size={13} />
              Cobrar todos via WhatsApp ({inadimplentesComContato})
            </button>
          )}
        </div>
      )}

      {/* Alerta após dia 10 — com acréscimo */}
      {isAposDia10 && stats.nao_pago > 0 && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>
            🚨 Prazo encerrado! {stats.nao_pago} apartamento{stats.nao_pago > 1 ? 's' : ''} em atraso. O valor atualizado com 10% de acréscimo é {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(TAXA * 1.10)}.
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
          <div style={{ width: 28, height: 20, background: 'rgba(20,184,166,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#2dd4bf' }}>ADT</div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Registrar pagamento adiantado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageCircle size={13} color="#25D366" />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Cobrar via WhatsApp (aparece a partir do dia 10 para inadimplentes com telefone)</span>
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
          ...(stats.tardios > 0 ? [{ label: 'Pago em outro mês', value: stats.tardios, color: '#818cf8' }] : []),
          ...(stats.adiantados > 0 ? [{ label: 'Adiantados', value: stats.adiantados, color: '#2dd4bf' }] : []),
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
              pagamentos_tardios={pagamentos_tardios}
              onToggle={handleToggle}
              diaHoje={hoje.getDate()}
              isMesAtual={isMesAtual}
              contatos={contatos}
              taxa={TAXA}
              mes={mes}
              ano={ano}
              nomeCondominio={nomeCondominio}
              adiantamentos={adiantamentos}
              onAdiantar={onAdiantar}
              onDesfazerAdiantamento={onDesfazerAdiantamento}
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
        {stats.adiantados > 0 && (
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={stats.adiantados} max={stats.total} color="#2dd4bf"
              label={`💳 Adiantados — ${stats.adiantados}/${stats.total} (${((stats.adiantados / stats.total) * 100).toFixed(0)}%)`}
              sub="" />
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
