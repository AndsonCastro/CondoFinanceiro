import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmt, MESES_FULL, MESES, calcTotais, calcAnual } from './data';

const COR_VERDE  = [16, 217, 150];
const COR_VERM   = [255, 77, 109];
const COR_AZUL   = [77, 143, 255];
const COR_HEADER = [19, 24, 37];

export const gerarRelatorioPDF = (mesData, config) => {
  const doc = new jsPDF();
  const { mes, ano } = mesData;
  const totais = calcTotais(mesData);
  const nomeMes = MESES_FULL[mes - 1];
  const condo = config?.nome_condominio || 'Condomínio';
  const naoPago = mesData.pontualidade.total_unidades - mesData.pontualidade.pago_ate_dia10 - mesData.pontualidade.pago_apos_dia10;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(...COR_HEADER);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(232, 237, 245);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text(condo, 14, 13);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Financeiro — ${nomeMes}/${ano}`, 14, 21);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 196, 21, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // ── Resumo do mês ──────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: 36,
    head: [['Indicador', 'Valor']],
    body: [
      ['Saldo Inicial', fmt(mesData.saldo_inicial)],
      ['Total de Receitas', fmt(totais.totalReceitas)],
      ['Total de Despesas', fmt(totais.totalDespesas)],
      ['Movimento Líquido', fmt(totais.movLiquido)],
      ['Saldo Final', fmt(totais.saldoFinal)],
    ],
    theme: 'striped',
    headStyles: { fillColor: COR_AZUL, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  // ── Receitas ───────────────────────────────────────────────────────────────
  const y1 = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COR_VERDE);
  doc.text('Receitas', 14, y1);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: y1 + 4,
    head: [['Descrição', 'Categoria', 'Valor']],
    body: mesData.receitas.length
      ? mesData.receitas.map(r => [r.descricao, r.categoria, fmt(r.valor)])
      : [['Nenhuma receita registrada', '', '']],
    foot: [['Total', '', fmt(totais.totalReceitas)]],
    theme: 'striped',
    headStyles: { fillColor: COR_VERDE, textColor: 255 },
    footStyles: { fillColor: [230, 255, 245], textColor: [0, 100, 60], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' } },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  // ── Despesas ───────────────────────────────────────────────────────────────
  const y2 = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COR_VERM);
  doc.text('Despesas', 14, y2);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: y2 + 4,
    head: [['Descrição', 'Categoria', 'Valor']],
    body: mesData.despesas.length
      ? mesData.despesas.map(d => [d.descricao, d.categoria, fmt(d.valor)])
      : [['Nenhuma despesa registrada', '', '']],
    foot: [['Total', '', fmt(totais.totalDespesas)]],
    theme: 'striped',
    headStyles: { fillColor: COR_VERM, textColor: 255 },
    footStyles: { fillColor: [255, 235, 238], textColor: [150, 0, 30], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right' } },
    bodyStyles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  // ── Pontualidade ───────────────────────────────────────────────────────────
  const y3 = doc.lastAutoTable.finalY + 8;
  if (y3 < 250) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Pontualidade de Pagamentos', 14, y3);
    const pont = mesData.pontualidade;
    autoTable(doc, {
      startY: y3 + 4,
      head: [['Status', 'Unidades', '%']],
      body: [
        ['Pago até dia 10', pont.pago_ate_dia10, `${pont.total_unidades > 0 ? ((pont.pago_ate_dia10 / pont.total_unidades) * 100).toFixed(0) : 0}%`],
        ['Pago após dia 10', pont.pago_apos_dia10, `${pont.total_unidades > 0 ? ((pont.pago_apos_dia10 / pont.total_unidades) * 100).toFixed(0) : 0}%`],
        ['Não pago', Math.max(naoPago, 0), `${pont.total_unidades > 0 ? ((Math.max(naoPago, 0) / pont.total_unidades) * 100).toFixed(0) : 0}%`],
      ],
      theme: 'striped',
      headStyles: { fillColor: COR_AZUL, textColor: 255 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
      bodyStyles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Notas ──────────────────────────────────────────────────────────────────
  if (mesData.notas?.trim()) {
    const yn = (doc.lastAutoTable?.finalY || y3) + 8;
    if (yn < 260) {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 14, yn);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(mesData.notas, 182);
      doc.text(lines, 14, yn + 6);
    }
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.height;
  doc.setFontSize(8); doc.setTextColor(150, 150, 150);
  doc.text(`${condo} — ${nomeMes}/${ano}`, 14, pageH - 8);
  doc.text('Gerado pelo Sistema de Gestão do Condomínio', 196, pageH - 8, { align: 'right' });

  doc.save(`relatorio_${condo.replace(/\s+/g, '_')}_${nomeMes}_${ano}.pdf`);
};

const addImg = (doc, img, x, y, maxW, maxH) => {
  if (!img) return 0;
  const ratio = img.w / img.h;
  let w = maxW, h = maxW / ratio;
  if (h > maxH) { h = maxH; w = maxH * ratio; }
  doc.addImage(img.data, 'PNG', x, y, w, h);
  return h;
};

export const gerarRelatorioAnualPDF = (meses, ano, config, imgs = {}) => {
  const doc = new jsPDF('landscape');
  const condo = config?.nome_condominio || 'Condomínio';
  const totais = calcAnual(meses);
  const W = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;

  const rodape = (label) => {
    doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`${condo} — Relatório Anual ${ano} ${label}`, 14, pageH - 6);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, W - 14, pageH - 6, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  };

  // ── Página 1: Cabeçalho + KPIs + Resumo mensal ─────────────────────────────
  doc.setFillColor(...COR_HEADER);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(232, 237, 245);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text(condo, 14, 13);
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Anual — ${ano}`, 14, 22);
  doc.setFontSize(9);
  doc.text(`${meses.length} meses registrados`, W - 14, 22, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // KPIs em caixas
  const kpis = [
    { label: 'Total Receitas',   value: fmt(totais.totalReceitas), color: COR_VERDE },
    { label: 'Total Despesas',   value: fmt(totais.totalDespesas), color: COR_VERM  },
    { label: 'Resultado Líquido',value: fmt(totais.movLiquido),    color: totais.movLiquido >= 0 ? COR_VERDE : COR_VERM },
    { label: 'Saldo Final',      value: fmt(totais.saldoFinal),    color: COR_AZUL  },
  ];
  const boxW = (W - 28 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(25, 32, 48);
    doc.roundedRect(x, 33, boxW, 22, 3, 3, 'F');
    doc.setFontSize(8); doc.setTextColor(120, 130, 155); doc.setFont('helvetica', 'normal');
    doc.text(k.label.toUpperCase(), x + 4, 40);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...k.color);
    doc.text(k.value, x + 4, 50);
  });
  doc.setTextColor(0, 0, 0);

  // ── Gráficos página 1: Receitas vs Despesas + Evolução do Saldo ───────────
  const gW = (W - 28 - 6) / 2; // largura de cada gráfico
  const gH = 70; // altura máxima
  const gY = 60;

  if (imgs.recDesp) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120,130,155);
    doc.text('RECEITAS VS DESPESAS', 14, gY - 2);
    doc.setTextColor(0,0,0);
    addImg(doc, imgs.recDesp, 14, gY, gW, gH);
  }
  if (imgs.saldo) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120,130,155);
    doc.text('EVOLUÇÃO DO SALDO', 14 + gW + 6, gY - 2);
    doc.setTextColor(0,0,0);
    addImg(doc, imgs.saldo, 14 + gW + 6, gY, gW, gH);
  }

  const g2Y = gY + gH + 8;
  if (imgs.resultado) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120,130,155);
    doc.text('RESULTADO MENSAL', 14, g2Y - 2);
    doc.setTextColor(0,0,0);
    addImg(doc, imgs.resultado, 14, g2Y, gW, gH);
  }
  if (imgs.composicao) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120,130,155);
    doc.text('COMPOSIÇÃO DAS DESPESAS', 14 + gW + 6, g2Y - 2);
    doc.setTextColor(0,0,0);
    addImg(doc, imgs.composicao, 14 + gW + 6, g2Y, gW, gH);
  }

  rodape('(1/3)');

  // ── Página 2: Projeção + Resumo mensal ─────────────────────────────────────
  doc.addPage('landscape');
  doc.setFillColor(...COR_HEADER);
  doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(232, 237, 245);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`${condo} — Projeção e Resumo Mensal — ${ano}`, 14, 12);
  doc.setTextColor(0, 0, 0);

  let nextY = 24;
  if (imgs.projecao) {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120,130,155);
    doc.text('PROJEÇÃO PARA O ANO', 14, nextY - 2);
    doc.setTextColor(0,0,0);
    const h = addImg(doc, imgs.projecao, 14, nextY, W - 28, 65);
    nextY += h + 8;
  }

  // Resumo mensal por mês
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Resumo Mensal', 14, nextY);
  nextY += 3;

  autoTable(doc, {
    startY: nextY,
    head: [['Mês', 'Saldo Inicial', 'Receitas', 'Despesas', 'Resultado', 'Saldo Final']],
    body: meses.map(m => {
      const t = calcTotais(m);
      return [
        MESES_FULL[m.mes - 1],
        fmt(m.saldo_inicial),
        fmt(t.totalReceitas),
        fmt(t.totalDespesas),
        (t.movLiquido >= 0 ? '+' : '') + fmt(t.movLiquido),
        fmt(t.saldoFinal),
      ];
    }),
    foot: [['TOTAL', fmt(totais.saldoInicial), fmt(totais.totalReceitas), fmt(totais.totalDespesas),
      (totais.movLiquido >= 0 ? '+' : '') + fmt(totais.movLiquido), fmt(totais.saldoFinal)]],
    theme: 'striped',
    headStyles: { fillColor: COR_AZUL, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [25, 32, 48], textColor: [180, 190, 210], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' }, 2: { halign: 'right', textColor: [16, 180, 120] },
      3: { halign: 'right', textColor: [220, 60, 80] },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', textColor: [77, 143, 255], fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  rodape('(2/3)');

  // ── Página 3: Despesas por categoria + Detalhamento mensal ─────────────────
  doc.addPage('landscape');

  doc.setFillColor(...COR_HEADER);
  doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(232, 237, 245);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text(`${condo} — Detalhamento de Despesas por Categoria — ${ano}`, 14, 12);
  doc.setTextColor(0,0,0);
  doc.setTextColor(0, 0, 0);

  // Categorias agregadas
  const catMap = {};
  meses.forEach(m => m.despesas.forEach(({ categoria, valor }) => {
    catMap[categoria] = (catMap[categoria] || 0) + valor;
  }));
  const categorias = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Composição das Despesas', 14, 26);

  autoTable(doc, {
    startY: 29,
    head: [['Categoria', 'Total Ano', '% do Total', 'Média/Mês']],
    body: categorias.map(([cat, val]) => [
      cat,
      fmt(val),
      totais.totalDespesas > 0 ? ((val / totais.totalDespesas) * 100).toFixed(1) + '%' : '0%',
      fmt(val / (meses.length || 1)),
    ]),
    foot: [['TOTAL', fmt(totais.totalDespesas), '100%', fmt(totais.totalDespesas / (meses.length || 1))]],
    theme: 'striped',
    headStyles: { fillColor: COR_VERM, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: [60, 15, 20], textColor: [255, 130, 140], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // Detalhamento mês a mês por categoria (tabela cruzada)
  const y2 = doc.lastAutoTable.finalY + 10;
  if (y2 < pageH - 40) {
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('Despesas por Categoria × Mês', 14, y2);

    const catNames = categorias.map(([c]) => c);
    const head = [['Categoria', ...meses.map(m => MESES[m.mes - 1]), 'Total']];
    const body = catNames.map(cat => {
      const vals = meses.map(m => {
        const v = m.despesas.filter(d => d.categoria === cat).reduce((s, d) => s + d.valor, 0);
        return v > 0 ? fmt(v) : '—';
      });
      const total = catMap[cat] || 0;
      return [cat, ...vals, fmt(total)];
    });

    autoTable(doc, {
      startY: y2 + 3,
      head,
      body,
      theme: 'striped',
      headStyles: { fillColor: COR_HEADER, textColor: [180, 190, 210], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: Object.fromEntries(
        [1, ...meses.map((_, i) => i + 1), meses.length + 1].map(i => [i, { halign: 'right' }])
      ),
      margin: { left: 14, right: 14 },
    });
  }

  rodape('(3/3)');

  doc.save(`relatorio_anual_${condo.replace(/\s+/g, '_')}_${ano}.pdf`);
};
