import { describe, it, expect } from 'vitest';
import { DADOS, ESPERADO } from './fixture';
import { catCupom, minimoCupom, descontoCupom, escopoCupom, cuponsDaLoja, melhorComCupom, cuponsForaDaLoja, avaliarCupom, contextoCupons, listaCupons } from '../src/logica/cupons';
import { separarSecoes, secaoAtual, itemAtual, nomeSel, produtosSel, type Selecao } from '../src/logica/secoes';

const {pcs, jogos} = separarSecoes(DADOS.produtos);

describe('cupons = página original', () => {
  it('categoria, mínimo, desconto e escopo de cada cupom', () => {
    for (const c of DADOS.cupons) {
      expect([c.id, catCupom(c)]).toEqual([c.id, ESPERADO.catCupom[c.id]]);
      expect([c.id, minimoCupom(c)]).toEqual([c.id, ESPERADO.minimo[c.id]]);
      const d = descontoCupom(c), de = ESPERADO.desconto[c.id];
      expect([c.id, d]).toEqual([c.id, de]);
      const esc = [escopoCupom(c, {secao: 'computadores', item: ''}), escopoCupom(c, {secao: 'games', item: 'controle-ps5'}), escopoCupom(c, {secao: 'games', item: ''})];
      expect([c.id, esc]).toEqual([c.id, ESPERADO.escopos[c.id]]);
    }
  });
  it('cupons de cada produto: ordem, ✔/✖ mínimo, preço estimado, melhor e fora da loja', () => {
    const porId = new Map(DADOS.produtos.map(n => [n.id, n]));
    for (const [id, esperado] of Object.entries(ESPERADO.cuponsProduto)) {
      const n = porId.get(id)!;
      expect([id, cuponsDaLoja(DADOS.cupons, n).map(x => [x.c.id, x.e.tipo, x.a.atinge, x.a.estimado, x.a.aviso])]).toEqual([id, esperado]);
      const m = melhorComCupom(DADOS.cupons, n);
      expect([id, m ? [m.c.id, m.a.estimado] : null]).toEqual([id, ESPERADO.melhor[id]]);
      expect([id, cuponsForaDaLoja(DADOS.cupons, n)]).toEqual([id, ESPERADO.foraLoja[id]]);
    }
  });
  it('coluna de cupons segue o card selecionado', () => {
    const sels: Record<string, Selecao> = {pc: {secao: 'computadores', sub: 'todos', item: ''}, ps5: {secao: 'games', sub: 'acessorios', item: 'controle-ps5'}};
    for (const [k, sel] of Object.entries(sels)) {
      const ctx = contextoCupons(secaoAtual(sel), nomeSel(sel), produtosSel(sel, pcs, jogos), itemAtual(sel)?.cupom);
      const r = listaCupons(DADOS.cupons, ctx, {secao: sel.secao, item: sel.item}, {loja: '', cat: '', velhos: false, todos: false});
      expect(r.visiveis.map(c => c.id)).toEqual(ESPERADO.coluna[k]);
    }
  });
});

describe('avaliação de cupom (casos)', () => {
  const n = {id: 'p', nome: 'Controle', precoNum: 400};
  it('% com teto', () => {
    const a = avaliarCupom({id: 'c', descricao: '10% OFF, desconto máximo de R$ 30'}, n);
    expect(a.estimado).toBe(370); expect(a.aviso).toBe('desconto limitado a R$ 30,00');
  });
  it('não atinge o mínimo', () => {
    const a = avaliarCupom({id: 'c', descricao: 'R$ 50 OFF em compras acima de R$ 500'}, n);
    expect(a.atinge).toBe(false); expect(a.estimado).toBeNull();
  });
  it('"até 40%" não é estimado', () => expect(descontoCupom({id: 'c', descricao: 'Até 40% OFF em games'})).toBeNull());
  it('R$ alto sem mínimo gera aviso', () => {
    const a = avaliarCupom({id: 'c', descricao: 'R$ 200 OFF'}, n);
    expect(a.estimado).toBeNull(); expect(a.aviso).toMatch(/mínimo não informado/);
  });
});
