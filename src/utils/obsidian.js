import { MESES_FULL } from './data';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const calcTotais = (m) => {
  const totalReceitas = m.receitas.reduce((s, r) => s + (r.valor || 0), 0);
  const totalDespesas = m.despesas.reduce((s, r) => s + (r.valor || 0), 0);
  const movLiquido = totalReceitas - totalDespesas;
  const saldoFinal = (m.saldo_inicial || 0) + movLiquido;
  const naoPago = (m.pontualidade?.total_unidades || 0)
    - (m.pontualidade?.pago_ate_dia10 || 0)
    - (m.pontualidade?.pago_apos_dia10 || 0);
  return { totalReceitas, totalDespesas, movLiquido, saldoFinal, naoPago };
};

const gerarRelatorioMes = (mesData, config) => {
  const { mes, ano, saldo_inicial, receitas, despesas, notas, pontualidade } = mesData;
  const nomeMes = MESES_FULL[mes - 1];
  const t = calcTotais(mesData);
  const pad = (n) => String(n).padStart(2, '0');

  return `---
data: ${ano}-${pad(mes)}-01
mes: ${mes}
ano: ${ano}
arrecadado: ${t.totalReceitas.toFixed(2)}
despesas_total: ${t.totalDespesas.toFixed(2)}
saldo_final: ${t.saldoFinal.toFixed(2)}
inadimplentes: ${t.naoPago}
tags: [financeiro, condomínio]
---

# Financeiro — ${nomeMes}/${ano}

> Condomínio: ${config?.nome_condominio || 'Condomínio'}

## Resumo

| | Valor |
|---|---|
| Saldo Inicial | ${fmt(saldo_inicial)} |
| Total Receitas | ${fmt(t.totalReceitas)} |
| Total Despesas | ${fmt(t.totalDespesas)} |
| Movimento Líquido | ${fmt(t.movLiquido)} |
| **Saldo Final** | **${fmt(t.saldoFinal)}** |

## Pontualidade

- ✅ Pagos até dia 10: **${pontualidade?.pago_ate_dia10 || 0}**
- ⏰ Pagos após dia 10: **${pontualidade?.pago_apos_dia10 || 0}**
- ❌ Inadimplentes: **${t.naoPago}**
- Total unidades: ${pontualidade?.total_unidades || 0}

## Receitas

| Descrição | Categoria | Valor |
|---|---|---|
${receitas.map(r => `| ${r.descricao} | ${r.categoria} | ${fmt(r.valor)} |`).join('\n') || '| — | — | — |'}

**Total: ${fmt(t.totalReceitas)}**

## Despesas

| Descrição | Categoria | Valor |
|---|---|---|
${despesas.map(d => `| ${d.descricao} | ${d.categoria} | ${fmt(d.valor)} |`).join('\n') || '| — | — | — |'}

**Total: ${fmt(t.totalDespesas)}**
${notas ? `\n## Notas\n\n${notas}` : ''}
`;
};

const gerarResumoAnual = (ano, meses, config) => {
  const lista = Object.values(meses).sort((a, b) => a.mes - b.mes);
  const totalRec = lista.reduce((s, m) => s + calcTotais(m).totalReceitas, 0);
  const totalDesp = lista.reduce((s, m) => s + calcTotais(m).totalDespesas, 0);
  const saldoInicial = lista[0]?.saldo_inicial || 0;
  const saldoFinal = lista.length ? calcTotais(lista[lista.length - 1]).saldoFinal : 0;

  const linhasMeses = lista.map(m => {
    const t = calcTotais(m);
    return `| [[${ano}-${String(m.mes).padStart(2,'0')} ${MESES_FULL[m.mes-1]}\\|${MESES_FULL[m.mes-1]}]] | ${fmt(t.totalReceitas)} | ${fmt(t.totalDespesas)} | ${fmt(t.movLiquido)} | ${fmt(t.saldoFinal)} | ${t.naoPago} |`;
  }).join('\n');

  return `---
ano: ${ano}
total_receitas: ${totalRec.toFixed(2)}
total_despesas: ${totalDesp.toFixed(2)}
saldo_final: ${saldoFinal.toFixed(2)}
tags: [financeiro, anual, condomínio]
---

# Resumo Anual — ${ano}

> Condomínio: ${config?.nome_condominio || 'Condomínio'}

## Totais do Ano

| | Valor |
|---|---|
| Saldo Inicial (Jan) | ${fmt(saldoInicial)} |
| Total Receitas | ${fmt(totalRec)} |
| Total Despesas | ${fmt(totalDesp)} |
| Movimento Líquido | ${fmt(totalRec - totalDesp)} |
| **Saldo Final** | **${fmt(saldoFinal)}** |

## Mês a Mês

| Mês | Receitas | Despesas | Líquido | Saldo Final | Inadimpl. |
|---|---|---|---|---|---|
${linhasMeses}
`;
};

const gerarNotaApto = (key, contato) => {
  const bloco = key.split('-')[0];
  const apto = key.split('-')[1];
  return `---
apto: ${key}
bloco: ${bloco}
apartamento: ${apto}
tags: [apartamento, condomínio]
---

# Apartamento ${key}

## Condômino

- **Nome:** ${contato.nome || '—'}
- **Telefone 1:** ${contato.tel1 || '—'}
- **Telefone 2:** ${contato.tel2 || '—'}

## Proprietário

- **Nome:** ${contato.proprietario || '—'}
- **Contato 1:** ${contato.contato1 || '—'}
- **Contato 2:** ${contato.contato2 || '—'}
`;
};

const gerarDashboard = (data) => {
  const anos = Object.keys(data.anos).sort().reverse();
  const linhasAnos = anos.map(a => `- [[Financeiro/${a} Anual|📊 ${a}]]`).join('\n');
  return `# 🏠 ${data.config?.nome_condominio || 'Condomínio'} — Central

> Atualizado em ${new Date().toLocaleDateString('pt-BR')}. [Abrir App](https://condo-app-livid.vercel.app)

## Financeiro por Ano
${linhasAnos}

## Atas de Reunião
- [[Atas/Template Ata|➕ Nova Ata]]

\`\`\`dataview
LIST
FROM "Condomínio/Atas"
WHERE file.name != "Template Ata"
SORT file.mtime DESC
LIMIT 5
\`\`\`
`;
};

export const exportarParaObsidian = async (data) => {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('Seu navegador não suporta acesso a pastas. Use Chrome ou Edge.');
  }

  const vaultDir = await window.showDirectoryPicker({
    id: 'obsidian-vault',
    mode: 'readwrite',
    startIn: 'documents',
  });

  const escreverArquivo = async (dir, nome, conteudo) => {
    const fh = await dir.getFileHandle(nome, { create: true });
    const w = await fh.createWritable();
    await w.write(conteudo);
    await w.close();
  };

  const getDir = async (parent, ...partes) => {
    let atual = parent;
    for (const parte of partes) {
      atual = await atual.getDirectoryHandle(parte, { create: true });
    }
    return atual;
  };

  const condoDir = await getDir(vaultDir, 'Condomínio');
  const finDir = await getDir(condoDir, 'Financeiro');
  const aptoDir = await getDir(condoDir, 'Apartamentos');

  let arquivos = 0;

  // Relatórios mensais e anuais
  for (const [anoStr, anoData] of Object.entries(data.anos || {})) {
    const meses = anoData.meses || {};
    for (const mesData of Object.values(meses)) {
      const nomeMes = MESES_FULL[mesData.mes - 1];
      const pad = String(mesData.mes).padStart(2, '0');
      const nome = `${anoStr}-${pad} ${nomeMes}.md`;
      await escreverArquivo(finDir, nome, gerarRelatorioMes(mesData, data.config));
      arquivos++;
    }
    await escreverArquivo(finDir, `${anoStr} Anual.md`, gerarResumoAnual(anoStr, meses, data.config));
    arquivos++;
  }

  // Notas por apartamento (só os que têm dados preenchidos)
  const contatos = data.config?.contatos || {};
  for (const [key, contato] of Object.entries(contatos)) {
    if (contato.nome || contato.tel1 || contato.proprietario) {
      await escreverArquivo(aptoDir, `${key}.md`, gerarNotaApto(key, contato));
      arquivos++;
    }
  }

  // Dashboard
  await escreverArquivo(condoDir, 'Dashboard.md', gerarDashboard(data));
  arquivos++;

  return arquivos;
};
