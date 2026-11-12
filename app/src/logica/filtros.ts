/** Filtros e ordenação da lista de computadores. */
import type { Produto } from './tipos';
import { CATEGORIAS, type Pontuacao } from './nota';
import { fmtPol } from './formato';

export type FiltroId = 'fCat' | 'fTipo' | 'fMarca' | 'fLoja' | 'fLinha' | 'fProc' | 'fPerfil' | 'fTela' | 'fGpu';
type Acessor = (n: Produto, notas: Map<string, Pontuacao>) => string | undefined;

export const FILTROS: {id: FiltroId; rotulo: string; fn: Acessor; todos: string}[] = [
  {id: 'fCat', rotulo: 'Categoria', fn: (n, N) => N.get(n.id)?.cat || 'Básico', todos: 'Todas'},
  {id: 'fTipo', rotulo: 'Tipo', fn: n => n.tipo || 'Notebook', todos: 'Todos'},
  {id: 'fMarca', rotulo: 'Marca', fn: n => n.marca || 'Dell', todos: 'Todas'},
  {id: 'fLoja', rotulo: 'Loja', fn: n => n.loja || 'Dell.com', todos: 'Todas'},
  {id: 'fLinha', rotulo: 'Linha / série', fn: n => n.linha, todos: 'Todas'},
  {id: 'fProc', rotulo: 'Processador', fn: n => n.cpuFamilia || 'Não informado', todos: 'Todos'},
  {id: 'fPerfil', rotulo: 'Perfil do processador', fn: n => n.cpuPerfil || 'Não informado', todos: 'Todos'},
  {id: 'fTela', rotulo: 'Tela', fn: n => fmtPol(n.telaPol) || 'Não informado', todos: 'Qualquer'},
  {id: 'fGpu', rotulo: 'Placa de vídeo', fn: n => n.gpuModelo || 'Não informado', todos: 'Todas'},
];

/** Opções fixas dos filtros numéricos: [valor, rótulo]. */
export const OPCOES_NUM = {
  fRam: [['', 'Qualquer'], ['8', '8 GB ou mais'], ['16', '16 GB ou mais'], ['32', '32 GB ou mais'], ['64', '64 GB ou mais']],
  fArm: [['', 'Qualquer'], ['256', '256 GB ou mais'], ['512', '512 GB ou mais'], ['1000', '1 TB ou mais'], ['2000', '2 TB ou mais']],
  fGpuDed: [['', 'Tanto faz'], ['sim', 'Sim'], ['nao', 'Não (integrada)'], ['ni', 'Não informado']],
  fPeso: [['', 'Qualquer'], ['1.4', '1,4 kg'], ['1.7', '1,7 kg'], ['2', '2,0 kg'], ['2.5', '2,5 kg']],
  fPreco: [['', 'Qualquer'], ['2000', 'até R$ 2.000'], ['3000', 'até R$ 3.000'], ['4000', 'até R$ 4.000'], ['5000', 'até R$ 5.000'], ['6000', 'até R$ 6.000'], ['8000', 'até R$ 8.000'], ['10000', 'até R$ 10.000'], ['15000', 'até R$ 15.000'], ['20000', 'até R$ 20.000']],
  fDescMin: [['', 'Qualquer'], ['1', 'Com desconto'], ['5', '5% ou mais'], ['10', '10% ou mais'], ['15', '15% ou mais'], ['20', '20% ou mais'], ['30', '30% ou mais']],
  fOrdem: [['nota', 'Melhor nota (padrão)'], ['desc', 'Maior desconto'], ['asc', 'Menor preço'], ['pdesc', 'Maior preço']],
} as const;

export const ORDEM_PERFIL = ['Econômico (bateria)','Eficiência (bateria)','Eficiência (ARM)','Eficiência (Apple)','Intermediário','Desktop econômico','Desempenho','Desempenho (Apple Pro)','Desktop','Alto desempenho','Alto desempenho (Apple Max)','Desktop alto desempenho','Não informado'];
export const CLASSE_PERFIL: Record<string, string> = {'Econômico (bateria)':'U','Eficiência (bateria)':'ARM','Eficiência (ARM)':'ARM','Intermediário':'P','Desempenho':'H','Alto desempenho':'HX',
  'Eficiência (Apple)':'ARM','Desempenho (Apple Pro)':'H','Alto desempenho (Apple Max)':'HX','Desktop econômico':'P','Desktop':'H','Desktop alto desempenho':'HX'};
export const ICONE_TIPO: Record<string, string> = {'Notebook':'💻','MacBook':'💻','Desktop':'🖥️','All-in-one':'🖥️','Mini PC':'📦','Mac':'🖥️'};
export const POR_PAGINA = 50;

const ordemNum = (v: string) => parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, ''));

export interface EstadoFiltros {
  sel: Partial<Record<FiltroId, string>>;
  fRam: string; fArm: string; fPeso: string; fPreco: string; fDescMin: string; fGpuDed: string;
  fOrdem: 'nota' | 'desc' | 'asc' | 'pdesc';
  fPromo20: boolean; fCB: boolean;
}
export const FILTROS_PADRAO: EstadoFiltros = {sel: {}, fRam: '', fArm: '', fPeso: '', fPreco: '', fDescMin: '', fGpuDed: '', fOrdem: 'nota', fPromo20: false, fCB: false};

/** Opções (valor, contagem) de cada filtro de lista, na ordem do site. */
export function opcoesFiltros(pcs: Produto[], notas: Map<string, Pontuacao>): Record<FiltroId, {v: string; n: number}[]> {
  const out = {} as Record<FiltroId, {v: string; n: number}[]>;
  for (const f of FILTROS) {
    const vals = [...new Set(pcs.map(n => f.fn(n, notas)).filter((x): x is string => !!x))];
    if (f.id === 'fPerfil') vals.sort((a, b) => ORDEM_PERFIL.indexOf(a) - ORDEM_PERFIL.indexOf(b));
    else if (f.id === 'fCat') vals.sort((a, b) => CATEGORIAS.indexOf(a as never) - CATEGORIAS.indexOf(b as never));
    else vals.sort((a, b) => (isNaN(ordemNum(a)) || isNaN(ordemNum(b))) ? a.localeCompare(b, 'pt-BR') : ordemNum(a) - ordemNum(b));
    const cont = new Map<string, number>();
    for (const n of pcs) { const v = f.fn(n, notas); if (v) cont.set(v, (cont.get(v) || 0) + 1); }
    out[f.id] = vals.map(v => ({v, n: cont.get(v) || 0}));
  }
  return out;
}

/** Nota usada para ordenar: Desempenho, ou Custo-benefício com o checkbox marcado. */
export const valorNota = (n: Produto, notas: Map<string, Pontuacao>, usaPreco: boolean) => {
  const r = notas.get(n.id); return usaPreco ? (r?.cbFinal ?? -1) : (r?.total ?? -1);
};

export function filtrados(pcs: Produto[], notas: Map<string, Pontuacao>, e: EstadoFiltros): Produto[] {
  let l = pcs.filter(n => FILTROS.every(f => !e.sel[f.id] || f.fn(n, notas) === e.sel[f.id]));
  const num = (v: string) => +v || 0;
  if (num(e.fRam)) l = l.filter(n => n.ramGB && n.ramGB >= num(e.fRam));
  if (num(e.fArm)) l = l.filter(n => n.armazGB && n.armazGB >= num(e.fArm));
  if (num(e.fPeso)) l = l.filter(n => n.pesoKg != null && n.pesoKg <= num(e.fPeso));
  if (num(e.fPreco)) l = l.filter(n => n.precoNum != null && n.precoNum <= num(e.fPreco));
  const dmin = Math.max(num(e.fDescMin), e.fPromo20 ? 20 : 0);
  if (dmin) l = l.filter(n => n.descontoPct != null && n.descontoPct >= dmin);
  const gd = e.fGpuDed;
  if (gd) l = l.filter(n => gd === 'sim' ? n.gpuDedicada === true : gd === 'nao' ? n.gpuDedicada === false : n.gpuDedicada == null);
  const vn = (n: Produto) => valorNota(n, notas, e.fCB);
  const T = (n: Produto) => notas.get(n.id)?.total ?? NaN;
  const cmp = {
    nota: (a: Produto, b: Produto) => vn(b) - vn(a) || (T(b) - T(a)),
    desc: (a: Produto, b: Produto) => (b.descontoPct ?? -1) - (a.descontoPct ?? -1) || vn(b) - vn(a),
    asc: (a: Produto, b: Produto) => (a.precoNum ?? 1e12) - (b.precoNum ?? 1e12),
    pdesc: (a: Produto, b: Produto) => (b.precoNum ?? -1) - (a.precoNum ?? -1),
  }[e.fOrdem || 'nota'];
  return [...l].sort(cmp);
}

/** Lista final: favoritos primeiro (mesmo fora dos filtros), depois a página atual dos demais. */
export function montarLista(todos: Produto[], filtrada: Produto[], favs: Set<string>, limite: number, ordemFav?: (a: Produto, b: Produto) => number) {
  const noFiltro = new Set(filtrada.map(n => n.id));
  const favoritos = todos.filter(n => favs.has(n.id));
  if (ordemFav) favoritos.sort(ordemFav);
  const resto = filtrada.filter(n => !favs.has(n.id));
  const mostrados = resto.slice(0, limite);
  return {favoritos, mostrados, resto: resto.length, faltam: resto.length - mostrados.length, noFiltro,
    foraFiltro: favoritos.filter(n => !noFiltro.has(n.id)).length};
}
