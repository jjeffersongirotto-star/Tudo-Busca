import { describe, expect, it } from 'vitest';
import { calcularDestaques, noEscopo, selecaoDe } from '../src/logica/destaques';
import { mudarSelecao, SELECAO_PADRAO } from '../src/logica/secoes';
import type { Produto } from '../src/logica/tipos';

const ps5 = (id: string, preco: number, extra: Partial<Produto> = {}) =>
  ({id, nome: 'Console PS5 ' + id, secao: 'games', sub: 'consoles', item: 'console-ps5', modelo: 'PS5 Digital', grupo: 'PS5 Digital', original: true, precoNum: preco, ...extra}) as Produto;
const pc = (id: string, preco: number) =>
  ({id, nome: 'Notebook ' + id, cpuModelo: 'Core i5-1235U', ramGB: 16, gpuDedicada: false, precoNum: preco}) as Produto;

describe('destaques', () => {
  const base = [ps5('a', 4000), ps5('b', 4100), ps5('c', 4200), ps5('d', 4300), ps5('barato', 3300), ps5('golpe', 1200), ps5('kit', 3000, {kit: true}),
    pc('p1', 3000), pc('p2', 3100), pc('p3', 3200), pc('p4', 3300), pc('pb', 2400)];
  const d = calcularDestaques(base);
  it('entra quem está bem abaixo do típico do mesmo modelo; golpe (muito abaixo) e kit ficam de fora', () => {
    expect(d.map(x => x.n.id)).toEqual(['pb', 'barato']);
    expect(d.find(x => x.n.id === 'barato')!.tipico).toBe(4050);   // mediana dos 6 anúncios (o kit não entra)
  });
  it('escopo: tudo ao abrir; Computadores só PCs/peças; Games › Consoles só consoles', () => {
    expect(d.filter(x => noEscopo(x.n, null))).toHaveLength(2);
    expect(d.filter(x => noEscopo(x.n, SELECAO_PADRAO)).map(x => x.n.id)).toEqual(['pb']);
    expect(d.filter(x => noEscopo(x.n, {secao: 'games', sub: 'consoles', item: 'console-ps5'})).map(x => x.n.id)).toEqual(['barato']);
  });
  it('tocar no destaque leva ao card certo', () => {
    expect(mudarSelecao(SELECAO_PADRAO, selecaoDe(ps5('x', 1)))).toEqual({secao: 'games', sub: 'consoles', item: 'console-ps5'});
  });
});
