/** Cupons: categoria, escopo (vale para o produto?), compra mínima, desconto e preço estimado. Porte fiel do cupons-dell.html. */
import type { Cupom, Produto } from './tipos';
import { SECOES, secaoDe, itemCfg, type SecaoCfg } from './secoes';
import { reais, numBR } from './formato';

export const CATS_CUPOM = ['Computadores', 'Games', 'Informática', 'Loja toda', 'Produtos selecionados', 'Geral', 'Outros produtos'];
export const OPCOES_CAT_CUPOM: [string, string][] = [['', 'Todos'], ['Computadores', '💻 Computadores'], ['Games', '🎮 Games'], ['Informática', '🖱️ Informática'],
  ['Loja toda', '🏬 Loja toda'], ['Geral', '🏷️ Geral (não cita produto)'], ['Produtos selecionados', '📦 Produtos selecionados'], ['Outros produtos', 'Outros produtos']];
export const LIMITE_CUPONS = 50;
export const lojaDoCupom = (c: Cupom) => c.loja || 'Dell.com';

/** Categoria do cupom: a que veio da coleta; nos cupons antigos, deduzida do texto. */
export function catCupom(c: Cupom): string {
  if (CATS_CUPOM.includes(c.categoria || '')) return c.categoria!;
  const t = ((c.descricao || '') + ' ' + (c.categoria || '')).toLowerCase();
  if (/\bps\s?[2345]\b|playstation|dual\s?sense|xbox|nintendo|\bswitch\b|\bconsoles?\b|video\s?games?|\bgames?\b|gamepad|joystick|\bgta\b/.test(t)) return 'Games';
  if (/notebook|laptop|computador|\bpcs?\b|desktop|macbook|all.in.one|alienware|inspiron|xps|latitude|vostro/.test(t)) return 'Computadores';
  if (/monitor|placa|mem[oó]ria|ssd|impressora|mouse|teclado|acess[oó]rio|perif[eé]ric|gamer|tablet|servidor/.test(t)) return 'Informática';
  if (/todo o site|site todo|loja toda|primeiro pedido|primeira compra|todo/.test(t)) return 'Loja toda';
  return 'Outros produtos';
}

/** Loja cujos cupons valem para o produto (Zoom/Buscapé → o vendedor real). */
export const lojaCupomDe = (n: Produto) => /^Zoom\/Buscap/.test(n.loja || '') ? (n.vendedor || '') : (n.loja || 'Dell.com');

export interface ContextoCupons { nome: string; secao: SecaoCfg; lojas: Set<string>; pesos: Record<string, number>; cupom: RegExp | null | undefined }
export const pesoCupom = (c: Cupom, ctx: ContextoCupons) =>
  (ctx.pesos[catCupom(c)] || 0) + (ctx.cupom && (ctx.pesos[catCupom(c)] || 0) > 0 && ctx.cupom.test(c.descricao || '') ? 2 : 0);

export const PALAVRAS_SECAO: Record<string, RegExp> = {
  games: /controle|dual\s?sense|\bps\s?5\b|playstation|console|videogame|\bgames?\b|\bjogos?\b|gamer/,
  computadores: /notebook|laptop|computador|\bpcs?\b|desktop|macbook|all.in.one/,
};
const PALAVRAS_OUTRAS = /moda|roupa|vestu[aá]rio|cal[cç]ado|t[eê]nis|beleza|cosm[eé]tic|perfum|maquiagem|supermercado|mercado\b|bebida|vinho|m[oó]ve(?:l|is)|decora|\bcasa\b|cozinha|eletrodom|pneu|automotiv|\bpet\b|brinquedo|livro|farm[aá]cia|suplement|celular|smartphone|iphone|smart\s?tv|\btvs?\b|monitor|impressora|notebook|computador|\bpcs?\b|\bgames?\b|console|ar.condicionado|geladeira|fog[aã]o|ferrament|jardim|joias|rel[oó]gio|reforma|higiene|sa[uú]de|cuidados|bikes?|looks?|salgadinho|chocolate|biscoito|tabletes?\b|trident|halls|bala\b|papelaria|colch|sof[aá]s?\b|esteira|bebê|beb[eê]s|\bleve\s+\d|cada\s+unidade/;
const CAT_TXT: [string, RegExp][] = [
  ['Games', /\bps\s?[2345]\b|playstation|dual\s?sense|xbox|nintendo|\bswitch\b|\bconsoles?\b|video\s?games?|\bgames?\b|\bjogos?\b|gamepad|joystick|\bgta\b|gamer/],
  ['Computadores', /notebook|laptop|computador|\bpcs?\b|desktop|macbook|all.in.one|chromebook|ultrabook|alienware|ideapad|vivobook|\bcpu\b/],
  ['Informática', /monitor|placa|mem[oó]ria|\bssd\b|\bhd\b|impressora|multifuncional|mouse|teclado|headset|\bfones?\b|webcam|roteador|perif[eé]ric|processador|tablet|inform[aá]tica|tecnologia|eletr[oô]nicos?|\btvs?\b|smartphone|celular|iphone|scanner|microfone|starlink|antena/],
  ['Outros produtos', PALAVRAS_OUTRAS],
];
const SELECAO = /selecionad|participantes|sele[cç][aã]o|da lista|na lista|do link|no link|listad|eleg[ií]ve|da campanha|indicad|com a tag|da promo[cç][aã]o/;
const GENERICAS = new Set(('compra compras pedido pedidos carrinho site app aplicativo todo toda todos todas tudo seu sua seus suas loja lojas primeira primeiro qualquer esquenta black oferta ofertas '
  + 'página pagina link cupom cupons voucher vouchers código codigo valor dia hoje diversas várias varias nossa nossos produto produtos item itens mercadorias artigos categorias seleção selecao lista '
  + 'campanha promoção promocao semana período periodo tempo estoque checkout finalização pagamento pix boleto cartão cartao frete entrega entregas novo novos nova novas cliente clientes usuário usuários '
  + 'usuario usuarios membro membros desconto descontos economia economizar até ate uso validade regras condições condicoes cashback vantagens carrinho valor sonhos méliuz meliuz conta '
  + 'shopee kabum amazon magalu magazine luiza aliexpress fast shop temu mercado livre americanas casas bahia ponto extra carrefour webcontinental ibyte pichau terabyte submarino shoptime '
  + 'participantes participante selecionados selecionadas selecionado elegíveis especial especiais categoria abatimento finalizar vendedores canais vitrine preço preco etapa momento tag terceiros matéria curadoria hora pagar resumo vantagem vantagens fechar benefícios busca identificação achados com cadastro longa alta ponta alto modelos atualização fechamento estreia sacola total configurações parceiro antecipa máximo conteúdo carrinho. '
  + 'off outubro novembro dezembro madrugada noite manhã tarde fim prime vendidos vendido elegíveis compras. oferta. a o as os um uma').split(' '));

export const TEXTO_CUPOM = (c: Cupom) => ((c.descricao || '') + ' . ' + (c.regras || '') + (c.condicoes && c.condicoes !== 'Confira as regras no site da loja' && c.condicoes !== c.regras ? ' . ' + c.condicoes : ''));
const semExclusoes = (t: string) => t.replace(/n[aã]o\s+(?:[eé]\s+)?(?:aplic[aá]vel|v[aá]lid[oa]|vale|se\s+aplica|cumulativ[oa])[^.;!]*/gi, ' ').replace(/exceto[^.;!]*/gi, ' ');

export function especifico(bruto: string): string {
  const t = semExclusoes(bruto);
  for (const m of t.matchAll(/\b(?:no|na|nos|nas|em|do|da|dos|das|de)\s+(?:(?:a|o|um|uma)\s+)?([A-Za-zÀ-ú][\wÀ-ú\-]*)/g)) {
    const w = m[1].toLowerCase();
    if (w.length >= 3 && !GENERICAS.has(w) && !/^[a-zà-ú]{3,}(?:ar|er|ir)$/.test(w)) return m[1];
  }
  const marca = t.match(/\b(?:[Pp]rodutos?|[Ii]tens|[Ll]inha|[Ll]an[cç]amento|[Mm]arca|[Ss]ele[cç][aã]o)\s+([A-ZÀ-Ú][\wÀ-ú]+)/);
  return marca && !GENERICAS.has(marca[1].toLowerCase()) ? marca[1] : '';
}

/** Código que traz a marca/categoria (ex.: PHILCO50, LUUNA200, MOVEIS8) indica cupom de outro produto. */
const CODIGO_OUTRO = /philco|brit[aâ]nia|britania|midea|elux|electrolux|jbl|luuna|positivo|samsung|^lg|^wap|asics|mantecorp|forever|tcl|elgin|starlink|^star\d|apple|iphone|xiaomi|motorola|^moto|lenovo|^dell|acer|asus|^rog|husky|kingston|brother|epson|razer|anycubic|signature|^grow|^west|^pet\d|moveis|clima|nintendo|xbox|^tv\d|^note|^nb\d|impressora|scanner|^ssd|^mou\d|^mb\d|^ar\w*\d|cafe|^edge|kids|lacta|elma|gulo|baby|instala|madesa|toy|^sono|biscoito|^super\d|brinquedo|^eletro|^moto\d|^hello|^quero\d{3}|moda|beleza|pneu|bike|suplement|creatina|^cpu|placa|monitor|tablet|ideatab|avell|^cama|cozinha|limpeza|^buds/i;

export function restricaoCupom(c: Cupom, sec: string): string {
  const t = TEXTO_CUPOM(c).toLowerCase(), propria = PALAVRAS_SECAO[sec] || /$^/;
  const exc = t.match(/n[aã]o\s+(?:[eé]\s+)?(?:aplic[aá]vel|v[aá]lid[oa]|vale|se\s+aplica)\s+(?:a|para|em|aos?|nas?|nos?)\s+([^.;!]{0,220})/);
  if (exc && propria.test(exc[1])) return 'as regras excluem esse tipo de produto';
  const so = t.match(/(?:somente|apenas|s[oó]|exclusiv[oa]s?|v[aá]lid[oa]s?\s+(?:somente|apenas|s[oó]))\s+(?:para|em|n[oa]s?|aos?|na\s+categoria)\s+([^.;!]{0,60})/);
  if (so && PALAVRAS_OUTRAS.test(so[1]) && !propria.test(so[1])) return 'só vale para outra categoria';
  return '';
}

export type TipoEscopo = 'item' | 'geral' | 'selecao' | 'outro' | 'fora';
export interface Escopo { tipo: TipoEscopo; motivo?: string }

/** Escopo do cupom para um produto (ou só {secao, item}, na coluna de cupons):
 *  item → cita o próprio item · geral → não cita produto/categoria/marca · selecao → "itens selecionados" (confira)
 *  outro → cita outra categoria, produto ou marca · fora → as regras restringem a outra categoria. */
export function escopoCupom(c: Cupom, n: {secao?: string; item?: string}): Escopo {
  const sec = secaoDe(n), bruto = TEXTO_CUPOM(c), t = semExclusoes(bruto).toLowerCase();
  const r = restricaoCupom(c, sec);
  if (r) return {tipo: 'fora', motivo: r};
  const it = itemCfg(n);
  if (it && it.cupomItem && it.cupomItem.test(t)) return {tipo: 'item'};
  const cat = (CAT_TXT.find(([, re]) => re.test(t)) || [null])[0];
  const sel = SELECAO.test(t);
  const cod = c.codigo || '';
  if (sec === 'games' && /ps5|play|game|jogo|gamer/i.test(cod) && cat !== 'Games' && !it?.cupomOutro?.test(t)) return {tipo: 'selecao', motivo: 'o código sugere games: confira se este item participa'};
  if (CODIGO_OUTRO.test(cod) && !(sec === 'computadores' && cat === 'Computadores')) return {tipo: 'outro', motivo: `o código (${cod}) indica outra marca ou produto`};
  if (sec === 'games') {
    if (cat === 'Games') return /acess[oó]rios?|gamer|perif[eé]ric/.test(t) && !it?.cupomOutro?.test(t)
      ? {tipo: 'selecao', motivo: 'seleção de games/acessórios: confira se este item participa'}
      : {tipo: 'outro', motivo: 'cupom de outro produto de games'};
    if (cat === 'Informática' && /tecnologia|eletr[oô]nicos?|inform[aá]tica/.test(t) && !especifico(bruto.replace(/tecnologia|eletr[oô]nicos?|inform[aá]tica/gi, ''))) return {tipo: 'selecao', motivo: 'seleção de tecnologia: confira se este item participa'};
  } else if (sec === 'computadores') {
    if (cat === 'Computadores') return sel ? {tipo: 'selecao', motivo: 'seleção de computadores: confira se este participa'} : {tipo: 'item'};
    if (cat === 'Informática' && /tecnologia|eletr[oô]nicos?|inform[aá]tica/.test(t)) return {tipo: 'selecao', motivo: 'seleção de tecnologia: confira se este item participa'};
  }
  if (cat) return {tipo: 'outro', motivo: `cupom de ${cat === 'Outros produtos' ? 'outro tipo de produto' : cat.toLowerCase()}`};
  const esp = especifico(bruto);
  if (esp) return {tipo: 'outro', motivo: `cupom de produto/marca específica ("${esp}")`};
  if (sel) return {tipo: 'selecao', motivo: 'só itens selecionados pela loja: confira se este participa'};
  return {tipo: 'geral'};
}

export const PESO_ESCOPO: Partial<Record<TipoEscopo, number>> = {item: 4, geral: 2, selecao: 1};
export const ROTULO_ESCOPO: Record<'item' | 'geral' | 'selecao', [string, string]> = {item: ['orig', 'do item'], geral: ['', 'geral da loja'], selecao: ['velho', 'itens selecionados']};

export function minimoCupom(c: Cupom): number | null {
  if (c.minimo) return c.minimo;
  const m = TEXTO_CUPOM(c).toLowerCase().match(/(?:acima\s+de|a\s+partir\s+de|superiores?\s+a|m[ií]nim[oa]\s+(?:de\s+)?(?:compra\s+)?(?:de\s+)?)\s*r\$\s*([\d.]+(?:,\d{1,2})?)/);
  return m ? numBR(m[1]) : null;
}

export type Desconto = {tipo: 'R$'; v: number} | {tipo: '%'; v: number; teto: number | null};
export function descontoCupom(c: Cupom): Desconto | null {
  const t = TEXTO_CUPOM(c).toLowerCase(), min = minimoCupom(c);
  const teto = t.match(/(?:desconto\s+m[aá]ximo\s+de|limitad[oa]\s+a|limite\s+de|abatimento\s+m[aá]ximo\s+de|m[aá]ximo\s+de)\s*r\$\s*([\d.]+(?:,\d{1,2})?)/);
  const fixo = t.match(/r\$\s*([\d.]+(?:,\d{1,2})?)\s*(?:off|de\s+desconto|de\s+economia|a\s+menos)/) || t.match(/(?:desconto\s+de|ganhe|ganhar|garanta|economize|economia\s+de|receba)\s*r\$\s*([\d.]+(?:,\d{1,2})?)/);
  if (fixo && numBR(fixo[1]) !== min) return {tipo: 'R$', v: numBR(fixo[1])};
  for (const m of t.matchAll(/(\d{1,2})\s*%\s*(?:off|de\s+desconto|a\s+menos)?/g)) {
    if (/at[eé]\s*$/.test(t.slice(Math.max(0, m.index! - 6), m.index))) continue;   // "até 40%": não dá para estimar
    return {tipo: '%', v: +m[1], teto: teto ? numBR(teto[1]) : null};
  }
  return null;
}

export interface Avaliacao { min: number | null; d?: Desconto | null; atinge: boolean | null; estimado: number | null; aviso: string }
export function avaliarCupom(c: Cupom, n: Produto): Avaliacao {
  const preco = n.precoNum, min = minimoCupom(c), d = descontoCupom(c);
  const r: Avaliacao = {min, d, atinge: min == null || !preco ? null : preco >= min, estimado: null, aviso: ''};
  if (!preco || !d || r.atinge === false) return r;
  if (d.tipo === 'R$' && min == null && d.v > preco * 0.3) { r.aviso = 'desconto alto e mínimo não informado: deve exigir compra maior'; return r; }
  const abat = d.tipo === 'R$' ? d.v : Math.min(preco * d.v / 100, d.teto ?? Infinity);
  r.estimado = Math.max(0, preco - abat);
  if (d.tipo === '%' && d.teto) r.aviso = `desconto limitado a ${reais(d.teto)}`;
  return r;
}

export interface CupomDoProduto { c: Cupom; e: Escopo; a: Avaliacao; geral: boolean }
/** Cupons ativos da loja do produto que valem para ele: do item → gerais → de seleção. */
export function cuponsDaLoja(cupons: Cupom[], n: Produto): CupomDoProduto[] {
  const loja = lojaCupomDe(n);
  const ordemAval = (a: Avaliacao) => a.atinge === false ? 2 : a.estimado != null ? 0 : 1;
  return cupons.filter(c => c.ativo !== false && lojaDoCupom(c) === loja)
    .map(c => ({c, e: escopoCupom(c, n)})).filter(x => PESO_ESCOPO[x.e.tipo])
    .map(x => {
      const min = minimoCupom(x.c);
      const a: Avaliacao = x.e.tipo === 'selecao' ? {min, atinge: min == null || !n.precoNum ? null : n.precoNum >= min, estimado: null, aviso: ''} : avaliarCupom(x.c, n);
      return {...x, a, geral: x.e.tipo !== 'item'};
    })
    .sort((x, y) => (PESO_ESCOPO[y.e.tipo]! - PESO_ESCOPO[x.e.tipo]!) || (ordemAval(x.a) - ordemAval(y.a)) || ((x.a.estimado ?? 1e12) - (y.a.estimado ?? 1e12)));
}
export function cuponsForaDaLoja(cupons: Cupom[], n: Produto): number {
  const loja = lojaCupomDe(n);
  return cupons.filter(c => c.ativo !== false && lojaDoCupom(c) === loja && !PESO_ESCOPO[escopoCupom(c, n).tipo]).length;
}
/** Melhor preço estimado com algum cupom da loja (para o card). */
export function melhorComCupom(cupons: Cupom[], n: Produto): CupomDoProduto | null {
  return cuponsDaLoja(cupons, n).filter(x => x.a.estimado != null && x.a.estimado < (n.precoNum as number)).sort((a, b) => a.a.estimado! - b.a.estimado!)[0] || null;
}

/** Coluna de cupons: os relevantes para o card selecionado, ordenados (item → categoria do card → loja toda). */
export function contextoCupons(secao: SecaoCfg, nome: string, produtosSelecionados: Produto[], cupomItem: RegExp | null | undefined): ContextoCupons {
  const lojas = new Set([...(secao.lojasCupom || []), ...produtosSelecionados.map(lojaCupomDe).filter(Boolean)]);
  return {nome, secao, lojas, pesos: secao.pesosCupom, cupom: cupomItem};
}

export interface FiltrosCupom { loja: string; cat: string; velhos: boolean; todos: boolean }
export function listaCupons(cupons: Cupom[], ctx: ContextoCupons, alvo: {secao: string; item: string}, f: FiltrosCupom) {
  const esc = new Map(cupons.map(c => [c, escopoCupom(c, alvo)]));
  const relevante = (c: Cupom) => f.todos || (ctx.lojas.has(lojaDoCupom(c)) && !!PESO_ESCOPO[esc.get(c)!.tipo]);
  const lojas = [...new Set(cupons.filter(relevante).map(lojaDoCupom))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const loja = lojas.includes(f.loja) ? f.loja : '';
  const ativos = cupons.filter(c => c.ativo !== false && relevante(c)).length;
  const peso = (c: Cupom) => (PESO_ESCOPO[esc.get(c)!.tipo] || 0) * 10 + pesoCupom(c, ctx);
  const visiveis = cupons
    .filter(c => relevante(c) && (!loja || lojaDoCupom(c) === loja) && (f.velhos || c.ativo !== false) && (!f.cat || catCupom(c) === f.cat))
    .sort((a, b) => peso(b) - peso(a));
  return {lojas, loja, ativos, visiveis, escopo: (c: Cupom) => esc.get(c)!};
}

/** Lojas do contexto sem cupom com código público agora (texto do topo da coluna). */
export function lojasSemCupom(cupons: Cupom[], ctx: ContextoCupons, produtosSelecionados: Produto[]) {
  const comCupom = new Set(cupons.filter(c => c.ativo !== false).map(lojaDoCupom));
  const lojasProd = [...new Set(produtosSelecionados.map(lojaCupomDe).filter(Boolean))];
  const semCupom = [...ctx.lojas].filter(l => !comCupom.has(l) && (lojasProd.includes(l) || ['Shopee', 'Temu', 'AliExpress'].includes(l)));
  return {lojasProd, semCupom};
}

export { SECOES };
