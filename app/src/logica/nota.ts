/** Pontuação dos computadores: Desempenho (só hardware, 0–100) e Custo-benefício (70% desempenho + 30% valor pelo preço).
 *  Porte fiel da lógica do cupons-dell.html. */
import type { Produto } from './tipos';
import { fmt1, fmtPol, r1 } from './formato';

type Faixa = [number, number, string?][];

export const NOTA = {
  procBase: {'Celeron':1,'Athlon':1,'MediaTek':2,'Pentium':2,'Intel N':3,'Ryzen 3':5,'Apple A':9,'Apple M1':9,'Apple M2':11,'Apple M3':13,'Apple M4':15,'Apple M5':17,'Core i3':4,'Core 3':5,'Core i5':7,'Ryzen 5':7,'Core 5':8,'Core i7':10,'Ryzen 7':10,'Core Ultra 5':10,'Snapdragon X Plus':10,'Core 7':11,'Core Ultra 7':13,'Snapdragon X Elite':13,'Core i9':14,'Ryzen 9':14,'Core Ultra 9':17} as Record<string, number>,
  procGer: [['recente',3,'Geração atual (Core série 1/2/3, Core Ultra, Ryzen AI/7000+, Snapdragon X, Apple M4/M5)'],['13ª ger. Intel',1,'13ª geração Intel de notebook (ex.: i5-1334U)'],['anterior',1,'Geração anterior (Apple M2/M3; desktop Intel 12ª–14ª; Ryzen 5000 de desktop)'],['antiga',0,'Mais antiga (ex.: Apple M1)']] as [string, number, string][],
  procSuf: [['U',0,'U / G – Econômico (bateria)'],['ARM',2,'Snapdragon (ARM) – Eficiência'],['V',2,'V (Lunar Lake) – Eficiência'],['P',4,'P – Intermediário'],['H',8,'H / HS – Desempenho'],['HX',10,'HX – Alto desempenho'],['APL',4,'Apple (chip padrão)'],['APLP',8,'Apple Pro'],['APLM',10,'Apple Max / Ultra'],['T',4,'Desktop T – econômico'],['D',8,'Desktop (sem letra, F ou G)'],['DK',10,'Desktop K / KF / X / X3D – alto desempenho']] as [string, number, string][],
  gpu: {'Integrada':3,'Apple M (integrada)':7,'Apple M Pro':11,'Apple M Max':15,'RX 570':4,'RX 580':5,'GTX 1650':5,'Arc A380':5,'RX 6500 XT':5,'RX 6600':11,'RTX 3060':12,'RX 7600':13,'Arc B580':13,'RX 9060 XT':15,'RTX 4060 Ti':15,'RTX 5060 Ti':16,'RTX 3070':15,'RX 7700 XT':16,'RX 7800 XT':17,'RTX 4070 Super':17,'RTX 4070 Ti':18,'RX 9070':18,'RTX 4070 Ti Super':18,'RX 9070 XT':19,'RTX 4080 Super':19,'RX 7900 XTX':19,'RTX 2050':6,'RTX PRO 500':8,'RTX 3050':8,'RTX PRO 1000':10,'RTX 4050':11,'RTX 5050':12,'RTX PRO 2000':13,'RTX 4060':14,'RTX 5060':15,'RTX PRO 3000':15,'RTX 4070':16,'RTX 5070':17,'RTX 5070 Ti':18,'RTX 4080':19,'RTX 5080':19,'RTX 4090':20,'RTX 5090':20} as Record<string, number>,
  ram: [[64,15],[32,14],[24,12],[16,10],[12,7],[8,5],[4,2]] as Faixa,
  armaz: [[2000,10],[1000,8],[512,6],[256,3],[128,1]] as Faixa,
  res: [[2880,8,'2,8K / 3K ou mais'],[2560,7,'QHD / QHD+ / 2,5K'],[1920,5,'Full HD / FHD+'],[1366,2,'HD']] as Faixa,
  oled: 2,
  hz: [[240,4],[144,3],[90,2],[1,1]] as Faixa,
  telaGrande: 1,
  max: {proc: 30, gpu: 20, ram: 15, armaz: 10, tela: 15},
  maxBruto: 90,
  pesoPreco: 0.3,
};

export const faixa = (tab: Faixa, v: number) => { for (const r of tab) if (v >= r[0]) return r[1]; return 0; };

export type ParteId = 'procBase' | 'procGer' | 'procSuf' | 'gpu' | 'ram' | 'armaz' | 'telaRes' | 'telaHz' | 'telaTam';
export const PARTES: [ParteId, string, string][] = [
  ['procBase','Processador','processador (família)'],['procGer','Processador','geração da CPU'],['procSuf','Processador','sufixo da CPU'],
  ['gpu','Placa de vídeo','GPU'],['ram','Memória RAM','RAM'],['armaz','Armazenamento','armazenamento'],
  ['telaRes','Tela','resolução da tela'],['telaHz','Tela','taxa da tela'],['telaTam','Tela','tamanho da tela'],
];
export const rotuloParte = (k: ParteId) => PARTES.find(p => p[0] === k)![2];

export const semTela = (n: Produto) => n.temTela === false;
/** Grupos comparados entre si no custo-benefício. */
export const grupo = (n: Produto) => (n.tipo === 'Notebook' || n.tipo === 'MacBook' || !n.tipo) ? 'Notebooks' : (n.temTela ? 'All-in-one' : 'Desktops');

type Bruto = number | null | 'na';
export function brutos(n: Produto): Record<ParteId, Bruto> {
  const sufK = ({G: 'U', HS: 'H'} as Record<string, string>)[n.cpuSufixo || ''] || n.cpuSufixo;
  const sr = NOTA.procSuf.find(r => r[0] === sufK);
  const pol = parseFloat(String(n.telaPol));
  return {
    procBase: NOTA.procBase[n.cpuFamilia || ''] ?? null,
    procGer: n.cpuGeracao == null ? null : ((NOTA.procGer.find(r => r[0] === n.cpuGeracao) || [0, 0])[1] as number),
    procSuf: sr ? sr[1] : null,
    gpu: NOTA.gpu[n.gpuModelo || ''] ?? null,
    ram: n.ramGB ? faixa(NOTA.ram, n.ramGB) : null,
    armaz: n.armazGB ? faixa(NOTA.armaz, n.armazGB) : null,
    telaRes: semTela(n) ? 'na' : n.telaResW ? faixa(NOTA.res, n.telaResW) : null,
    telaHz: semTela(n) ? 'na' : n.telaHz ? faixa(NOTA.hz, n.telaHz) : null,
    telaTam: semTela(n) ? 'na' : pol ? (pol >= 15 ? NOTA.telaGrande : 0) : null,
  };
}

/* ---------- Categorias ---------- */
export const CATEGORIAS = ['Entrada', 'Básico', 'Intermediário', 'Gamer', 'Avançado', 'Topo de linha'] as const;
export type Categoria = typeof CATEGORIAS[number];
export const DESC_CAT: Record<Categoria, string> = {
  'Entrada': 'Tarefas leves: navegar, estudar, documentos. Celeron, Intel N, Athlon, 4 GB.',
  'Básico': 'Uso do dia a dia. Core i3/i5, Ryzen 3/5, Core 3/5 com 8 GB.',
  'Intermediário': 'Trabalho e multitarefa. Core i7, Ryzen 7, Core Ultra, Apple M, ou i5/Ryzen 5 com 16 GB.',
  'Gamer': 'Jogos e programas pesados de entrada. Placa de vídeo dedicada (RTX 3050/4050/5050, RX 6600…).',
  'Avançado': 'Jogos pesados e trabalho profissional. RTX 4060/5060 ou superior, Apple M Pro.',
  'Topo de linha': 'O máximo: RTX 4080/4090/5080/5090, RX 9070 XT/7900 XTX, Apple M Max/Ultra.',
};
const LINHAS_GAMER = /gamer|gaming|\bnitro\b|predator|helios|legion|\bloq\b|\brog\b|\btuf\b|victus|\bomen\b|alienware|katana|cyborg|\bg1[56]\b|aorus|strix/i;

/** Categoria a partir do que se SABE do computador (nada estimado entra aqui). */
export function categoria(n: Produto): Categoria {
  const g = n.gpuModelo || '', f = n.cpuFamilia || '', s = n.cpuSufixo || '', nome = n.nome || '', preco = n.precoNum || 0;
  const gp = NOTA.gpu[g] ?? null, fp = NOTA.procBase[f] ?? null;
  const ded = n.gpuDedicada === true;
  if ((ded && gp != null && gp >= 19) || s === 'APLM') return 'Topo de linha';
  if ((ded && gp != null && gp >= 14) || s === 'APLP' || /RTX\s*PRO\s*[2-9]/i.test(g)) return 'Avançado';
  const nomeSemAcess = nome.replace(/(monitor|mouse|teclado|headset|fone|cadeira|kit|mousepad)\s+gamer/gi, '');
  if (ded || (n.gpuDedicada == null && LINHAS_GAMER.test(nomeSemAcess))) return (fp != null && fp >= 13 && (s === 'HX' || s === 'DK')) ? 'Avançado' : 'Gamer';
  if (['Celeron', 'Pentium', 'Athlon', 'MediaTek', 'Intel N'].includes(f) || (n.ramGB && n.ramGB <= 4) || /e-?mmc/i.test(nome)) return 'Entrada';
  if (fp != null) {
    if (fp >= 10 || f.startsWith('Apple M') && f !== 'Apple M1') return 'Intermediário';
    if (fp >= 7 && (n.ramGB || 0) >= 16) return 'Intermediário';
    return 'Básico';
  }
  if (!preco) return 'Básico';
  return preco < 1800 ? 'Entrada' : preco < 3500 ? 'Básico' : 'Intermediário';
}

/** Computador típico de cada categoria: usado quando o dado não está no anúncio NEM no banco (aparece como "estimado"). */
export const PADRAO: Record<Categoria, {cpuFamilia: string; cpuGeracao: string; cpuSufixo: string; gpuModelo: string; ramGB: number; armazGB: number; telaResW: number; telaHz: number; telaPol: string}> = {
  'Entrada':       {cpuFamilia: 'Intel N', cpuGeracao: 'antiga',         cpuSufixo: 'U',  gpuModelo: 'Integrada', ramGB: 4,  armazGB: 128,  telaResW: 1366, telaHz: 60,  telaPol: '14'},
  'Básico':        {cpuFamilia: 'Core i3', cpuGeracao: '13ª ger. Intel', cpuSufixo: 'U',  gpuModelo: 'Integrada', ramGB: 8,  armazGB: 256,  telaResW: 1920, telaHz: 60,  telaPol: '15.6'},
  'Intermediário': {cpuFamilia: 'Core i5', cpuGeracao: '13ª ger. Intel', cpuSufixo: 'U',  gpuModelo: 'Integrada', ramGB: 16, armazGB: 512,  telaResW: 1920, telaHz: 60,  telaPol: '15.6'},
  'Gamer':         {cpuFamilia: 'Core i5', cpuGeracao: '13ª ger. Intel', cpuSufixo: 'H',  gpuModelo: 'RTX 3050',  ramGB: 16, armazGB: 512,  telaResW: 1920, telaHz: 144, telaPol: '15.6'},
  'Avançado':      {cpuFamilia: 'Core i7', cpuGeracao: 'recente',        cpuSufixo: 'H',  gpuModelo: 'RTX 4060',  ramGB: 16, armazGB: 1000, telaResW: 2560, telaHz: 165, telaPol: '16'},
  'Topo de linha': {cpuFamilia: 'Core i9', cpuGeracao: 'recente',        cpuSufixo: 'HX', gpuModelo: 'RTX 4080',  ramGB: 32, armazGB: 2000, telaResW: 2560, telaHz: 240, telaPol: '16'},
};
function sufPadrao(c: Produto, pd: typeof PADRAO[Categoria], cat: Categoria) {
  if ((c.cpuFamilia || '').startsWith('Apple')) return 'APL';
  if (c.temTela === false && c.tipo !== 'Mac') return cat === 'Entrada' ? 'U' : pd.cpuSufixo === 'HX' ? 'DK' : 'D';
  return pd.cpuSufixo;
}

/** Cópia do produto com o que falta preenchido pelo padrão da categoria; est = partes estimadas. */
export function completar(n: Produto): {c: Produto; est: ParteId[]; cat: Categoria} {
  const cat = categoria(n), pd = PADRAO[cat], c: Produto = {...n}, est: ParteId[] = [];
  if (NOTA.procBase[c.cpuFamilia || ''] == null) { c.cpuFamilia = pd.cpuFamilia; est.push('procBase'); }
  if (!NOTA.procGer.some(r => r[0] === c.cpuGeracao)) { c.cpuGeracao = (c.cpuFamilia || '').startsWith('Apple') ? 'anterior' : pd.cpuGeracao; est.push('procGer'); }
  const sufK = ({G: 'U', HS: 'H'} as Record<string, string>)[c.cpuSufixo || ''] || c.cpuSufixo;
  if (!NOTA.procSuf.some(r => r[0] === sufK)) { c.cpuSufixo = sufPadrao(c, pd, cat); est.push('procSuf'); }
  if (NOTA.gpu[c.gpuModelo || ''] == null) {
    c.gpuModelo = c.gpuDedicada === false ? 'Integrada' : (c.gpuDedicada && pd.gpuModelo === 'Integrada') ? 'RTX 3050' : pd.gpuModelo;
    est.push('gpu');
  }
  if (!c.ramGB) { c.ramGB = pd.ramGB; est.push('ram'); }
  if (!c.armazGB) { c.armazGB = pd.armazGB; est.push('armaz'); }
  if (!semTela(c)) {
    if (!c.telaResW) { c.telaResW = pd.telaResW; est.push('telaRes'); }
    if (!c.telaHz) { c.telaHz = pd.telaHz; est.push('telaHz'); }
    if (!parseFloat(String(c.telaPol))) { c.telaPol = pd.telaPol; est.push('telaTam'); }
  }
  return {c, est, cat};
}

export interface ItemNota { k: string; v: string; p: number; m: number; estimado: boolean; partesEst: ParteId[]; obs: string }
export interface Pontuacao {
  itens: ItemNota[]; bruto: number; maxBruto: number; total: number; estimados: ParteId[]; rotulosEst: string[]; semTela?: boolean; cat: Categoria;
  cb?: number | null; grupo?: string; cbPct?: number | null; cbFinal?: number | null;
}

export function pontuar(n: Produto): Pontuacao {
  const {c, est, cat} = completar(n);
  const b = brutos(c), it: ItemNota[] = [];
  const e = (k: ParteId) => est.includes(k);
  const pad = ` (padrão ${cat})`;
  const num = (x: Bruto) => (typeof x === 'number' ? x : 0);
  const mk = (k: string, v: string, partes: ParteId[], m: number, obs?: (ps: Bruto[]) => string) => {
    const ps = partes.map(x => b[x]); const pe = partes.filter(e);
    it.push({k, v, p: r1(Math.min(m, ps.reduce<number>((s, x) => s + num(x), 0))), m, estimado: pe.length > 0, partesEst: pe, obs: obs ? obs(ps) : ''});
  };
  const cpuTxt = e('procBase') ? `${c.cpuFamilia}${pad}` : (n.cpuModelo || n.procFamilia || c.cpuFamilia || '');
  mk('Processador', cpuTxt, ['procBase', 'procGer', 'procSuf'], NOTA.max.proc,
    ps => `família ${fmt1(num(ps[0]))}${e('procBase') ? '*' : ''} + geração ${fmt1(num(ps[1]))}${e('procGer') ? '*' : ''} + perfil ${fmt1(num(ps[2]))}${e('procSuf') ? '*' : ''} (${c.cpuSufixo})`);
  mk('Placa de vídeo', e('gpu') ? `${c.gpuModelo}${pad}` : String(n.gpuModelo), ['gpu'], NOTA.max.gpu);
  mk('Memória RAM', `${c.ramGB} GB${e('ram') ? pad : ''}`, ['ram'], NOTA.max.ram);
  const tam = (g: number) => g >= 1000 ? g / 1000 + ' TB' : g + ' GB';
  mk('Armazenamento', `${tam(c.armazGB!)}${e('armaz') ? pad : ''}`, ['armaz'], NOTA.max.armaz);
  if (semTela(n)) {
    const bruto = r1(it.reduce((s, x) => s + x.p, 0)), maxB = NOTA.maxBruto - NOTA.max.tela;
    return {itens: it, bruto, maxBruto: maxB, total: r1(bruto / maxB * 100), estimados: est, rotulosEst: est.map(rotuloParte), semTela: true, cat};
  }
  const op = n.telaOled ? NOTA.oled : 0;
  const resTxt = e('telaRes') ? `${c.telaResW} px${pad}` : (n.telaRes || n.telaResW + ' px');
  const tv = [resTxt, n.telaOled ? 'OLED' : '', `${c.telaHz} Hz${e('telaHz') ? '*' : ''}`, fmtPol(c.telaPol) + (e('telaTam') ? '*' : '')].filter(Boolean).join(' · ');
  const tp = (['telaRes', 'telaHz', 'telaTam'] as ParteId[]).map(x => num(b[x]));
  const pe = (['telaRes', 'telaHz', 'telaTam'] as ParteId[]).filter(e);
  it.push({k: 'Tela', v: tv, p: r1(Math.min(NOTA.max.tela, tp[0] + op + tp[1] + tp[2])), m: NOTA.max.tela, estimado: pe.length > 0, partesEst: pe,
    obs: `resolução ${fmt1(tp[0])}${e('telaRes') ? '*' : ''}${op ? ' + OLED ' + op : ''} + Hz ${fmt1(tp[1])}${e('telaHz') ? '*' : ''} + tamanho ${fmt1(tp[2])}${e('telaTam') ? '*' : ''}`});
  const bruto = r1(it.reduce((s, x) => s + x.p, 0));
  return {itens: it, bruto, maxBruto: NOTA.maxBruto, total: r1(bruto / NOTA.maxBruto * 100), estimados: est, rotulosEst: est.map(rotuloParte), cat};
}

/** Notas de todos os computadores + melhor valor-pelo-preço de cada grupo. */
export function calcularNotas(pcs: Produto[]): {notas: Map<string, Pontuacao>; melhorCb: Record<string, number>} {
  const notas = new Map<string, Pontuacao>(), melhorCb: Record<string, number> = {};
  for (const n of pcs) {
    const r = pontuar(n);
    r.cb = n.precoNum ? r.total / (n.precoNum / 1000) : null;
    r.grupo = grupo(n);
    notas.set(n.id, r);
    if (r.cb != null) melhorCb[r.grupo] = Math.max(melhorCb[r.grupo] || 0, r.cb);
  }
  for (const r of notas.values()) {
    const m = melhorCb[r.grupo!];
    r.cbPct = (r.cb != null && m) ? Math.round(r.cb / m * 100) : null;
    r.cbFinal = r.cbPct == null ? null : r1((1 - NOTA.pesoPreco) * r.total + NOTA.pesoPreco * r.cbPct);
  }
  return {notas, melhorCb};
}

export const P_HW = Math.round((1 - NOTA.pesoPreco) * 100);
export const P_PRECO = Math.round(NOTA.pesoPreco * 100);
