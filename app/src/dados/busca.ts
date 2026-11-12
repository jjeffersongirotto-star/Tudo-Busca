/** Fluxo do botão ⟳: pede a coleta só da categoria do card, acompanha (fila/lojas) e devolve o resultado. */
import { pedirAtualizacao, lerStatus, buscarDados, ErroApi, type Categoria, type Status } from './api';
import { textoFontes, falhasFontes } from '@/logica/dados';
import type { Dados } from '@/logica/tipos';

export type Progresso = {tipo: 'conectando' | 'acordando'} | {tipo: 'fila'; segundos: number} | {tipo: 'buscando'; segundos: number; fontes: string};
export type Resultado =
  | {ok: true; status: Status; dados: Dados; falhas: string[]}
  | {ok: false; motivo: 'erro'; mensagem: string}
  | {ok: false; motivo: 'rede'; mensagem: string};

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function buscarCategoria(cat: Categoria, aoProgredir: (p: Progresso) => void, opcoes: {intervaloMs?: number; limiteMs?: number} = {}): Promise<Resultado> {
  const inicio = Date.now();
  const seg = () => Math.round((Date.now() - inicio) / 1000);
  aoProgredir({tipo: 'conectando'});
  const lento = setTimeout(() => aoProgredir({tipo: 'acordando'}), 4000);
  try {
    let s = await pedirAtualizacao(cat);
    clearTimeout(lento);
    const limite = Date.now() + (opcoes.limiteMs ?? 6 * 60 * 1000);
    while (s.estado === 'rodando' && Date.now() < limite) {
      aoProgredir(s.fila ? {tipo: 'fila', segundos: seg()} : {tipo: 'buscando', segundos: seg(), fontes: textoFontes(s.fontes)});
      await espera(opcoes.intervaloMs ?? 2500);
      s = await lerStatus(cat);
    }
    if (s.estado === 'rodando') return {ok: false, motivo: 'rede', mensagem: 'a coleta está demorando demais; tente de novo em alguns minutos'};
    if (s.estado === 'erro') return {ok: false, motivo: 'erro', mensagem: s.erro || 'A coleta falhou'};
    const dados = await buscarDados();
    return {ok: true, status: s, dados, falhas: falhasFontes(s.resumo?.fontes || s.fontes)};
  } catch (e) {
    clearTimeout(lento);
    return {ok: false, motivo: 'rede', mensagem: e instanceof ErroApi ? e.message : String((e as Error)?.message || e)};
  }
}

/** Frase final mostrada depois da busca (igual à da página antiga). */
export function resumoBusca(cat: Categoria, nomeCat: string, s: Status, textoData: string, qtdNovos: number) {
  const r = s.resumo || {};
  return `✔ ${nomeCat}: ${s.recente ? 'preços já estavam atualizados (busca de poucos minutos atrás)' : 'preços atualizados agora'} — ${textoData}.`
    + (cat === 'computadores' && r.produtos ? ` ${r.produtos} computadores, ${r.precosAtualizados} preços conferidos` + (r.novos ? `, ${r.novos} novos` : '') + (r.removidos ? `, ${r.removidos} saíram de linha` : '') + '.' : '')
    + (cat === 'games' && r.porSecao && r.porSecao.games ? ` ${r.porSecao.games} ofertas de games` + (r.novosGames ? `, ${r.novosGames} novas` : '') + '.' : '')
    + (qtdNovos ? ` ${qtdNovos} item(ns) marcado(s) com "novo".` : '');
}
