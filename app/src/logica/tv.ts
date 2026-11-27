/** Games › TVs: nota para jogar (0–100) pelo que o anúncio informa, e custo-benefício (nota ÷ preço). */
import type { Produto } from './tipos';

/** Pontos de cada característica (somam 100). O que o título não diz conta como o mínimo da faixa. */
export const NOTA_TV = {
  painel: {'OLED': 40, 'Mini LED': 33, 'QNED': 28, 'QLED': 25, 'NanoCell': 20, 'LED': 12} as Record<string, number>,
  hz: (hz?: number | null) => (!hz ? 5 : hz >= 144 ? 25 : hz >= 120 ? 22 : hz >= 100 ? 12 : 5),
  res: {'8K': 15, '4K': 13, 'Full HD': 5, 'HD': 0, '': 3} as Record<string, number>,
  /** recursos para console (HDMI 2.1, VRR, ALLM, FreeSync, G-Sync): 4 pontos cada, até 10 */
  game: (g?: string[]) => Math.min(10, (g || []).filter(x => x !== 'Game Mode').length * 4 + ((g || []).includes('Game Mode') ? 2 : 0)),
  tamanho: (pol?: number) => (!pol ? 0 : pol >= 75 ? 10 : pol >= 65 ? 9 : pol >= 55 ? 7 : pol >= 50 ? 5 : pol >= 43 ? 3 : 0),
};

export const ehTV = (n: Produto) => n.item === 'tv';

export interface NotaTV { total: number; partes: {rotulo: string; pontos: number; max: number; valor: string}[] }

export function notaTV(n: Produto): NotaTV {
  const pol = Number(n.telaPol) || 0;
  const partes = [
    {rotulo: 'Tipo de tela', pontos: NOTA_TV.painel[n.tvPainel || 'LED'] ?? 12, max: 40, valor: n.tvPainel || 'LED'},
    {rotulo: 'Taxa de atualização', pontos: NOTA_TV.hz(n.tvHz), max: 25, valor: n.tvHz ? `${n.tvHz} Hz` : 'não informada'},
    {rotulo: 'Resolução', pontos: NOTA_TV.res[n.tvRes || ''] ?? 3, max: 15, valor: n.tvRes || 'não informada'},
    {rotulo: 'Recursos para games', pontos: NOTA_TV.game(n.tvGame), max: 10, valor: (n.tvGame || []).join(', ') || 'não informados'},
    {rotulo: 'Tamanho', pontos: NOTA_TV.tamanho(pol), max: 10, valor: pol ? `${pol}"` : 'não informado'},
  ];
  return {total: partes.reduce((s, p) => s + p.pontos, 0), partes};
}

/** Custo-benefício bruto: nota por R$ 1.000 (o app normaliza para 0–100 pela melhor TV da lista). */
export const cbBrutoTV = (n: Produto, preco: number) => (preco > 0 ? notaTV(n).total / (preco / 1000) : 0);
