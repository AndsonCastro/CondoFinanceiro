import { useState, useCallback, useEffect } from 'react';
import { loadData, saveData, createMes, calcTotais, uid, PONTUALIDADE_TOTAL_UNIDADES, getTaxaParaMes } from '../utils/data';

const EMPTY_DATA = {
  config: {
    nome_condominio: 'Meu Condomínio',
    taxa_condominio: 50,
    contatos: {},
    fundo_reserva_meta: 0,
    orcamento: {},
    despesas_recorrentes: [],
    adiantamentos: [],
  },
  anos: {},
};

const mesAbs = (ano, mes) => ano * 12 + mes;
// Adiantamento cobre apenas os meses APÓS o mês de origem (o mês atual fica no checklist normal)
export const isAdiantadoParaMes = (apto, ano, mes, adiantamentos) =>
  (adiantamentos || []).some(a =>
    a.apto === apto &&
    mesAbs(ano, mes) > mesAbs(a.ano_origem, a.mes_origem) &&
    mesAbs(ano, mes) <= mesAbs(a.ano_origem, a.mes_origem) + a.qtd_meses
  );

const calcValorTardio = (anoRef, mesRef, config) => {
  const vig = config?.taxa_vigencia;
  const taxaAnterior = config?.taxa_anterior ?? config?.taxa_condominio ?? 50;
  const taxaAtual = config?.taxa_condominio ?? 50;
  // +10% apenas para meses ESTRITAMENTE APÓS a vigência (mês da vigência ainda usa taxa anterior)
  const isNovaEra = vig
    ? (anoRef > vig.ano || (anoRef === vig.ano && mesRef > vig.mes))
    : false;
  return isNovaEra ? Math.round(taxaAtual * 1.10 * 100) / 100 : taxaAnterior;
};

const migrateTardioValues = (data) => {
  for (const anoData of Object.values(data.anos || {})) {
    for (const mesData of Object.values(anoData.meses || {})) {
      for (const r of mesData.receitas || []) {
        if (r._tardio && r._ano_ref != null && r._mes_ref != null) {
          r.valor = calcValorTardio(r._ano_ref, r._mes_ref, data.config);
        }
      }
    }
  }
  return data;
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
    // Migra adiantamentos v1 (qtd_meses incluía mês de origem) → v2 (apenas meses futuros)
    for (const adt of stored.config?.adiantamentos || []) {
      if (!adt._v2 && adt.qtd_meses > 0) {
        adt.qtd_meses -= 1;
        adt._v2 = true;
        // Corrige também a receita vinculada (valor e descrição)
        const q = adt.qtd_meses;
        for (const anoData of Object.values(stored.anos || {})) {
          for (const mesData of Object.values(anoData.meses || {})) {
            for (const r of mesData.receitas || []) {
              if (r._adt_id === adt.id) {
                r.descricao = `Adiantamento (${q} ${q === 1 ? 'mês' : 'meses'})`;
                r.valor = Math.round(q * adt.taxa * 100) / 100;
              }
            }
          }
        }
      }
    }
    return migrateTardioValues(stored);
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
  const updateConfig = useCallback((patch, opts = {}) => {
    update(d => {
      const oldTaxa = d.config?.taxa_condominio;
      d.config = { ...d.config, ...patch };
      const newTaxa = d.config?.taxa_condominio;

      if (patch.taxa_condominio !== undefined && newTaxa !== oldTaxa) {
        const { vigenteAno, vigenteMes } = opts;
        if (vigenteAno && vigenteMes) {
          d.config.taxa_anterior = oldTaxa;
          d.config.taxa_vigencia = { ano: vigenteAno, mes: vigenteMes };
        }
        for (const [anoStr, anoData] of Object.entries(d.anos || {})) {
          for (const [mesStr, mesData] of Object.entries(anoData.meses || {})) {
            const a = parseInt(anoStr), m = parseInt(mesStr);
            const isBefore = vigenteAno && vigenteMes && (a < vigenteAno || (a === vigenteAno && m < vigenteMes));
            const taxaAplicar = isBefore ? oldTaxa : newTaxa;
            const idx = mesData.receitas.findIndex(r => r.id === '__taxa_checklist__');
            if (idx >= 0) {
              const totalPagos = (mesData.pontualidade?.pago_ate_dia10 || 0) + (mesData.pontualidade?.pago_apos_dia10 || 0);
              mesData.receitas[idx].valor = totalPagos * taxaAplicar;
              mesData.receitas[idx].descricao = `Taxa de Condomínio (${totalPagos} aptos x R$ ${taxaAplicar.toFixed(2)})`;
            }
          }
        }
      }

      return d;
    });
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
      const mesData = d.anos[ano]?.meses?.[mes];
      if (mesData) {
        (mesData.receitas || []).forEach(r => {
          if (r._tardio && r._apto && r._mes_ref != null && r._ano_ref != null) {
            const tardiosRef = d.anos[r._ano_ref]?.meses?.[r._mes_ref]?.pagamentos_tardios;
            if (tardiosRef) delete tardiosRef[r._apto];
          }
        });
        delete d.anos[ano].meses[mes];
      }
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
  const ID_TAXA_CHECKLIST = '__taxa_checklist__';

  const updatePagamentosAptos = useCallback((ano, mes, pagamentos) => {
    update(d => {
      if (!d.anos[ano]?.meses?.[mes]) return d;

      // Usa taxa vigente para o mês (respeita histórico de vigência)
      const TAXA_COND = getTaxaParaMes(ano, mes, d.config);

      // 1. Salva o mapa de pagamentos
      d.anos[ano].meses[mes].pagamentos_aptos = pagamentos;

      // 2. Recalcula pontualidade (exclui adiantados — já contabilizados em receita separada)
      const adts = d.config?.adiantamentos || [];
      let pago_ate_dia10 = 0;
      let pago_apos_dia10 = 0;
      Object.entries(pagamentos).forEach(([key, status]) => {
        if (isAdiantadoParaMes(key, ano, mes, adts)) return;
        if (status === 'ate10')  pago_ate_dia10++;
        if (status === 'apos10') pago_apos_dia10++;
      });
      const excluidos = Object.values(d.config?.contatos || {}).filter(c => c.inabitavel || c.isento).length;
      d.anos[ano].meses[mes].pontualidade = { total_unidades: PONTUALIDADE_TOTAL_UNIDADES - excluidos, pago_ate_dia10, pago_apos_dia10 };

      // 3. Upsert receita de Taxa de Condomínio gerada pelo checklist
      const totalPagos = pago_ate_dia10 + pago_apos_dia10;
      const valorTaxa = totalPagos * TAXA_COND;
      const receitas = d.anos[ano].meses[mes].receitas;
      const idx = receitas.findIndex(r => r.id === ID_TAXA_CHECKLIST);

      if (totalPagos === 0) {
        d.anos[ano].meses[mes].receitas = receitas.filter(r => r.id !== ID_TAXA_CHECKLIST);
      } else if (idx >= 0) {
        receitas[idx].valor = valorTaxa;
        receitas[idx].descricao = 'Taxa de Condomínio';
      } else {
        receitas.unshift({
          id: ID_TAXA_CHECKLIST,
          descricao: 'Taxa de Condomínio',
          categoria: 'Taxa de Condomínio',
          valor: valorTaxa,
          _auto: true,
        });
      }

      return d;
    });
  }, [update]);

  // ─── PAGAMENTOS TARDIOS ──────────────────────────────────────────────────────
  const registrarPagamentoTardio = useCallback((anoAtual, mesAtual, apto, anoRef, mesRef) => {
    update(d => {
      if (!d.anos[anoAtual]?.meses?.[mesAtual]) return d;
      if (!d.anos[anoRef]?.meses?.[mesRef]) return d;
      const valor = calcValorTardio(anoRef, mesRef, d.config);
      const [, bloco, apNum] = apto.match(/^B(\d+)-(\d+)$/) || ['', apto, apto];
      const pad = n => String(n).padStart(2, '0');
      d.anos[anoAtual].meses[mesAtual].receitas.push({
        id: uid(),
        descricao: `Pg Bl ${bloco} Ap ${apNum} Mês ${pad(mesRef)}/${anoRef}`,
        categoria: 'Taxa de Condomínio',
        valor,
        _tardio: true,
        _apto: apto,
        _mes_ref: mesRef,
        _ano_ref: anoRef,
      });
      if (!d.anos[anoRef].meses[mesRef].pagamentos_tardios)
        d.anos[anoRef].meses[mesRef].pagamentos_tardios = {};
      d.anos[anoRef].meses[mesRef].pagamentos_tardios[apto] = { mes_pago: mesAtual, ano_pago: anoAtual };
      return d;
    });
  }, [update]);

  const desfazerPagamentoTardio = useCallback((anoAtual, mesAtual, apto, anoRef, mesRef) => {
    update(d => {
      if (d.anos[anoAtual]?.meses?.[mesAtual]) {
        d.anos[anoAtual].meses[mesAtual].receitas =
          d.anos[anoAtual].meses[mesAtual].receitas.filter(
            r => !(r._tardio && r._apto === apto && r._mes_ref === mesRef && r._ano_ref === anoRef)
          );
      }
      if (d.anos[anoRef]?.meses?.[mesRef]?.pagamentos_tardios)
        delete d.anos[anoRef].meses[mesRef].pagamentos_tardios[apto];
      return d;
    });
  }, [update]);

  // ─── PAGAMENTOS ADIANTADOS ───────────────────────────────────────────────────
  const registrarAdiantamento = useCallback((anoAtual, mesAtual, apto, qtdMeses) => {
    // qtdMeses = meses ADIANTADOS (não inclui o mês atual)
    update(d => {
      if (!d.anos[anoAtual]?.meses?.[mesAtual]) return d;
      const taxa = getTaxaParaMes(anoAtual, mesAtual, d.config);
      const receitaId = uid();
      const adtId = uid();

      // 1. Auto-marca o mês atual como pago (≤10 ou >10 conforme o dia)
      const diaHoje = new Date().getDate();
      const venc = parseInt(d.config?.contatos?.[apto]?.vencimento) || 10;
      const statusPago = diaHoje <= venc ? 'ate10' : 'apos10';
      if (!d.anos[anoAtual].meses[mesAtual].pagamentos_aptos)
        d.anos[anoAtual].meses[mesAtual].pagamentos_aptos = {};
      d.anos[anoAtual].meses[mesAtual].pagamentos_aptos[apto] = statusPago;

      // 2. Recalcula checklist receipt para incluir o mês atual
      const pagamentos = d.anos[anoAtual].meses[mesAtual].pagamentos_aptos;
      const adtsSnap = d.config?.adiantamentos || [];
      let pago_ate = 0;
      let pago_apos = 0;
      Object.entries(pagamentos).forEach(([key, s]) => {
        if (isAdiantadoParaMes(key, anoAtual, mesAtual, adtsSnap)) return;
        if (s === 'ate10') pago_ate++;
        if (s === 'apos10') pago_apos++;
      });
      const excluidos = Object.values(d.config?.contatos || {}).filter(c => c.inabitavel || c.isento).length;
      d.anos[anoAtual].meses[mesAtual].pontualidade = { total_unidades: PONTUALIDADE_TOTAL_UNIDADES - excluidos, pago_ate_dia10: pago_ate, pago_apos_dia10: pago_apos };
      const totalPagos = pago_ate + pago_apos;
      const valorTaxa = totalPagos * taxa;
      const receitas = d.anos[anoAtual].meses[mesAtual].receitas;
      const idxChecklist = receitas.findIndex(r => r.id === ID_TAXA_CHECKLIST);
      if (totalPagos === 0) {
        d.anos[anoAtual].meses[mesAtual].receitas = receitas.filter(r => r.id !== ID_TAXA_CHECKLIST);
      } else if (idxChecklist >= 0) {
        receitas[idxChecklist].valor = valorTaxa;
      } else {
        receitas.unshift({ id: ID_TAXA_CHECKLIST, descricao: 'Taxa de Condomínio', categoria: 'Taxa de Condomínio', valor: valorTaxa, _auto: true });
      }

      // 3. Receita de adiantamento — somente os meses futuros (sem bloco/ap na descrição)
      const valorAdiantamento = Math.round(qtdMeses * taxa * 100) / 100;
      d.anos[anoAtual].meses[mesAtual].receitas.push({
        id: receitaId,
        descricao: `Adiantamento (${qtdMeses} ${qtdMeses === 1 ? 'mês' : 'meses'})`,
        categoria: 'Taxa de Condomínio',
        valor: valorAdiantamento,
        _adiantado: true,
        _apto: apto,
        _adt_id: adtId,
      });

      if (!d.config.adiantamentos) d.config.adiantamentos = [];
      d.config.adiantamentos.push({ id: adtId, receita_id: receitaId, apto, mes_origem: mesAtual, ano_origem: anoAtual, qtd_meses: qtdMeses, taxa, _v2: true });

      return d;
    });
  }, [update]);

  const desfazerAdiantamento = useCallback((adtId) => {
    update(d => {
      const adts = d.config?.adiantamentos || [];
      const adt = adts.find(a => a.id === adtId);
      if (!adt) return d;

      // Remove receita
      const mesData = d.anos[adt.ano_origem]?.meses?.[adt.mes_origem];
      if (mesData) mesData.receitas = mesData.receitas.filter(r => r._adt_id !== adtId);

      // Remove do config
      d.config.adiantamentos = adts.filter(a => a.id !== adtId);
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
    registrarPagamentoTardio, desfazerPagamentoTardio,
    registrarAdiantamento, desfazerAdiantamento,
    importData, resetToSeed,
  };
}
