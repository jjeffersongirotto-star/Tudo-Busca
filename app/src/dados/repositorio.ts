/** Carga inicial e aplicação de dados novos (cópia embutida + cópia do aparelho + servidor), categoria por categoria. */
import type { Dados } from '@/logica/tipos';
import { combinarDados, marcarNovos, valido } from '@/logica/dados';
import { lerCache, guardarCache, lerVistos, guardarVistos } from './armazenamento';
import { semente } from './semente';

export const DADOS_VAZIOS: Dados = {cupons: [], produtos: [], ultimaAtualizacao: '', ultimaAtualizacaoTexto: ''};

/** Junta o que existe no aparelho (embutido + guardado) sem rede. */
export async function carregarLocal(): Promise<{dados: Dados; novos: Set<string>; temDados: boolean}> {
  const base = semente();
  const cache = await lerCache();
  let dados: Dados = valido(base) ? base : DADOS_VAZIOS;
  if (cache) dados = dados.produtos.length ? combinarDados(dados, cache).dados : cache;
  const temDados = dados.produtos.length > 0;
  const m = temDados ? marcarNovos(dados, await lerVistos()) : {novos: new Set<string>(), vistos: null};
  if (m.vistos) await guardarVistos(m.vistos);
  return {dados, novos: m.novos, temDados};
}

/** Aplica dados do servidor: só as categorias (e cupons) mais recentes que as atuais. null = nada mudou. */
export async function aplicarDados(atual: Dados, novo: unknown): Promise<{dados: Dados; novos: Set<string>; vieram: string[]} | null> {
  if (!valido(novo)) return null;
  const r = atual.produtos.length ? combinarDados(atual, novo) : {dados: novo, vieram: ['*'], cuponsNovos: true};
  if (!r.vieram.length && !r.cuponsNovos) return null;
  await guardarCache(r.dados);
  const m = marcarNovos(r.dados, await lerVistos());
  await guardarVistos(m.vistos);
  return {dados: r.dados, novos: m.novos, vieram: r.vieram};
}
