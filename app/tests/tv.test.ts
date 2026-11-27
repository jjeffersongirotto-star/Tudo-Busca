import { describe, expect, it } from 'vitest';
import { notaTV, cbBrutoTV } from '../src/logica/tv';
import { filtradosG, FILTROS_G_PADRAO } from '../src/logica/ofertas';
import { mudarSelecao, SELECAO_PADRAO } from '../src/logica/secoes';
import type { Produto } from '../src/logica/tipos';

const tv = (id: string, preco: number, x: Partial<Produto>) => ({id, nome: 'Smart TV ' + id, secao: 'games', sub: 'tvs', item: 'tv', original: true, precoNum: preco, ...x}) as Produto;
const oled = tv('oled', 8999, {telaPol: 65, tvRes: '4K', tvPainel: 'OLED', tvHz: 120, tvGame: ['HDMI 2.1', 'VRR', 'ALLM']});
const led = tv('led', 2599, {telaPol: 55, tvRes: '4K', tvPainel: 'LED'});
const qled = tv('qled', 2199, {telaPol: 50, tvRes: '4K', tvPainel: 'QLED', tvHz: 120});

describe('TVs', () => {
  it('nota para games pelo que o anúncio informa', () => {
    expect(notaTV(oled).total).toBe(40 + 22 + 13 + 10 + 9);
    expect(notaTV(led).total).toBe(12 + 5 + 13 + 0 + 7);
    expect(notaTV(qled).total).toBe(25 + 22 + 13 + 0 + 5);
  });
  it('custo-benefício = nota por R$ 1.000; ordem padrão das TVs', () => {
    expect(cbBrutoTV(qled, 2199)).toBeGreaterThan(cbBrutoTV(oled, 8999));
    const l = filtradosG([oled, led, qled], new Map(), {...FILTROS_G_PADRAO, gOrdem: FILTROS_G_PADRAO.gOrdemTV});
    expect(l.map(n => n.id)).toEqual(['qled', 'led', 'oled']);
    expect(filtradosG([oled, led, qled], new Map(), {...FILTROS_G_PADRAO, gOrdem: 'nota'}).map(n => n.id)).toEqual(['oled', 'qled', 'led']);
  });
  it('Games › TVs seleciona o item TV', () => {
    expect(mudarSelecao({...SELECAO_PADRAO, secao: 'games', sub: 'consoles', item: 'console-ps5'}, {sub: 'tvs'})).toEqual({secao: 'games', sub: 'tvs', item: 'tv'});
  });
});
