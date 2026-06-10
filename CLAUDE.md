# CondoFinanceiro — Gestão Financeira de Condomínio

## Projeto
- **Tipo:** App de gestão financeira (PWA, 100% frontend)
- **Status:** Em produção
- **URL:** https://condo-app-livid.vercel.app
- **GitHub:** https://github.com/AndsonCastro/CondoFinanceiro
- **Vercel:** https://vercel.com/condofinanceiro/condo-app

## Stack
React 18 · Create React App (react-scripts 5) · Recharts · jsPDF · html2canvas · Lucide React

## Comandos
```bash
CondoFinanceiro.bat   # iniciar com dois cliques
npm start             # http://localhost:3000
npm run build
```

## Arquitetura
- Dados em `localStorage` — sem backend
- Estado central: `src/hooks/useStore.js`
- Exportação Obsidian: `src/utils/obsidian.js` (gera relatórios com frontmatter)
- Dados seed (2021–2022): `src/utils/data.js`

## Módulos principais
Dashboard Anual · Mês (receitas, despesas, saldo, pontualidade) · Inadimplência · Apartamentos · Configurações

## Integração Obsidian
O app gera relatórios mensais no formato Obsidian — arquivar em `C:\Projects\MinhaMente\Condomínio\`

## Documentação completa
`C:\Projects\MinhaMente\Projetos\CondoFinanceiro — Gestão de Condomínio.md`
