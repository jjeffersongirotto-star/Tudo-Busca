import { describe, it, expect } from 'vitest';
import { DADOS, ESPERADO } from './fixture';
import { calcularNotas, categoria, pontuar, completar } from '../src/logica/nota';
import { separarSecoes } from '../src/logica/secoes';

const {pcs} = separarSecoes(DADOS.produtos);
const {notas} = calcularNotas(pcs);

describe('nota dos computadores = página original', () => {
  it('mesma quantidade', () => expect(notas.size).toBe(Object.keys(ESPERADO.notas).length));
  it('total, bruto, categoria, custo-benefício, estimados e itens', () => {
    for (const n of pcs) {
      const r = notas.get(n.id)!, e = ESPERADO.notas[n.id];
      expect({id: n.id, total: r.total, bruto: r.bruto, cat: r.cat, cbFinal: r.cbFinal, cbPct: r.cbPct, est: r.estimados, itens: r.itens.map(i => [i.k, i.v, i.p, i.obs])})
        .toEqual({id: n.id, ...e});
    }
  });
});

describe('regras de categoria e padrão', () => {
  it('GPU dedicada forte → Topo de linha', () => expect(categoria({id: 'x', nome: 'PC', gpuModelo: 'RTX 4090', gpuDedicada: true})).toBe('Topo de linha'));
  it('linha gamer sem GPU informada → Gamer', () => expect(categoria({id: 'x', nome: 'Notebook Acer Nitro V15'})).toBe('Gamer'));
  it('"mouse gamer" no nome não conta', () => expect(categoria({id: 'x', nome: 'Kit notebook + mouse gamer', precoNum: 1500})).toBe('Entrada'));
  it('sem dados: preço decide', () => {
    expect(categoria({id: 'x', nome: 'PC', precoNum: 2000})).toBe('Básico');
    expect(categoria({id: 'x', nome: 'PC', precoNum: 5000})).toBe('Intermediário');
  });
  it('preenche faltantes pelo padrão e marca como estimado', () => {
    const {c, est} = completar({id: 'x', nome: 'Notebook', cpuFamilia: 'Core i5', ramGB: 16});
    expect(c.armazGB).toBe(512); expect(est).toContain('armaz'); expect(est).not.toContain('ram');
  });
  it('PC sem tela vai até 75 pontos', () => {
    const r = pontuar({id: 'x', nome: 'Desktop', temTela: false, tipo: 'Desktop', cpuFamilia: 'Core Ultra 9', cpuGeracao: 'recente', cpuSufixo: 'DK', gpuModelo: 'RTX 5090', gpuDedicada: true, ramGB: 64, armazGB: 2000});
    expect(r.maxBruto).toBe(75); expect(r.total).toBe(100); expect(r.semTela).toBe(true);
  });
});
