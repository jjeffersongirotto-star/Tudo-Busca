/** Cards de seleção: seção → sub-card → item. Para criar um card novo, acrescente aqui
 *  (e, no servidor, um item em servidor/coleta/categorias.py). */
import type { Produto } from './tipos';

export interface ItemCfg { id: string; nome: string; icone: string; cupom?: RegExp; cupomItem?: RegExp; cupomOutro?: RegExp }
export interface SubCfg { id: string; nome: string; icone: string; emBreve?: boolean; itens?: ItemCfg[] }
export interface SecaoCfg {
  id: 'computadores' | 'games'; nome: string; icone: string; desc: string; subs: SubCfg[];
  /** lojas cujos cupons interessam à seção (somam-se às lojas dos produtos listados) */
  lojasCupom: string[];
  /** categorias de cupom que aparecem na seção (maior = antes; ausente = escondido) */
  pesosCupom: Record<string, number>;
}

export const SECOES: SecaoCfg[] = [
  {id: 'computadores', nome: 'Computadores', icone: '💻', desc: 'Notebooks, desktops, Macs',
   subs: [
     {id: 'todos', nome: 'Notebooks e PCs', icone: '💻'},
     {id: 'acessorios', nome: 'Acessórios', icone: '🖱️', emBreve: true},
   ],
   lojasCupom: ['Dell.com', 'KaBuM!', 'Amazon', 'Magazine Luiza', 'Casas Bahia', 'Mercado Livre', 'Fast Shop', 'Lenovo', 'Samsung', 'Acer', 'Asus', 'Positivo',
     'Pichau', 'Terabyte', 'iByte', 'Carrefour', 'Ponto', 'Extra', 'Americanas', 'Avell', 'Webcontinental', 'HP', 'Multilaser', 'Vaio', 'Microsoft', 'Kalunga', 'Submarino', 'Shoptime'],
   pesosCupom: {'Computadores': 4, 'Informática': 3, 'Loja toda': 2, 'Geral': 2, 'Produtos selecionados': 1}},
  {id: 'games', nome: 'Games', icone: '🎮', desc: 'Consoles e acessórios',
   subs: [
     {id: 'consoles', nome: 'Consoles', icone: '🕹️', itens: [
       {id: 'console-ps5', nome: 'PlayStation 5', icone: '🎮', cupom: /console|\bps\s?5\b|playstation/i,
        cupomItem: /console\s+(?:sony\s+)?(?:ps\s?5|playstation\s*5)|playstation\s*5\s+(?:slim|pro|digital)|\bps\s?5\s+(?:slim|pro|digital)/i,
        cupomOutro: /xbox|switch|nintendo|controle|dual\s?sense|headset|\bjogos?\b|\bgta\b/i},
       {id: 'console-ps4', nome: 'PlayStation 4', icone: '🎮', cupom: /console|\bps\s?4\b|playstation/i,
        cupomItem: /console\s+(?:sony\s+)?(?:ps\s?4|playstation\s*4)/i, cupomOutro: /xbox|switch|nintendo|\bps\s?5\b|controle|\bjogos?\b/i},
       {id: 'console-xbox', nome: 'Xbox', icone: '🟩', cupom: /console|xbox/i,
        cupomItem: /console\s+(?:microsoft\s+)?xbox|xbox\s+series\s+[xs]/i, cupomOutro: /playstation|\bps\s?[45]\b|switch|nintendo|controle|\bjogos?\b|game\s*pass/i},
       {id: 'console-switch2', nome: 'Switch 2', icone: '🟥', cupom: /console|switch|nintendo/i,
        cupomItem: /switch\s*2/i, cupomOutro: /playstation|\bps\s?[45]\b|xbox|joy-?con|\bjogos?\b|\bcase\b/i},
       {id: 'console-switch', nome: 'Switch (OLED, Lite)', icone: '🟥', cupom: /console|switch|nintendo/i,
        cupomItem: /console\s+nintendo\s+switch(?!\s*2)|switch\s+(?:oled|lite)/i, cupomOutro: /playstation|\bps\s?[45]\b|xbox|switch\s*2|joy-?con|\bjogos?\b|\bcase\b/i},
     ]},
     {id: 'acessorios', nome: 'Acessórios', icone: '🎧', itens: [
       {id: 'controle-ps5', nome: 'Controles de PS5', icone: '🎮', cupom: /controle|dual\s?sense|\bps\s?5\b|playstation/i,
        cupomItem: /dual\s?sense|controles?\s+(?:sem\s+fio\s+)?(?:(?:do|de|para)\s+)?(?:ps\s?5|playstation)|controles?\s+(?:sony|ps)/i,
        cupomOutro: /xbox|switch|nintendo|\bps\s?5\s+(?:pro|slim|digital)|console|\bgta\b|\bjogos?\s+(?:de\s+)?(?:ps|xbox|switch)/i},
       {id: 'controle-ps4', nome: 'Controles de PS4', icone: '🎮', cupom: /controle|dual\s?shock|\bps\s?4\b|playstation/i,
        cupomItem: /dual\s?shock|controles?\s+(?:(?:do|de|para)\s+)?(?:ps\s?4|playstation\s*4)/i, cupomOutro: /xbox|switch|nintendo|dual\s?sense|\bps\s?5\b|console/i},
       {id: 'controle-xbox', nome: 'Controles de Xbox', icone: '🎮', cupom: /controle|xbox/i,
        cupomItem: /controles?\s+(?:sem\s+fio\s+)?(?:(?:do|de|para)\s+)?xbox/i, cupomOutro: /playstation|\bps\s?[45]\b|switch|nintendo|console|game\s*pass/i},
       {id: 'controle-switch', nome: 'Controles de Switch', icone: '🎮', cupom: /controle|joy-?con|switch|nintendo/i,
        cupomItem: /joy-?con|pro\s+controller|controles?\s+(?:(?:do|de|para)\s+)?(?:nintendo\s+)?switch/i, cupomOutro: /playstation|\bps\s?[45]\b|xbox|console/i},
       {id: 'acessorio-ps', nome: 'Outros PlayStation', icone: '🎧', cupom: /headset|fone|carregador|portal|playstation|\bps\s?[45]\b/i,
        cupomOutro: /xbox|switch|nintendo|console\s/i},
       {id: 'acessorio-xbox', nome: 'Outros Xbox', icone: '🎧', cupom: /headset|fone|bateria|xbox/i, cupomOutro: /playstation|\bps\s?[45]\b|switch|nintendo|console\s/i},
       {id: 'acessorio-switch', nome: 'Outros Switch', icone: '🎧', cupom: /case|capa|dock|micro\s?sd|switch|nintendo/i, cupomOutro: /playstation|\bps\s?[45]\b|xbox|console\s/i},
     ]},
   ],
   lojasCupom: ['KaBuM!', 'Amazon', 'AliExpress', 'Shopee', 'Temu', 'Magazine Luiza', 'Mercado Livre', 'Casas Bahia', 'Fast Shop', 'Americanas', 'Carrefour',
     'Extra', 'Ponto', 'Pichau', 'Terabyte', 'Webcontinental', 'iByte', 'Submarino', 'Shoptime'],
   pesosCupom: {'Games': 4, 'Loja toda': 2, 'Geral': 2, 'Produtos selecionados': 1}},
];

export interface Selecao { secao: string; sub: string; item: string }
export const SELECAO_PADRAO: Selecao = {secao: 'computadores', sub: 'todos', item: ''};

export const secaoDe = (n: {secao?: string}) => n.secao || 'computadores';

export function separarSecoes(produtos: Produto[]) {
  return {pcs: produtos.filter(n => secaoDe(n) === 'computadores'), jogos: produtos.filter(n => secaoDe(n) === 'games')};
}

export const secaoAtual = (sel: Selecao) => SECOES.find(s => s.id === sel.secao) || SECOES[0];
export const subAtual = (sel: Selecao) => { const s = secaoAtual(sel); return s.subs.find(x => x.id === sel.sub) || s.subs.find(x => !x.emBreve) || s.subs[0]; };
export const itemAtual = (sel: Selecao) => ((subAtual(sel).itens || []).find(i => i.id === sel.item)) || null;

export const naSecao = (n: Produto, sec: string, sub: string, item?: string | null) =>
  secaoDe(n) === sec && (sec === 'computadores' ? sub === 'todos' : (n.sub === sub && (!item || n.item === item)));

export function produtosSel(sel: Selecao, pcs: Produto[], jogos: Produto[]): Produto[] {
  const s = secaoAtual(sel), sb = subAtual(sel), it = itemAtual(sel);
  if (sb.emBreve) return [];
  return (s.id === 'computadores' ? pcs : jogos).filter(n => naSecao(n, s.id, sb.id, it && it.id));
}

export const contar = (sec: string, sub: string, pcs: Produto[], jogos: Produto[], item?: string) =>
  (sec === 'computadores' ? (sub === 'acessorios' ? [] : pcs) : jogos.filter(n => naSecao(n, sec, sub, item))).length;

export const nomeSel = (sel: Selecao) => {
  const s = secaoAtual(sel), sb = subAtual(sel), it = itemAtual(sel);
  return it ? it.nome : (s.id === 'computadores' && sb.id === 'todos' ? s.nome : `${s.nome} › ${sb.nome}`);
};

/** Nova seleção: ao trocar de seção pega o 1º sub-card disponível e o 1º item dele; ao trocar de sub, o 1º item. */
export function mudarSelecao(atual: Selecao, nova: Partial<Selecao>): Selecao {
  const sel: Selecao = {...atual, ...nova};
  const s = secaoAtual(sel);
  if (nova.secao) { const sb = s.subs.find(x => !x.emBreve) || s.subs[0]; sel.sub = sb.id; sel.item = (sb.itens || [])[0] ? sb.itens![0].id : ''; }
  else if (nova.sub) { const sb = subAtual(sel); sel.item = (sb.itens || [])[0] ? sb.itens![0].id : ''; }
  return sel;
}

/** Categoria de busca no servidor (/api/atualizar?categoria=) do card selecionado. */
export const categoriaBusca = (sel: Selecao) => (sel.secao === 'games' ? 'games' : 'computadores');
export const nomeCategoriaBusca = (sel: Selecao) =>
  sel.secao === 'games' ? (itemAtual(sel)?.nome || 'Games') : 'Computadores';

export function itemCfg(n: {secao?: string; item?: string}): ItemCfg | null {
  const s = SECOES.find(x => x.id === secaoDe(n)) || SECOES[0];
  return s.subs.flatMap(x => x.itens || []).find(i => i.id === n.item) || null;
}
