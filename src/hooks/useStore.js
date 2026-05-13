import { useState, useCallback, useEffect } from 'react';
import { loadData, saveData, createMes, calcTotais, uid, PONTUALIDADE_TOTAL_UNIDADES } from '../utils/data';

const EMPTY_DATA = {
  config: {
    nome_condominio: 'Meu Condomínio',
    taxa_condominio: 50,
    contatos: {},
    fundo_reserva_meta: 0,
    orcamento: {},
    despesas_recorrentes: [],
  },
  anos: {},
};

const deepMerge = (target, source) => {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

export default function useStore() {
  const [data, setData] = useState(() => {
    const stored = loadData();
    if (!stored.anos || Object.keys(stored.anos).length === 0) return EMPTY_DATA;
    return stored;
  });

  // Persiste automaticamente
  useEffect(() => { saveData(data); }, [data]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = fn(structuredClone(prev));
      return next;
    });
  }, []);

  // ─── CONFIG ─────────────────────────────────────────────────────────────────
  const updateConfig = useCallback((patch) => {
    update(d => { d.config = { ...d.config, ...patch }; return d; });
  }, [update]);

  // ─── MESES ──────────────────────────────────────────────────────────────────
  const getMes = useCallback((ano, mes) => {
    return data.anos?.[ano]?.meses?.[mes] || null;
  }, [data]);

  const getAno = useCallback((ano) => {
    const meses = data.anos?.[ano]?.meses || {};
    return Object.values(meses).sort((a, b) => a.mes - b.mes);
  }, [data]);

  const getAnos = useCallback(() => {
    return Object.keys(data.anos || {}).map(Number).sort();
  }, [data]);

  const createOrGetMes = useCallback((ano, mes) => {
    const existing = data.anos?.[ano]?.meses?.[mes];
    if (existing) return existing;

    // Calcula saldo inicial do mês anterior
    let saldo_inicial = 0;
    const mesList = Object.values(data.anos?.[ano]?.meses || {}).sort((a, b) => a.mes - b.mes);
    const prevMes = mesList.find(m => m.mes === mes - 1);
    if (prevMes) {
      saldo_inicial = calcTotais(prevMes).saldoFinal;
    } else if (mes === 1) {
      // Tenta pegar dezembro do ano anterior
      const prevYearMeses = Object.values(data.anos?.[ano - 1]?.meses || {});
      const dez = prevYearMeses.find(m => m.mes === 12);
      if (dez) saldo_inicial = calcTotais(dez).saldoFinal;
    }

    const novo = createMes({ mes, ano, saldo_inicial });
    const recorrentes = (data.config?.despesas_recorrentes || []).map(r => ({ ...r, id: uid() }));
    if (recorrentes.length) novo.despesas = recorrentes;
    update(d => {
      if (!d.anos[ano]) d.anos[ano] = { meses: {} };
      d.anos[ano].meses[mes] = novo;
      return d;
    });
    return novo;
  }, [data, update]);

  const updateMes = useCallback((ano, mes, patch) => {
    update(d => {
      if (!d.anos[ano]?.meses?.[mes]) return d;
      d.anos[ano].meses[mes] = deepMerge(d.anos[ano].meses[mes], patch);
      return d;
    });
  }, [update]);

  const deleteMes = useCallback((ano, mes) => {
    update(d => {
      if (d.anos[ano]?.meses) delete d.anos[ano].meses[mes];
      if (d.anos[ano] && Object.keys(d.anos[ano].meses || {}).length === 0) delete d.anos[ano];
      return d;
    });
  }, [update]);

  // ─── RECEITAS ───────────────────────────────────────────────────────────────
  const addReceita = useCallback((ano, mes, receita) => {
    update(d => {
      d.anos[ano].meses[mes].receitas.push({ ...receita, id: uid() });
      return d;
    });
  }, [update]);

  const updateReceita = useCallback((ano, mes, id, patch) => {
    update(d => {
      const idx = d.anos[ano].meses[mes].receitas.findIndex(r => r.id === id);
      if (idx >= 0) d.anos[ano].meses[mes].receitas[idx] = { ...d.anos[ano].meses[mes].receitas[idx], ...patch };
      return d;
    });
  }, [update]);

  const deleteReceita = useCallback((ano, mes, id) => {
    update(d => {
      d.anos[ano].meses[mes].receitas = d.anos[ano].meses[mes].receitas.filter(r => r.id !== id);
      return d;
    });
  }, [update]);

  // ─── DESPESAS ───────────────────────────────────────────────────────────────
  const addDespesa = useCallback((ano, mes, despesa) => {
    update(d => {
      d.anos[ano].meses[mes].despesas.push({ ...despesa, id: uid() });
      return d;
    });
  }, [update]);

  const updateDespesa = useCallback((ano, mes, id, patch) => {
    update(d => {
      const idx = d.anos[ano].meses[mes].despesas.findIndex(r => r.id === id);
      if (idx >= 0) d.anos[ano].meses[mes].despesas[idx] = { ...d.anos[ano].meses[mes].despesas[idx], ...patch };
      return d;
    });
  }, [update]);

  const deleteDespesa = useCallback((ano, mes, id) => {
    update(d => {
      d.anos[ano].meses[mes].despesas = d.anos[ano].meses[mes].despesas.filter(r => r.id !== id);
      return d;
    });
  }, [update]);

  // ─── PENDÊNCIAS ─────────────────────────────────────────────────────────────
  const addPendencia = useCallback((ano, mes, pendencia) => {
    update(d => {
      d.anos[ano].meses[mes].pendencias.push({ ...pendencia, id: uid(), resolvida: false });
      return d;
    });
  }, [update]);

  const togglePendencia = useCallback((ano, mes, id) => {
    update(d => {
      const p = d.anos[ano].meses[mes].pendencias.find(p => p.id === id);
      if (p) p.resolvida = !p.resolvida;
      return d;
    });
  }, [update]);

  const deletePendencia = useCallback((ano, mes, id) => {
    update(d => {
      d.anos[ano].meses[mes].pendencias = d.anos[ano].meses[mes].pendencias.filter(p => p.id !== id);
      return d;
    });
  }, [update]);

  // ─── PONTUALIDADE ───────────────────────────────────────────────────────────
  const updatePontualidade = useCallback((ano, mes, patch) => {
    update(d => {
      d.anos[ano].meses[mes].pontualidade = { ...d.anos[ano].meses[mes].pontualidade, ...patch };
      return d;
    });
  }, [update]);

  // ─── PAGAMENTOS POR APARTAMENTO ─────────────────────────────────────────────
  const TAXA_COND = data.config?.taxa_condominio || 50;
  const ID_TAXA_CHECKLIST = '__taxa_checklist__';

  const updatePagamentosAptos = useCallback((ano, mes, pagamentos) => {
    update(d => {
      if (!d.anos[ano]?.meses?.[mes]) return d;

      // 1. Salva o mapa de pagamentos
      d.anos[ano].meses[mes].pagamentos_aptos = pagamentos;

      // 2. Recalcula pontualidade
      let pago_ate_dia10 = 0;
      let pago_apos_dia10 = 0;
      Object.values(pagamentos).forEach(status => {
        if (status === 'ate10')  pago_ate_dia10++;
        if (status === 'apos10') pago_apos_dia10++;
      });
      const inabitavelCount = Object.values(d.config?.contatos || {}).filter(c => c.inabitavel).length;
      d.anos[ano].meses[mes].pontualidade = { total_unidades: PONTUALIDADE_TOTAL_UNIDADES - inabitavelCount, pago_ate_dia10, pago_apos_dia10 };

      // 3. Upsert receita de Taxa de Condomínio gerada pelo checklist
      const totalPagos = pago_ate_dia10 + pago_apos_dia10;
      const valorTaxa = totalPagos * TAXA_COND;
      const receitas = d.anos[ano].meses[mes].receitas;
      const idx = receitas.findIndex(r => r.id === ID_TAXA_CHECKLIST);

      if (totalPagos === 0) {
        d.anos[ano].meses[mes].receitas = receitas.filter(r => r.id !== ID_TAXA_CHECKLIST);
      } else if (idx >= 0) {
        receitas[idx].valor = valorTaxa;
        receitas[idx].descricao = `Taxa de Condomínio (${totalPagos} aptos x R$ ${TAXA_COND.toFixed(2)})`;
      } else {
        receitas.unshift({
          id: ID_TAXA_CHECKLIST,
          descricao: `Taxa de Condomínio (${totalPagos} aptos x R$ ${TAXA_COND.toFixed(2)})`,
          categoria: 'Taxa de Condomínio',
          valor: valorTaxa,
          _auto: true,
        });
      }

      return d;
    });
  }, [update]);

  // ─── NOTAS ──────────────────────────────────────────────────────────────────
  const updateNotas = useCallback((ano, mes, notas) => {
    update(d => { d.anos[ano].meses[mes].notas = notas; return d; });
  }, [update]);

  // ─── IMPORTAR / RESETAR ─────────────────────────────────────────────────────
  const importData = useCallback((imported) => {
    setData(imported);
  }, []);

  const resetToSeed = useCallback(() => {
    setData(EMPTY_DATA);
  }, []);

  return {
    data, config: data.config,
    updateConfig,
    getMes, getAno, getAnos, createOrGetMes, updateMes, deleteMes,
    addReceita, updateReceita, deleteReceita,
    addDespesa, updateDespesa, deleteDespesa,
    addPendencia, togglePendencia, deletePendencia,
    updatePontualidade, updatePagamentosAptos, updateNotas,
    importData, resetToSeed,
  };
}
