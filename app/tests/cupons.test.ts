import { describe, it, expect } from 'vitest';
import { DADOS, ESPERADO } from './fixture';
import { catCupom, minimoCupom, descontoCupom, escopoCupom, cuponsDaLoja, melhorComCupom, cuponsForaDaLoja, avaliarCupom, contextoCupons, listaCupons, precoComCupom, rotuloDesconto } from '../src/logica/cupons';
import type { Cupom, Produto } from '../src/logica/tipos';
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

describe('preço com cupom', () => {
  const base = {id: 'x', loja: 'KaBuM!', secao: 'games', precoNum: 371, nome: 'Controle Sony DualSense PS5 Sem Fio'} as Produto;
  const cup = (codigo: string, descricao: string, regras = '', minimo?: number) => ({id: codigo, codigo, loja: 'KaBuM!', descricao, regras, minimo, ativo: true}) as unknown as Cupom;
  it('compra mínima acima do preço não vale; abaixo vale e desconta', () => {
    const c = [cup('TONO', 'Cupom KaBuM! 5% OFF na primeira compra', 'Válido na primeira compra acima de R$499', 499)];
    expect(precoComCupom(c, base).melhor).toBeNull();
    const r = precoComCupom(c, {...base, precoNum: 557} as Produto).melhor!;
    expect(r.a.estimado).toBeCloseTo(529.15, 1);
    expect(r.a.condicoes).toContain('só na 1ª compra na loja');
  });
  it('cupom de TV/eletro/móveis ou de outro modelo não vale', () => {
    const c = [cup('TV100', 'R$100 OFF em Smart TV'), cup('150ELETRO', 'Economia de R$50', 'Promoção aplicada a produtos específicos'),
      cup('ESQ10', 'Cupom citado para Notebook Alienware 15 DA15-C5210H-A30')];
    expect(precoComCupom(c, base).melhor).toBeNull();
    const nb = {...base, secao: 'computadores', nome: 'Notebook Lenovo IdeaPad Slim 3', precoNum: 3749} as Produto;
    expect(cuponsDaLoja(c, nb).some(x => x.c.codigo === 'ESQ10')).toBe(false);
  });
  it('cupom geral da loja vale e escolhe o menor preço', () => {
    const c = [cup('GERAL5', '5% OFF em todo o site'), cup('GERAL30', 'R$30 OFF em todo o site')];
    const r = precoComCupom(c, base);
    expect(r.melhor!.c.codigo).toBe('GERAL30');
    expect(r.melhor!.a.estimado).toBe(341);
  });
  it('cupom de itens selecionados mostra o preço possível, primeiro o que o código cita o item', () => {
    const c = [cup('ENDGAME40', '40% de desconto em eletrônicos, válido para itens selecionados.'),
      cup('CONTROLE10', 'Cupom KaBuM! com 10% OFF', 'Desconto em produtos selecionados: insira o código no carrinho para validar.')];
    const r = precoComCupom(c, {...base, item: 'controle-ps5'} as Produto);
    expect(r.melhor).toBeNull();
    expect(r.talvez!.c.codigo).toBe('CONTROLE10');
    expect(r.talvez!.provavel).toBe(true);
    expect(r.talvez!.estimado).toBeCloseTo(333.9, 1);
    expect(r.talvezOutros.map(x => x.c.codigo)).toEqual(['ENDGAME40']);
  });
});

describe('rótulo do desconto', () => {
  it('mostra % ou valor fixo', () => {
    expect(rotuloDesconto({tipo: '%', v: 10, teto: null})).toBe('10% OFF');
    expect(rotuloDesconto({tipo: 'R$', v: 50})).toMatch(/^R\$\s50 OFF$/);
    expect(rotuloDesconto({tipo: '%', v: 15, teto: 100})).toMatch(/^15% OFF \(até R\$\s100\)$/);
  });
});
