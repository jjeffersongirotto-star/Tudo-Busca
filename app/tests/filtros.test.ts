import { describe, it, expect } from 'vitest';
import { DADOS, ESPERADO } from './fixture';
import { separarSecoes, mudarSelecao, SELECAO_PADRAO, produtosSel } from '../src/logica/secoes';
import { calcularNotas } from '../src/logica/nota';
import { filtrados, opcoesFiltros, FILTROS_PADRAO, FILTROS, montarLista, type EstadoFiltros } from '../src/logica/filtros';
import { calcularOfertas, filtradosG, FILTROS_G_PADRAO, type EstadoFiltrosG } from '../src/logica/ofertas';

const {pcs, jogos} = separarSecoes(DADOS.produtos);
const {notas} = calcularNotas(pcs);

describe('filtros de computadores = página original', () => {
  const combos: Record<string, Partial<EstadoFiltros> & {sel?: EstadoFiltros['sel']}> = {
    padrao: {}, cb: {fCB: true}, ram16: {fRam: '16', fOrdem: 'asc'}, promo: {fPromo20: true, fOrdem: 'desc'},
    gamer: {sel: {fCat: 'Gamer'}, fGpuDed: 'sim'}, preco: {fPreco: '4000', fArm: '512', fOrdem: 'pdesc'}, dell: {sel: {fMarca: 'Dell'}, fPeso: '2'}, semgpu: {fGpuDed: 'ni', fDescMin: '5'},
  };
  for (const [k, c] of Object.entries(combos)) it(k, () => {
    expect(filtrados(pcs, notas, {...FILTROS_PADRAO, ...c, sel: c.sel || {}}).map(n => n.id)).toEqual(ESPERADO.filtrados[k]);
  });
  it('opções e contagens dos selects', () => {
    const o = opcoesFiltros(pcs, notas);
    for (const f of FILTROS) expect([f.id, o[f.id].map(x => `${x.v} (${x.n})`)]).toEqual([f.id, ESPERADO.opcoes[f.id]]);
  });
  it('favoritos primeiro, depois de 50 em 50', () => {
    const l = filtrados(pcs, notas, FILTROS_PADRAO);
    const fav = new Set([l[120].id]);
    const r = montarLista(pcs, l, fav, 50);
    expect(r.favoritos.map(n => n.id)).toEqual([l[120].id]);
    expect(r.mostrados).toHaveLength(50); expect(r.faltam).toBe(l.length - 1 - 50);
  });
});

describe('games = página original', () => {
  const {notas: ng} = calcularOfertas(jogos);
  it('nota de oferta', () => { for (const n of jogos) expect([n.id, ng.get(n.id)!.nota]).toEqual([n.id, ESPERADO.ofertas[n.id]]); });
  const sel = {secao: 'games', sub: 'acessorios', item: 'controle-ps5'};
  const combos: Record<string, Partial<EstadoFiltrosG>> = {padrao: {}, todos: {gOriginal: false}, asc: {gOriginal: false, gOrdem: 'asc', gSemKit: true}, preco: {gOriginal: false, gPreco: '350', gOrdem: 'desc'}};
  for (const [k, c] of Object.entries(combos)) it('filtro ' + k, () => {
    expect(filtradosG(produtosSel(sel, pcs, jogos), ng, {...FILTROS_G_PADRAO, ...c}).map(n => n.id)).toEqual(ESPERADO.filtradosG[k]);
  });
});

describe('seleção de cards', () => {
  it('trocar para Games escolhe o 1º sub disponível e o 1º item', () =>
    expect(mudarSelecao(SELECAO_PADRAO, {secao: 'games'})).toEqual({secao: 'games', sub: 'acessorios', item: 'controle-ps5'}));
  it('sub em breve não lista produtos', () =>
    expect(produtosSel({secao: 'games', sub: 'consoles', item: ''}, pcs, jogos)).toEqual([]));
});
