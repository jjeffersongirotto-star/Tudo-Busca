import { describe, it, expect } from 'vitest';
import { DADOS, ESPERADO } from './fixture';
import { combinarDados, marcarNovos, normalizar, valido, textoFontes, quandoSecao } from '../src/logica/dados';
import { separarSecoes } from '../src/logica/secoes';
import { appMaisNovo, paginaMaisNova, versaoCurta, decidirVersao } from '../src/logica/versao';
import { numBRfmt, reais, fmtPct } from '../src/logica/formato';
import type { Dados } from '../src/logica/tipos';

describe('cópias dos dados por categoria', () => {
  it('cópia antiga só com computadores (mais nova) não apaga games = página original', () => {
    const {pcs} = separarSecoes(DADOS.produtos);
    const velha: Dados = {ultimaAtualizacao: '2030-01-01T00:00:00Z', cupons: [], produtos: pcs.slice(0, 3)};
    const r = combinarDados(DADOS, velha);
    expect({n: r.dados.produtos.length, vieram: r.vieram, cupons: r.dados.cupons.length}).toEqual(ESPERADO.combinar);
  });
  it('cada categoria vem da cópia mais nova', () => {
    const a: Dados = {ultimaAtualizacao: '2026-01-02T00:00:00Z', atualizacaoPorSecao: {computadores: '2026-01-02T00:00:00Z', games: '2026-01-01T00:00:00Z'}, cupons: [{id: 'a'}],
      produtos: [{id: 'pc1', nome: 'a'}, {id: 'g1', nome: 'g', secao: 'games'}]};
    const b: Dados = {ultimaAtualizacao: '2026-01-03T00:00:00Z', atualizacaoPorSecao: {computadores: '2026-01-01T00:00:00Z', games: '2026-01-03T00:00:00Z'}, cupons: [{id: 'b'}],
      produtos: [{id: 'pc0', nome: 'b'}, {id: 'g2', nome: 'g', secao: 'games'}]};
    const r = combinarDados(a, b);
    expect(r.dados.produtos.map(n => n.id).sort()).toEqual(['g2', 'pc1']);
    expect(r.vieram).toEqual(['games']); expect(r.dados.cupons[0].id).toBe('b');
    expect(quandoSecao(r.dados, 'computadores')).toBe(Date.parse('2026-01-02T00:00:00Z'));
  });
  it('formato antigo (notebooks) é convertido', () => {
    const d = normalizar({cupons: [], notebooks: [{id: 'n', nome: 'x'}]} as unknown as Dados);
    expect(valido(d)).toBe(true); expect(d.produtos[0]).toMatchObject({tipo: 'Notebook', marca: 'Dell'});
  });
  it('"novo": nada na primeira visita; depois só o que não foi visto', () => {
    const d: Dados = {cupons: [{id: '1'}], produtos: [{id: 'p', nome: 'x'}]};
    expect(marcarNovos(d, null).novos.size).toBe(0);
    expect([...marcarNovos(d, ['c:1']).novos]).toEqual(['n:p']);
  });
  it('texto das lojas durante a busca', () =>
    expect(textoFontes({KaBuM: {estado: 'ok', itens: 12}, Amazon: {estado: 'falhou'}, Shopee: {estado: 'buscando'}})).toBe('✔ KaBuM 12 · ✖ Amazon · 🔄 Shopee'));
});

describe('versões', () => {
  it('compara versões', () => {
    expect(appMaisNovo('1.0.10', '1.0.9')).toBe(true); expect(appMaisNovo('1.0.6', '1.0.6')).toBe(false);
    expect(paginaMaisNova('2026.11.12.0750-abc', '2026.11.12.0700-def')).toBe(true);
    expect(versaoCurta('2026.11.12.0750-bdd62fb')).toBe('12/11/2026 07:50');
  });
  it('nativo desatualizado bloqueia; web só sugere', () => {
    const v = {novo: '2026.11.13.0000-x', app: {nativo: {versao: '2.0.3', android: 'u'}}};
    expect(decidirVersao(v, {nativo: true, versaoNativa: '2.0.1', versaoWeb: ''})?.tipo).toBe('app');
    expect(decidirVersao(v, {nativo: false, versaoWeb: '2026.11.12.0000-y'})?.tipo).toBe('pagina');
    expect(decidirVersao(null, {nativo: true, versaoNativa: '1', versaoWeb: ''})).toBeNull();
  });
});

describe('formatação pt-BR (igual a toLocaleString)', () => {
  it('números', () => {
    for (const v of [0, 1, 12.34, 1234.5, 99.95, 100, 1234567.89, -3.25]) expect(numBRfmt(v)).toBe(v.toLocaleString('pt-BR', {maximumFractionDigits: 1}));
    expect(reais(1234.5)).toBe('R$ 1.234,50'); expect(fmtPct(12.5)).toBe('12,5%');
  });
});
