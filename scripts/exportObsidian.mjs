import { ClassicLevel } from 'classic-level';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LEVELDB_PATH = path.join(os.tmpdir(), 'CondoFinanceiro', 'Default', 'Local Storage', 'leveldb');
const STORAGE_KEY  = 'condo_financeiro_v1';
const VAULT        = 'C:\\Users\\andso\\OneDrive\\Documentos\\Obsidian Vault';

// ── LER LOCALSTORAGE ─────────────────────────────────────────────────────────
async function lerDados() {
  const db = new ClassicLevel(LEVELDB_PATH, { keyEncoding: 'buffer', valueEncoding: 'buffer' });
  try {
    for await (const [key, value] of db.iterator()) {
      if (key.toString('utf8').includes(STORAGE_KEY)) {
        const raw = value[0] === 0x00
          ? value.slice(2).toString('utf16le')
          : value.slice(1).toString('latin1');
        return JSON.parse(raw);
      }
    }
    throw new Error('Chave não encontrada no LevelDB');
  } finally {
    await db.close();
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmt  = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const pad  = (n) => String(n).padStart(2, '0');

const calcTotais = (m) => {
  const totalReceitas = m.receitas.reduce((s, r) => s + (r.valor || 0), 0);
  const totalDespesas = m.despesas.reduce((s, r) => s + (r.valor || 0), 0);
  const movLiquido    = totalReceitas - totalDespesas;
  const saldoFinal    = (m.saldo_inicial || 0) + movLiquido;
  const naoPago = (m.pontualidade?.total_unidades || 0)
    - (m.pontualidade?.pago_ate_dia10 || 0)
    - (m.pontualidade?.pago_apos_dia10 || 0);
  return { totalReceitas, totalDespesas, movLiquido, saldoFinal, naoPago };
};

const gerarRelatorioMes = (mesData, config) => {
  const { mes, ano, saldo_inicial, receitas, despesas, notas, pontualidade } = mesData;
  const nomeMes = MESES_FULL[mes - 1];
  const t = calcTotais(mesData);
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
  const totalRec  = lista.reduce((s, m) => s + calcTotais(m).totalReceitas, 0);
  const totalDesp = lista.reduce((s, m) => s + calcTotais(m).totalDespesas, 0);
  const saldoInicial = lista[0]?.saldo_inicial || 0;
  const saldoFinal   = lista.length ? calcTotais(lista[lista.length - 1]).saldoFinal : 0;

  const linhasMeses = lista.map(m => {
    const t = calcTotais(m);
    return `| [[${ano}-${pad(m.mes)} ${MESES_FULL[m.mes-1]}\\|${MESES_FULL[m.mes-1]}]] | ${fmt(t.totalReceitas)} | ${fmt(t.totalDespesas)} | ${fmt(t.movLiquido)} | ${fmt(t.saldoFinal)} | ${t.naoPago} |`;
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
  const [bloco, apto] = key.split('-');
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

// ── ESCREVER ARQUIVO ─────────────────────────────────────────────────────────
const escrever = (filePath, conteudo) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, conteudo, 'utf8');
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
console.log('📖 Lendo dados do localStorage...');
const data = await lerDados();
console.log(`✅ Dados carregados — ${Object.keys(data.anos || {}).length} ano(s): ${Object.keys(data.anos || {}).join(', ')}`);

const finDir  = path.join(VAULT, 'Condomínio', 'Financeiro');
const aptoDir = path.join(VAULT, 'Condomínio', 'Apartamentos');
const condoDir = path.join(VAULT, 'Condomínio');
let arquivos = 0;

for (const [anoStr, anoData] of Object.entries(data.anos || {})) {
  const meses = anoData.meses || {};
  for (const mesData of Object.values(meses)) {
    const nomeMes = MESES_FULL[mesData.mes - 1];
    const nome = `${anoStr}-${pad(mesData.mes)} ${nomeMes}.md`;
    escrever(path.join(finDir, nome), gerarRelatorioMes(mesData, data.config));
    arquivos++;
  }
  escrever(path.join(finDir, `${anoStr} Anual.md`), gerarResumoAnual(anoStr, meses, data.config));
  arquivos++;
}

const contatos = data.config?.contatos || {};
for (const [key, contato] of Object.entries(contatos)) {
  if (contato.nome || contato.tel1 || contato.proprietario) {
    escrever(path.join(aptoDir, `${key}.md`), gerarNotaApto(key, contato));
    arquivos++;
  }
}

escrever(path.join(condoDir, 'Dashboard.md'), gerarDashboard(data));
arquivos++;

console.log(`\n✅ ${arquivos} arquivo(s) escritos em:\n   ${VAULT}`);
