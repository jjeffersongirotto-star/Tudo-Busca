/** Junção de cópias dos dados (embutida/guardada no aparelho/servidor): cada categoria vem da cópia em que é mais recente. */
import type { Dados } from './tipos';
import { secaoDe } from './secoes';

/** Formato antigo (só notebooks Dell) → formato novo. */
export function normalizar<T extends Partial<Dados> | null | undefined>(d: T): T {
  if (d && !Array.isArray(d.produtos) && Array.isArray(d.notebooks)) {
    d.produtos = d.notebooks.map(n => ({tipo: 'Notebook', marca: 'Dell', temTela: true, ...n}));
    delete d.notebooks;
  }
  return d;
}
export function valido(d: unknown): d is Dados {
  const x = normalizar(d as Partial<Dados> | null);
  return !!x && Array.isArray(x.cupons) && Array.isArray(x.produtos) && x.produtos.length > 0;
}

export const quando = (d?: Partial<Dados> | null) => Date.parse((d && d.ultimaAtualizacao) || '') || 0;
export function quandoSecao(d: Partial<Dados> | null | undefined, s: string): number {
  const t = d && d.atualizacaoPorSecao && d.atualizacaoPorSecao[s];
  if (t) return Date.parse(t) || 0;
  return ((d && d.produtos) || []).some(n => secaoDe(n) === s) ? quando(d) : 0;
}
export function combinarDados(base: Dados, novo: Dados): {dados: Dados; vieram: string[]; cuponsNovos: boolean} {
  const secoes = new Set([...base.produtos, ...novo.produtos].map(secaoDe));
  const out: Dados = {...(quando(novo) >= quando(base) ? novo : base)}, porSecao: Record<string, string> = {}, vieram: string[] = [];
  out.produtos = [];
  for (const s of secoes) {
    const a = quandoSecao(base, s), b = quandoSecao(novo, s), fonte = b > a ? novo : base;
    if (b > a) vieram.push(s);
    out.produtos.push(...fonte.produtos.filter(n => secaoDe(n) === s));
    const t = Math.max(a, b); if (t) porSecao[s] = new Date(t).toISOString();
  }
  out.atualizacaoPorSecao = porSecao;
  out.cupons = quando(novo) >= quando(base) ? novo.cupons : base.cupons;
  return {dados: out, vieram, cuponsNovos: quando(novo) > quando(base)};
}

/** Ids de tudo (cupons e produtos) para marcar "novo". */
export const todosIds = (d: Dados) => [...d.cupons.map(c => 'c:' + c.id), ...d.produtos.map(n => 'n:' + n.id)];
/** Marca como "novo" o que não estava na lista de vistos. Na primeira visita (vistos = null), nada é novo. */
export function marcarNovos(d: Dados, vistos: string[] | null): {novos: Set<string>; vistos: string[]} {
  const ids = todosIds(d);
  if (vistos === null) return {novos: new Set(), vistos: ids};
  const set = new Set(vistos);
  return {novos: new Set(ids.filter(i => !set.has(i))), vistos: [...new Set([...vistos, ...ids])]};
}

/** Texto das lojas durante a busca: ⏳ aguardando · 🔄 buscando · ✔ ok N · ✖ falhou. */
export const NOME_ESTADO: Record<string, string> = {aguardando: '⏳', buscando: '🔄', ok: '✔', falhou: '✖'};
export interface FonteStatus { estado: string; itens?: number; msg?: string }
export const textoFontes = (fontes?: Record<string, FonteStatus>) =>
  Object.entries(fontes || {}).map(([nome, f]) => `${NOME_ESTADO[f.estado] || '•'} ${nome}${f.estado === 'ok' ? ' ' + (f.itens ?? '') : ''}`).join(' · ');
export const falhasFontes = (fontes?: Record<string, FonteStatus>) =>
  Object.entries(fontes || {}).filter(([, f]) => f.estado !== 'ok').map(([n, f]) => `${n} (${f.msg || 'sem resposta'})`);
