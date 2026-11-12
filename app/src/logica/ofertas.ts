/** Games: nota de oferta = preço comparado com o preço típico (mediana) do mesmo modelo. */
import type { Produto } from './tipos';
import { r1 } from './formato';

export const OFERTA = {fator: 2.5, minimoAnuncios: 3};   // 20% abaixo do típico = 100; no típico = 50; 20% acima = 0
export const grupoG = (n: Produto) => `${n.item}|${n.original ? n.modelo : 'Compatível (outra marca)'}`;

export interface RefG { mediana: number; min: number; qtd: number }
export interface NotaG { nota: number | null; pct?: number; ref?: RefG; motivo?: string }

export function calcularOfertas(jogos: Produto[]): {ref: Record<string, RefG>; notas: Map<string, NotaG>} {
  const ref: Record<string, RefG> = {}, notas = new Map<string, NotaG>(), grupos: Record<string, number[]> = {};
  for (const n of jogos) if (n.precoNum && !n.kit && !n.precoAntigo) (grupos[grupoG(n)] = grupos[grupoG(n)] || []).push(n.precoNum);
  for (const [k, v] of Object.entries(grupos)) {
    v.sort((a, b) => a - b);
    const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
    ref[k] = {mediana: m, min: v[0], qtd: v.length};
  }
  for (const n of jogos) {
    const r = ref[grupoG(n)];
    if (!n.precoNum || !r || r.qtd < OFERTA.minimoAnuncios || n.kit) {
      notas.set(n.id, {nota: null, ref: r, motivo: n.kit ? 'kit (vem com outro item): não dá para comparar' : 'poucos anúncios do mesmo modelo para comparar'});
      continue;
    }
    const pct = (r.mediana - n.precoNum) / r.mediana * 100;
    notas.set(n.id, {nota: r1(Math.max(0, Math.min(100, 50 + pct * OFERTA.fator))), pct: r1(pct), ref: r});
  }
  return {ref, notas};
}

export type FiltroGId = 'gModelo' | 'gMarca' | 'gLoja';
export const FILTROS_G: {id: FiltroGId; rotulo: string; fn: (n: Produto) => string; todos: string}[] = [
  {id: 'gModelo', rotulo: 'Modelo', fn: n => n.modelo || 'Não identificado', todos: 'Todos'},
  {id: 'gMarca', rotulo: 'Marca', fn: n => n.marca || 'Sem marca conhecida', todos: 'Todas'},
  {id: 'gLoja', rotulo: 'Loja', fn: n => n.loja || '', todos: 'Todas'},
];
export const OPCOES_G = {
  gPreco: [['', 'Qualquer'], ['150', 'até R$ 150'], ['250', 'até R$ 250'], ['350', 'até R$ 350'], ['400', 'até R$ 400'], ['450', 'até R$ 450'], ['500', 'até R$ 500'], ['700', 'até R$ 700'], ['1000', 'até R$ 1.000'], ['1500', 'até R$ 1.500']],
  gOrdem: [['oferta', 'Melhor oferta (padrão)'], ['asc', 'Menor preço'], ['desc', 'Maior desconto'], ['pdesc', 'Maior preço']],
} as const;

export interface EstadoFiltrosG { sel: Partial<Record<FiltroGId, string>>; gPreco: string; gOrdem: 'oferta' | 'asc' | 'desc' | 'pdesc'; gOriginal: boolean; gSemKit: boolean }
export const FILTROS_G_PADRAO: EstadoFiltrosG = {sel: {}, gPreco: '', gOrdem: 'oferta', gOriginal: true, gSemKit: false};

export function opcoesFiltrosG(base: Produto[]): Record<FiltroGId, {v: string; n: number}[]> {
  const out = {} as Record<FiltroGId, {v: string; n: number}[]>;
  for (const f of FILTROS_G) {
    const vals = [...new Set(base.map(f.fn).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    out[f.id] = vals.map(v => ({v, n: base.filter(n => f.fn(n) === v).length}));
  }
  return out;
}

export function filtradosG(produtos: Produto[], notas: Map<string, NotaG>, e: EstadoFiltrosG): Produto[] {
  let l = produtos.filter(n => FILTROS_G.every(f => !e.sel[f.id] || f.fn(n) === e.sel[f.id]));
  const preco = +e.gPreco || 0;
  if (preco) l = l.filter(n => n.precoNum != null && n.precoNum <= preco);
  if (e.gOriginal) l = l.filter(n => n.original);
  if (e.gSemKit) l = l.filter(n => !n.kit);
  const nota = (n: Produto) => notas.get(n.id)?.nota ?? -1;
  const cmp = {
    oferta: (a: Produto, b: Produto) => nota(b) - nota(a) || (a.precoNum ?? 1e12) - (b.precoNum ?? 1e12),
    asc: (a: Produto, b: Produto) => (a.precoNum ?? 1e12) - (b.precoNum ?? 1e12),
    desc: (a: Produto, b: Produto) => (b.descontoPct ?? -1) - (a.descontoPct ?? -1) || (a.precoNum ?? 1e12) - (b.precoNum ?? 1e12),
    pdesc: (a: Produto, b: Produto) => (b.precoNum ?? -1) - (a.precoNum ?? -1),
  }[e.gOrdem || 'oferta'];
  return [...l].sort(cmp);
}
