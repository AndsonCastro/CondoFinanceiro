import { useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { calcTotais, calcAnual, fmt, fmtShort, MESES, MESES_FULL, PONTUALIDADE_TOTAL_UNIDADES } from '../utils/data';
import { isAdiantadoParaMes } from '../hooks/useStore';
import { getAllAptos } from './ApartamentosChecklist';
import { Card, KPI, SectionHeader, Badge } from './UI';
import { gerarRelatorioAnualPDF } from '../utils/pdf';
import { FileDown, Loader } from 'lucide-react';
import html2canvas from 'html2canvas';

const COLORS_PIE = ['#4D8FFF','#10D996','#FFD166','#FF4D6D','#9B5DE5','#F77F00','#06B6D4','#EC4899'];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1A2030', border: '1px solid #2D3A52', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: 'var(--muted)', marginBottom: 6, fontWeight: 700 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

const capturar = async (ref) => {
  if (!ref?.current) return null;
  const canvas = await html2canvas(ref.current, {
    backgroundColor: '#131825', scale: 2, logging: false, useCORS: true,
  });
  return { data: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
};

export default function DashboardAnual({ meses, ano, config }) {
  const refRecDesp   = useRef();
  const refSaldo     = useRef();
  const refResultado = useRef();
  const refCompos    = useRef();
  const refProjecao  = useRef();
  const [gerando, setGerando] = useState(false);

  const handleExportPDF = async () => {
    setGerando(true);
    try {
      const imgs = {
        recDesp:   await capturar(refRecDesp),
        saldo:     await capturar(refSaldo),
        resultado: await capturar(refResultado),
        composicao:await capturar(refCompos),
        projecao:  await capturar(refProjecao),
      };
      gerarRelatorioAnualPDF(meses, ano, config, imgs);
    } finally {
      setGerando(false);
    }
  };
  const totais = useMemo(() => calcAnual(meses), [meses]);

  const pontualidadeMedia = useMemo(() => {
    const total = meses.reduce((s, m) => s + (m.pontualidade?.total_unidades || 0), 0);
    const pontuais = meses.reduce((s, m) => s + (m.pontualidade?.pago_ate_dia10 || 0), 0);
    return total > 0 ? Math.round((pontuais / total) * 100) : 0;
  }, [meses]);

  const adiantamentosAtivos = useMemo(() => {
    const adts = config?.adiantamentos || [];
    const aptos = getAllAptos();
    return aptos.filter(apto =>
      meses.some(m => isAdiantadoParaMes(apto, m.ano, m.mes, adts))
    ).length;
  }, [meses, config]);

  const chartData = useMemo(() =>
    meses.map(m => {
      const t = calcTotais(m);
      return {
        name: MESES[m.mes - 1],
        Receitas: t.totalReceitas,
        Despesas: t.totalDespesas,
        Saldo: t.saldoFinal,
        Resultado: t.movLiquido,
        mes: m,
      };
    }), [meses]);

  // Categorias de despesas agregadas
  const categorias = useMemo(() => {
    const map = {};
    meses.forEach(m => {
      m.despesas.forEach(({ categoria, valor }) => {
        map[categoria] = (map[categoria] || 0) + valor;
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [meses]);

  // Projeção
  const projecao = useMemo(() => {
    if (!meses.length) return null;
    const faltam = 12 - meses.length;
    const saldoAtual = calcTotais(meses[meses.length - 1]).saldoFinal;

    // Receita projetada = taxa atual × unidades habitáveis (100% de adimplência esperada)
    const taxa = config?.taxa_condominio || 50;
    const inabitavelCount = Object.values(config?.contatos || {}).filter(c => c.inabitavel).length;
    const unidades = PONTUALIDADE_TOTAL_UNIDADES - inabitavelCount;
    const avgR = taxa * unidades;

    // Despesas projetadas = soma das recorrentes configuradas
    const recorrentes = config?.despesas_recorrentes || [];
    const temRecorrentes = recorrentes.length > 0;
    const avgD = temRecorrentes
      ? recorrentes.reduce((s, r) => s + (r.valor || 0), 0)
      : meses.slice(-3).reduce((s, m) => s + calcTotais(m).totalDespesas, 0) / Math.min(meses.length, 3);

    const avgMov = avgR - avgD;
    return { avgR, avgD, avgMov, faltam, projecaoFinal: saldoAtual + avgMov * faltam, taxa, unidades, temRecorrentes };
  }, [meses, config]);

  // Projeção chart
  const projecaoData = useMemo(() => {
    if (!projecao) return [];
    const realMap = {};
    meses.forEach(m => { realMap[MESES[m.mes - 1]] = calcTotais(m).saldoFinal; });
    let proj = meses.length ? calcTotais(meses[meses.length - 1]).saldoFinal : 0;
    return MESES.map((m) => {
      if (realMap[m] !== undefined) return { name: m, Real: realMap[m], Projeção: null };
      proj += projecao.avgMov;
      return { name: m, Real: null, Projeção: Math.round(proj * 100) / 100 };
    }).map((d, i) => {
      // Conectar no último mês real
      if (i === meses.length - 1 && d.Real !== null) return { ...d, Projeção: d.Real };
      return d;
    });
  }, [projecao, meses]);

  const mesesDeficit = meses.filter(m => calcTotais(m).movLiquido < 0);
  const cobertura = totais.totalDespesas > 0 ? totais.totalReceitas / totais.totalDespesas : 0;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Visão Anual — {ano}</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
            {meses.length} {meses.length === 1 ? 'mês registrado' : 'meses registrados'}
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={gerando}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border2)',
            background: 'transparent', color: gerando ? 'var(--blue)' : 'var(--muted)',
            cursor: gerando ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (!gerando) { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}}
          onMouseLeave={e => { if (!gerando) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--muted)'; }}}
        >
          {gerando ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</> : <><FileDown size={14} /> Exportar PDF Anual</>}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KPI icon="💰" label="Total Receitas" value={fmt(totais.totalReceitas)} color="var(--green)" sub={`${meses.length} meses`} />
        <KPI icon="📤" label="Total Despesas" value={fmt(totais.totalDespesas)} color="var(--red)" />
        <KPI icon="⚡" label="Resultado Líquido"
          value={fmt(totais.movLiquido)}
          color={totais.movLiquido >= 0 ? 'var(--green)' : 'var(--red)'}
          sub={totais.movLiquido >= 0 ? '✅ Superávit' : '⚠️ Déficit'} />
        <KPI icon="🏦" label="Saldo Final" value={fmt(totais.saldoFinal)} color="var(--blue)" />
        <KPI icon="📅" label="Pontualidade Média" value={`${pontualidadeMedia}%`}
          color={pontualidadeMedia >= 80 ? 'var(--green)' : pontualidadeMedia >= 50 ? 'var(--yellow)' : 'var(--red)'}
          sub="Pagtos ≤10 no ano" />
        {adiantamentosAtivos > 0 && (
          <KPI icon="💳" label="Adiantamentos Ativos" value={adiantamentosAtivos}
            color="#2dd4bf" sub="APs com ADT vigente" />
        )}
      </div>

      {/* Fundo de Reserva */}
      {config?.fundo_reserva_meta > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader>🏛 Fundo de Reserva</SectionHeader>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--muted)' }}>Saldo atual</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: totais.saldoFinal >= config.fundo_reserva_meta ? 'var(--green)' : 'var(--blue)' }}>
                  {fmt(totais.saldoFinal)} / {fmt(config.fundo_reserva_meta)}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--surface2)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((totais.saldoFinal / config.fundo_reserva_meta) * 100, 100)}%`,
                  background: totais.saldoFinal >= config.fundo_reserva_meta ? 'var(--green)' : 'var(--blue)',
                  borderRadius: 8, transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {totais.saldoFinal >= config.fundo_reserva_meta
                  ? '✅ Meta atingida!'
                  : `Faltam ${fmt(config.fundo_reserva_meta - totais.saldoFinal)} para a meta (${((totais.saldoFinal / config.fundo_reserva_meta) * 100).toFixed(1)}%)`}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Adiantamentos Ativos */}
      {(config?.adiantamentos || []).length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader>💳 Adiantamentos Ativos</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(config.adiantamentos).map(adt => {
              const mesExpAbs = adt.ano_origem * 12 + adt.mes_origem + adt.qtd_meses;
              const mesExp = ((mesExpAbs - 1) % 12) + 1;
              const anoExp = Math.floor((mesExpAbs - 1) / 12);
              return (
                <div key={adt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(20,184,166,0.06)', borderRadius: 8, border: '1px solid rgba(20,184,166,0.2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: '#2dd4bf', minWidth: 80 }}>{adt.apto}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{adt.qtd_meses} {adt.qtd_meses === 1 ? 'mês' : 'meses'} adiantado{adt.qtd_meses > 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 12, color: '#2dd4bf', fontWeight: 700 }}>expira {MESES_FULL[mesExp - 1]}/{anoExp}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Receitas vs Despesas */}
        <Card ref={refRecDesp}>
          <SectionHeader>Receitas vs Despesas</SectionHeader>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2030" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="Receitas" fill="var(--green)" radius={[4,4,0,0]} />
              <Bar dataKey="Despesas" fill="var(--red)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Evolução do saldo */}
        <Card ref={refSaldo}>
          <SectionHeader>Evolução do Saldo</SectionHeader>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="saldoG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2030" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="Saldo" stroke="var(--blue)" strokeWidth={2.5} fill="url(#saldoG)" dot={{ fill: 'var(--blue)', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Resultado mensal */}
        <Card ref={refResultado}>
          <SectionHeader>Resultado Mensal (Superávit / Déficit)</SectionHeader>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2030" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(1)}k`} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={0} stroke="var(--border2)" strokeWidth={1.5} />
              <Bar dataKey="Resultado" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.Resultado >= 0 ? 'var(--green)' : 'var(--red)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Categorias de despesas */}
        <Card ref={refCompos}>
          <SectionHeader>Composição das Despesas</SectionHeader>
          {categorias.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Nenhuma despesa registrada</div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={categorias} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value">
                    {categorias.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, overflow: 'auto', maxHeight: 180 }}>
                {categorias.map((c, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS_PIE[i % COLORS_PIE.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Projeção */}
      {projecao && projecao.faltam > 0 && (
        <Card ref={refProjecao} style={{ marginBottom: 16 }}>
          <SectionHeader>🔮 Projeção para o Restante de {ano}</SectionHeader>
          <div style={{ background: projecao.temRecorrentes ? 'var(--green-dim)' : 'var(--yellow-dim)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: projecao.temRecorrentes ? 'var(--green)' : 'var(--yellow)' }}>
            <div>📈 <strong>Receita:</strong> R$ {projecao.taxa.toFixed(2)} × {projecao.unidades} unidades = {fmt(projecao.avgR)}/mês — atualiza automaticamente se a taxa mudar em Configurações.</div>
            <div style={{ marginTop: 4 }}>
              {projecao.temRecorrentes
                ? <>📤 <strong>Despesas:</strong> soma das recorrentes configuradas = {fmt(projecao.avgD)}/mês — obras e gastos extraordinários não afetam a projeção.</>
                : <>⚠️ <strong>Despesas:</strong> média histórica (sem recorrentes configuradas). Cadastre-as em Configurações para projeção mais precisa.</>
              }
            </div>
            <div style={{ marginTop: 4, opacity: 0.8 }}>Faltam <strong>{projecao.faltam}</strong> meses para completar o ano.</div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <KPI label="Receita Média/Mês" value={fmt(projecao.avgR)} color="var(--green)" icon="📈" />
            <KPI label="Despesa Média/Mês" value={fmt(projecao.avgD)} color="var(--red)" icon="📤" />
            <KPI label="Resultado Médio/Mês" value={fmt(projecao.avgMov)} color={projecao.avgMov >= 0 ? 'var(--green)' : 'var(--red)'} icon="⚡" />
            <KPI label="Saldo Projetado (Dez)" value={fmt(projecao.projecaoFinal)} color="var(--blue)" icon="🏦" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={projecaoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2030" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 12 }} />
              <Line type="monotone" dataKey="Real" stroke="var(--blue)" strokeWidth={2.5} dot={{ fill: 'var(--blue)', r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="Projeção" stroke="var(--yellow)" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: 'var(--yellow)', r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Saúde Financeira */}
      <Card>
        <SectionHeader>🚦 Indicadores de Saúde Financeira</SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            {
              label: 'Taxa de Cobertura',
              ok: cobertura >= 1,
              desc: `Receitas cobrem ${(cobertura * 100).toFixed(0)}% das despesas${cobertura >= 1 ? ' ✅' : ' ⚠️'}`,
              badge: cobertura >= 1 ? 'Saudável' : 'Atenção',
            },
            {
              label: 'Meses com Déficit',
              ok: mesesDeficit.length <= 2,
              desc: `${mesesDeficit.length} de ${meses.length} meses negativos${mesesDeficit.length > 0 ? ': ' + mesesDeficit.map(m => MESES[m.mes - 1]).join(', ') : ''}`,
              badge: mesesDeficit.length === 0 ? 'Ótimo' : mesesDeficit.length <= 2 ? 'Aceitável' : 'Crítico',
            },
            {
              label: 'Crescimento do Saldo',
              ok: totais.saldoFinal > totais.saldoInicial,
              desc: `Variação: ${fmt(totais.saldoFinal - totais.saldoInicial)} (${totais.saldoInicial > 0 ? (((totais.saldoFinal - totais.saldoInicial) / totais.saldoInicial) * 100).toFixed(1) : 0}%)`,
              badge: totais.saldoFinal > totais.saldoInicial ? 'Positivo' : 'Negativo',
            },
            ...(projecao ? [{
              label: 'Reserva de Caixa',
              ok: projecao.avgD > 0 && (totais.saldoFinal / projecao.avgD) >= 3,
              desc: `Saldo atual cobre ~${projecao.avgD > 0 ? (totais.saldoFinal / projecao.avgD).toFixed(1) : '∞'} meses de despesas`,
              badge: projecao.avgD > 0 && (totais.saldoFinal / projecao.avgD) >= 3 ? 'Saudável' : 'Atenção',
            }] : []),
          ].map((ind, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 20 }}>{ind.ok ? '✅' : '⚠️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{ind.label}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{ind.desc}</div>
              </div>
              <Badge color={ind.ok ? 'green' : 'yellow'}>{ind.badge}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabela resumo mensal */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader>📋 Resumo Mensal</SectionHeader>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border2)' }}>
                {['Mês','Saldo Inicial','Receitas','Despesas','Resultado','Saldo Final'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Mês' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meses.map(m => {
                const t = calcTotais(m);
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 10px', fontWeight: 700 }}>{MESES[m.mes - 1]}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>{fmt(m.saldo_inicial)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{fmt(t.totalReceitas)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{fmt(t.totalDespesas)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.movLiquido >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.movLiquido >= 0 ? '+' : ''}{fmt(t.movLiquido)}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 700 }}>{fmt(t.saldoFinal)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border2)', background: 'var(--surface2)' }}>
                <td style={{ padding: '10px 10px', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>TOTAL</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 800 }}>{fmt(totais.saldoInicial)}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--green)', fontWeight: 800 }}>{fmt(totais.totalReceitas)}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--red)', fontWeight: 800 }}>{fmt(totais.totalDespesas)}</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: totais.movLiquido >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {totais.movLiquido >= 0 ? '+' : ''}{fmt(totais.movLiquido)}
                </td>
                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--blue)', fontWeight: 800 }}>{fmt(totais.saldoFinal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
