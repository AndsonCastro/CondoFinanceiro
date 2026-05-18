// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const STORAGE_KEY = 'condo_financeiro_v1';

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
export const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export const CATEGORIAS_RECEITA = ['Taxa de Condomínio','Multas','Atrasados','Outros'];
export const CATEGORIAS_DESPESA = ['Energia (Enel)','Internet','Poda / Limpeza','Serviços Gerais','Portão / Acesso','Manutenção','Depósitos','Obras','Outros'];

export const PONTUALIDADE_TOTAL_UNIDADES = 32;

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
export const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

export const fmtShort = (v) => {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return fmt(v);
};

export const fmtDate = (mes, ano) => `${MESES[mes - 1]}/${ano}`;

// ─── DATA STRUCTURE ───────────────────────────────────────────────────────────
export const createMes = ({ mes, ano, saldo_inicial = 0 }) => ({
  id: `${ano}-${String(mes).padStart(2,'0')}`,
  mes,   // 1–12
  ano,
  saldo_inicial,

  // Pontualidade (calculada automaticamente a partir de pagamentos_aptos)
  pontualidade: {
    total_unidades: PONTUALIDADE_TOTAL_UNIDADES,
    pago_ate_dia10: 0,
    pago_apos_dia10: 0,
    // nao_pago = total - pago_ate - pago_apos
  },

  // Checklist de pagamentos por apartamento
  // { 'B1-101': 'ate10' | 'apos10' | null, ... }
  pagamentos_aptos: {},

  // Receitas
  receitas: [
    // { id, descricao, categoria, valor }
  ],

  // Despesas
  despesas: [
    // { id, descricao, categoria, valor }
  ],

  // Pendências / observações
  pendencias: [],
  // { id, descricao, tipo: 'a_receber'|'a_pagar', valor, resolvida: bool }

  // Pagamentos tardios de meses anteriores recebidos neste mês
  // { 'B1-101': { mes_pago: 6, ano_pago: 2026 } }  — gravado no mês de REFERÊNCIA
  pagamentos_tardios: {},

  notas: '',
});

export const calcTotais = (mesData) => {
  const totalReceitas = mesData.receitas.reduce((s, r) => s + (r.valor || 0), 0);
  const totalDespesas = mesData.despesas.reduce((s, d) => s + (d.valor || 0), 0);
  const movLiquido = totalReceitas - totalDespesas;
  const saldoFinal = (mesData.saldo_inicial || 0) + movLiquido;
  const naoPago = mesData.pontualidade.total_unidades
    - mesData.pontualidade.pago_ate_dia10
    - mesData.pontualidade.pago_apos_dia10;
  return { totalReceitas, totalDespesas, movLiquido, saldoFinal, naoPago };
};

export const calcAnual = (meses) => {
  const totalReceitas = meses.reduce((s, m) => s + calcTotais(m).totalReceitas, 0);
  const totalDespesas = meses.reduce((s, m) => s + calcTotais(m).totalDespesas, 0);
  const saldoInicial = meses[0]?.saldo_inicial || 0;
  const saldoFinal = meses.length ? calcTotais(meses[meses.length - 1]).saldoFinal : 0;
  return { totalReceitas, totalDespesas, movLiquido: totalReceitas - totalDespesas, saldoInicial, saldoFinal };
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
export const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* noop */ }
  return { anos: {}, config: { nome_condominio: 'Meu Condomínio', total_unidades: 32, taxa_condominio: 50, contatos: {}, fundo_reserva_meta: 0, orcamento: {}, despesas_recorrentes: [] } };
};

export const saveData = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
};

export const exportJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const importJSON = (file, onSuccess, onError) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try { onSuccess(JSON.parse(e.target.result)); }
    catch { onError('Arquivo JSON inválido.'); }
  };
  reader.readAsText(file);
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export const exportCSV = (mesData, config) => {
  const { mes, ano } = mesData;
  const nomeMes = MESES_FULL[mes - 1];
  const totais = calcTotais(mesData);
  let csv = `"Relatório Financeiro — ${config?.nome_condominio || 'Condomínio'} — ${nomeMes}/${ano}"\n\n`;
  csv += '"RECEITAS"\n"Descrição","Categoria","Valor"\n';
  mesData.receitas.forEach(r => { csv += `"${r.descricao}","${r.categoria}",${r.valor.toFixed(2)}\n`; });
  csv += `"Total Receitas",,${totais.totalReceitas.toFixed(2)}\n\n`;
  csv += '"DESPESAS"\n"Descrição","Categoria","Valor"\n';
  mesData.despesas.forEach(d => { csv += `"${d.descricao}","${d.categoria}",${d.valor.toFixed(2)}\n`; });
  csv += `"Total Despesas",,${totais.totalDespesas.toFixed(2)}\n\n`;
  csv += '"RESUMO"\n';
  csv += `"Saldo Inicial",,${mesData.saldo_inicial.toFixed(2)}\n`;
  csv += `"Movimento Líquido",,${totais.movLiquido.toFixed(2)}\n`;
  csv += `"Saldo Final",,${totais.saldoFinal.toFixed(2)}\n`;
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `condo_${nomeMes}_${ano}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ─── SEED DATA (dados históricos da planilha original) ────────────────────────
export const SEED_DATA = {
  anos: {
    2021: {
      meses: {
        1:  { id:'2021-01', mes:1, ano:2021, saldo_inicial:12635.36, pontualidade:{total_unidades:33,pago_ate_dia10:29,pago_apos_dia10:1}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1450},{id:'r2',descricao:'Multas',categoria:'Multas',valor:5}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:102.01},{id:'d3',descricao:'Cabeamento Cerca Elétrica',categoria:'Manutenção',valor:500},{id:'d4',descricao:'Controles Portão',categoria:'Portão / Acesso',valor:140},{id:'d5',descricao:'Poda das Árvores',categoria:'Poda / Limpeza',valor:300},{id:'d6',descricao:'Serviço Zeladoria',categoria:'Serviços Gerais',valor:160},{id:'d7',descricao:'Dep. Econômico',categoria:'Depósitos',valor:155},{id:'d8',descricao:'Serviço Pedreiro',categoria:'Manutenção',valor:250}], pendencias:[], notas:''},
        2:  { id:'2021-02', mes:2, ano:2021, saldo_inicial:12635.36, pontualidade:{total_unidades:33,pago_ate_dia10:30,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1480}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:93.97},{id:'d3',descricao:'Alcool Gel',categoria:'Outros',valor:19.89},{id:'d4',descricao:'Sensor Portão Veículos',categoria:'Portão / Acesso',valor:180}], pendencias:[], notas:''},
        3:  { id:'2021-03', mes:3, ano:2021, saldo_inicial:13746.50, pontualidade:{total_unidades:33,pago_ate_dia10:29,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1450}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:83.06},{id:'d3',descricao:'Gráfica Master',categoria:'Outros',valor:310},{id:'d4',descricao:'Metalúrgica',categoria:'Manutenção',valor:500},{id:'d5',descricao:'Depósito Luiz',categoria:'Depósitos',valor:84},{id:'d6',descricao:'Serviços Gerais',categoria:'Serviços Gerais',valor:50}], pendencias:[], notas:''},
        4:  { id:'2021-04', mes:4, ano:2021, saldo_inicial:14094.44, pontualidade:{total_unidades:33,pago_ate_dia10:28,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1400}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:104.28},{id:'d3',descricao:'Alcool Gel 15L',categoria:'Outros',valor:100}], pendencias:[], notas:''},
        5:  { id:'2021-05', mes:5, ano:2021, saldo_inicial:15215.16, pontualidade:{total_unidades:33,pago_ate_dia10:28,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1400}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:90.72},{id:'d3',descricao:'Conserto Sensor',categoria:'Manutenção',valor:60},{id:'d4',descricao:'Israel Eletrônica',categoria:'Manutenção',valor:179.8},{id:'d5',descricao:'Eletro Comercial',categoria:'Outros',valor:118.5},{id:'d6',descricao:'Monitor',categoria:'Outros',valor:150},{id:'d7',descricao:'Poda Árvores',categoria:'Poda / Limpeza',valor:300},{id:'d8',descricao:'Limpeza Geral',categoria:'Poda / Limpeza',valor:350},{id:'d9',descricao:'Fiação Câmera',categoria:'Manutenção',valor:70}], pendencias:[], notas:''},
        6:  { id:'2021-06', mes:6, ano:2021, saldo_inicial:15221.14, pontualidade:{total_unidades:33,pago_ate_dia10:29,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1450},{id:'r2',descricao:'Atrasados',categoria:'Atrasados',valor:330}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Controle Portão',categoria:'Portão / Acesso',valor:160}], pendencias:[], notas:''},
        7:  { id:'2021-07', mes:7, ano:2021, saldo_inicial:16766.14, pontualidade:{total_unidades:33,pago_ate_dia10:28,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1400}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:101},{id:'d3',descricao:'Dedetização',categoria:'Poda / Limpeza',valor:640},{id:'d4',descricao:'Solda Tampa Lixo',categoria:'Manutenção',valor:50},{id:'d5',descricao:'Carajas',categoria:'Outros',valor:309.9},{id:'d6',descricao:'ConstruTop',categoria:'Obras',valor:250},{id:'d7',descricao:'Depósito Luiz',categoria:'Depósitos',valor:85}], pendencias:[], notas:''},
        8:  { id:'2021-08', mes:8, ano:2021, saldo_inicial:16655.24, pontualidade:{total_unidades:33,pago_ate_dia10:27,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1350},{id:'r2',descricao:'Atrasados',categoria:'Atrasados',valor:230}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:194.92},{id:'d3',descricao:'Manutenção Portão',categoria:'Portão / Acesso',valor:120},{id:'d4',descricao:'Depósito Luiz',categoria:'Depósitos',valor:623.2},{id:'d5',descricao:'Depósito Edisiane',categoria:'Depósitos',valor:8},{id:'d6',descricao:'Serviço Pinturas',categoria:'Obras',valor:770},{id:'d7',descricao:"Bomba D'água",categoria:'Manutenção',valor:100}], pendencias:[], notas:''},
        9:  { id:'2021-09', mes:9, ano:2021, saldo_inicial:16344.12, pontualidade:{total_unidades:33,pago_ate_dia10:27,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1350}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:142.51},{id:'d3',descricao:'Manutenção Motor Carro',categoria:'Manutenção',valor:450},{id:'d4',descricao:'Poda e Limpeza',categoria:'Poda / Limpeza',valor:300},{id:'d5',descricao:'Mangueira/Pistola',categoria:'Outros',valor:241.7},{id:'d6',descricao:'Depósito Luiz',categoria:'Depósitos',valor:103},{id:'d7',descricao:'Suporte',categoria:'Outros',valor:161.9},{id:'d8',descricao:'Conserto Fechadura Portão',categoria:'Portão / Acesso',valor:20}], pendencias:[], notas:''},
        10: { id:'2021-10', mes:10, ano:2021, saldo_inicial:16192.01, pontualidade:{total_unidades:33,pago_ate_dia10:26,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1300}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:121.67},{id:'d3',descricao:'Serviço Pedreiro',categoria:'Manutenção',valor:150},{id:'d4',descricao:'Depósito Luiz',categoria:'Depósitos',valor:140}], pendencias:[], notas:''},
        11: { id:'2021-11', mes:11, ano:2021, saldo_inicial:17005.34, pontualidade:{total_unidades:33,pago_ate_dia10:28,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1450},{id:'r2',descricao:'Atrasados',categoria:'Atrasados',valor:100}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:244.06},{id:'d3',descricao:'Serviço Pedreiro',categoria:'Manutenção',valor:200},{id:'d4',descricao:'Serviço Zeladoria',categoria:'Serviços Gerais',valor:100},{id:'d5',descricao:'Conserto Cerca',categoria:'Manutenção',valor:190}], pendencias:[], notas:''},
        12: { id:'2021-12', mes:12, ano:2021, saldo_inicial:17746.28, pontualidade:{total_unidades:33,pago_ate_dia10:28,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1400}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:130},{id:'d3',descricao:'Poda das Árvores',categoria:'Poda / Limpeza',valor:200}], pendencias:[], notas:''},
      }
    },
    2022: {
      meses: {
        1:  { id:'2022-01', mes:1, ano:2022, saldo_inicial:18741.28, pontualidade:{total_unidades:33,pago_ate_dia10:26,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1300}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:129.69},{id:'d3',descricao:'Tambores do Lixo',categoria:'Outros',valor:350}], pendencias:[], notas:''},
        2:  { id:'2022-02', mes:2, ano:2022, saldo_inicial:19486.59, pontualidade:{total_unidades:33,pago_ate_dia10:28,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1400},{id:'r2',descricao:'Atrasados',categoria:'Atrasados',valor:50}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:120.76},{id:'d3',descricao:'Manutenção Câmera',categoria:'Manutenção',valor:50},{id:'d4',descricao:'MJ Ferragens',categoria:'Obras',valor:538.97},{id:'d5',descricao:'Dep. Luiz',categoria:'Depósitos',valor:18},{id:'d6',descricao:'Serviços Gerais',categoria:'Serviços Gerais',valor:200},{id:'d7',descricao:'Totem Alcool Gel',categoria:'Outros',valor:260},{id:'d8',descricao:'Chaveiro',categoria:'Outros',valor:20},{id:'d9',descricao:'Dep. Econômico',categoria:'Depósitos',valor:1093.12},{id:'d10',descricao:'Poda Árvore',categoria:'Poda / Limpeza',valor:50},{id:'d11',descricao:'Placa Fachada',categoria:'Obras',valor:470},{id:'d12',descricao:'Corrimão',categoria:'Obras',valor:500},{id:'d13',descricao:'Acessibilidade Portão',categoria:'Portão / Acesso',valor:500},{id:'d14',descricao:'Reparo e Pintura Calçada',categoria:'Obras',valor:950}], pendencias:[], notas:'Grande obra de acessibilidade e reforma da calçada.'},
        3:  { id:'2022-03', mes:3, ano:2022, saldo_inicial:16090.74, pontualidade:{total_unidades:33,pago_ate_dia10:26,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1300},{id:'r2',descricao:'Atrasados',categoria:'Atrasados',valor:300}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:128.14},{id:'d3',descricao:'Veneno para Rato',categoria:'Outros',valor:19},{id:'d4',descricao:'Depósito Luiz',categoria:'Depósitos',valor:119},{id:'d5',descricao:'Controles Portão',categoria:'Portão / Acesso',valor:180},{id:'d6',descricao:'Serviços Gerais',categoria:'Serviços Gerais',valor:250},{id:'d7',descricao:'Poda Árvores',categoria:'Poda / Limpeza',valor:300},{id:'d8',descricao:'Reparo Motor Cerca Elétrica',categoria:'Manutenção',valor:160}], pendencias:[], notas:''},
        4:  { id:'2022-04', mes:4, ano:2022, saldo_inicial:16459.60, pontualidade:{total_unidades:33,pago_ate_dia10:26,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1300},{id:'r2',descricao:'Atrasados',categoria:'Atrasados',valor:50}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:137.33}], pendencias:[], notas:''},
        5:  { id:'2022-05', mes:5, ano:2022, saldo_inicial:17597.27, pontualidade:{total_unidades:33,pago_ate_dia10:26,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1300}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:116},{id:'d3',descricao:'Talimpo',categoria:'Poda / Limpeza',valor:422.7},{id:'d4',descricao:'Serviços Gerais',categoria:'Serviços Gerais',valor:500},{id:'d5',descricao:'Veneno Rato',categoria:'Outros',valor:45},{id:'d6',descricao:'Coleta Entulho',categoria:'Outros',valor:100}], pendencias:[], notas:''},
        6:  { id:'2022-06', mes:6, ano:2022, saldo_inicial:17638.57, pontualidade:{total_unidades:33,pago_ate_dia10:27,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1350}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:150},{id:'d3',descricao:'Serviços Gerais',categoria:'Serviços Gerais',valor:350},{id:'d4',descricao:'Depósito Skinão',categoria:'Depósitos',valor:175},{id:'d5',descricao:'Ramacon',categoria:'Obras',valor:719.15},{id:'d6',descricao:'Serviço Calçada',categoria:'Obras',valor:330}], pendencias:[], notas:''},
        7:  { id:'2022-07', mes:7, ano:2022, saldo_inicial:17189.42, pontualidade:{total_unidades:33,pago_ate_dia10:25,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1250}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:127.05},{id:'d3',descricao:'Poda',categoria:'Poda / Limpeza',valor:140},{id:'d4',descricao:'Serviços Gerais',categoria:'Serviços Gerais',valor:250}], pendencias:[], notas:''},
        8:  { id:'2022-08', mes:8, ano:2022, saldo_inicial:17797.37, pontualidade:{total_unidades:33,pago_ate_dia10:23,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1150}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:119.68},{id:'d3',descricao:'Talimpo',categoria:'Poda / Limpeza',valor:47.3}], pendencias:[], notas:''},
        9:  { id:'2022-09', mes:9, ano:2022, saldo_inicial:18705.39, pontualidade:{total_unidades:33,pago_ate_dia10:26,pago_apos_dia10:0}, receitas:[{id:'r1',descricao:'Taxa de Condomínio',categoria:'Taxa de Condomínio',valor:1300}], despesas:[{id:'d1',descricao:'Internet',categoria:'Internet',valor:75},{id:'d2',descricao:'Enel',categoria:'Energia (Enel)',valor:128.39},{id:'d3',descricao:'Serviço Motor',categoria:'Manutenção',valor:650},{id:'d4',descricao:'Poda Árvores',categoria:'Poda / Limpeza',valor:370}], pendencias:[], notas:''},
      }
    }
  },
  config: { nome_condominio: 'Condomínio', total_unidades: 32, taxa_condominio: 50, contatos: {}, fundo_reserva_meta: 0, orcamento: {}, despesas_recorrentes: [] }
};
