# 🏢 Gestão Financeira — Condomínio

Dashboard completo para gestão financeira de condomínio, com dados históricos da planilha 2021–2022 pré-carregados.

---

## 🚀 Como rodar

### Pré-requisitos
- Node.js 16+ instalado → https://nodejs.org

### Instalação

```bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento
npm start
```

A aplicação abrirá automaticamente em **http://localhost:3000**

---

## 📦 Funcionalidades

### Por Mês
- ✅ **Receitas** — Adicionar, editar, excluir (Taxa, Multas, Atrasados, Outros)
- ✅ **Despesas** — Adicionar, editar, excluir com categorias (Enel, Internet, Serviços, Obras...)
- ✅ **Saldo Inicial** — Calculado automaticamente do mês anterior (editável)
- ✅ **Pontualidade** — Pago até dia 10, após dia 10, não pago (com barras de progresso)
- ✅ **Pendências** — Registro de contas a pagar/receber com marcação de resolução
- ✅ **Notas** — Campo livre para observações e atas

### Dashboard Anual
- 📊 Gráficos de Receitas vs Despesas
- 📈 Evolução do saldo ao longo do ano
- 🔮 Projeção financeira para o restante do ano
- 🚦 Indicadores de saúde financeira
- 📋 Tabela resumo com totais

### Dados & Backup
- 💾 **Auto-save** no localStorage (navegador)
- ⬇️ **Exportar JSON** — backup completo dos dados
- ⬆️ **Importar JSON** — restaurar backup
- 🔄 **Reset** — volta para os dados originais da planilha (Jan/2021 – Set/2022)

---

## 🗂 Estrutura do Projeto

```
src/
├── App.jsx              # Layout principal + navegação
├── hooks/
│   └── useStore.js      # Gerenciamento de estado (central)
├── utils/
│   └── data.js          # Utilitários, constantes, dados seed
└── components/
    ├── UI.jsx            # Componentes reutilizáveis (Btn, Card, Modal...)
    ├── MesView.jsx       # Tela de gerenciamento mensal
    ├── DashboardAnual.jsx # Dashboard com gráficos anuais
    └── ConfigView.jsx    # Configurações e backup
```

---

## 💡 Dicas de Uso

1. **Novo Mês** — Clique em "Novo Mês" na sidebar. O saldo inicial é preenchido automaticamente.
2. **Editar Lançamento** — Passe o mouse sobre a linha e clique no ícone ✏️.
3. **Backup** — Em Configurações → "Exportar Backup" antes de limpar o navegador.
4. **Projeção** — Disponível quando o ano tem pelo menos 3 meses registrados.

---

Gerado com base na planilha `Demonstrativo_de_Receitas_2022.xlsx`
