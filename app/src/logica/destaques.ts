/** Destaques: ofertas bem abaixo do preço de produtos SEMELHANTES (mesmo modelo/configuração), de todas as seções
 *  ou só da seção escolhida. Compara o preço da loja com a mediana dos anúncios do mesmo grupo. */
import type { Produto } from './tipos';
import { secaoDe, type Selecao } from './secoes';

export const DESTAQUE = {
  /** % abaixo do preço típico para entrar */
  minimo: 15,
  /** acima disso é quase sempre golpe, erro ou peça/acessório no lugar do produto */
  maximo: 50,
  /** anúncios do mesmo grupo para ter um preço típico confiável */
  grupoMin: 4,
  quantos: 12,
  /** na grade (⤢ Ampliar) */
  quantosGrade: 40,
};

// grupos amplos demais ("Mouse sem fio", "Headset com fio", "Capa / case"…) não dizem se o preço é bom: ficam de fora
const SEM_DESTAQUE = /^(?:pc-mouse|pc-teclado|pc-headset|acessorio-)/;

/** Grupo de "semelhantes": computador = mesmo processador + RAM + placa de vídeo; outros = mesmo item + modelo. */
export function grupoDestaque(n: Produto): string | null {
  const sec = secaoDe(n);
  if (sec === 'computadores') {
    // processador com modelo exato ("Core i5-1235U", não só "Core i5") e o mesmo tipo (notebook × PC de mesa)
    if (!n.cpuModelo || !/\d{3,}/.test(n.cpuModelo) || !n.ramGB) return null;
    return `pc|${n.tipo || 'Notebook'}|${n.cpuModelo}|${n.ramGB}|${n.gpuDedicada ? n.gpuModelo || 'dedicada' : 'integrada'}`;
  }
  if (!n.item || SEM_DESTAQUE.test(n.item) || !n.original || !n.modelo) return null;
  return `${n.item}|${n.grupo || n.modelo}`;
}

export interface Destaque { n: Produto; pct: number; tipico: number; qtd: number }

/** Ofertas que estão bem abaixo do típico do seu grupo (sem kits e sem preço de coleta anterior). */
export function calcularDestaques(produtos: Produto[]): Destaque[] {
  const grupos = new Map<string, number[]>();
  const valido = (n: Produto) => !!n.precoNum && !n.kit && !n.precoAntigo;
  for (const n of produtos) {
    const g = valido(n) ? grupoDestaque(n) : null;
    if (g) grupos.set(g, [...(grupos.get(g) || []), n.precoNum!]);
  }
  const mediana = new Map<string, number>();
  for (const [g, v] of grupos) {
    if (v.length < DESTAQUE.grupoMin) continue;
    v.sort((a, b) => a - b);
    mediana.set(g, v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2);
  }
  const out: Destaque[] = [];
  const vistos = new Set<string>();
  for (const n of produtos) {
    const g = valido(n) ? grupoDestaque(n) : null;
    const m = g ? mediana.get(g) : undefined;
    if (!g || !m) continue;
    const pct = (m - n.precoNum!) / m * 100;
    // o mesmo produto em várias lojas/comparadores: fica o mais barato
    const chave = `${g}|${n.nome.toLowerCase().replace(/\W+/g, '').slice(0, 40)}`;
    if (pct >= DESTAQUE.minimo && pct <= DESTAQUE.maximo && !vistos.has(chave)) {
      vistos.add(chave);
      out.push({n, pct: Math.round(pct), tipico: m, qtd: grupos.get(g)!.length});
    }
  }
  return out.sort((a, b) => b.pct - a.pct);
}

/** Escopo dos destaques: tudo (ao abrir) ou a seção + sub-card escolhidos (Computadores = PCs e peças;
 *  Computadores › Acessórios = peças; Games › Consoles = consoles…). O item (PS5, SSD…) não restringe: mostra o grupo todo. */
export function noEscopo(n: Produto, sel: Selecao | null): boolean {
  if (!sel) return true;
  const sec = secaoDe(n);
  if (sel.secao === 'computadores') return sel.sub === 'acessorios' ? sec === 'pecas' : sec === 'computadores' || sec === 'pecas';
  return sec === sel.secao && (!sel.sub || n.sub === sel.sub);
}

/** Seleção que mostra o produto na lista (para abrir o card ao tocar no destaque). */
export function selecaoDe(n: Produto): Selecao {
  const sec = secaoDe(n);
  if (sec === 'computadores') return {secao: 'computadores', sub: 'todos', item: ''};
  if (sec === 'pecas') return {secao: 'computadores', sub: 'acessorios', item: n.item || ''};
  return {secao: sec, sub: n.sub || '', item: n.item || ''};
}
