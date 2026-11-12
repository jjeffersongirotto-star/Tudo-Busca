"""Cupons de desconto de todas as lojas, lidos do Méliuz (o código aparece completo na página).

Cuponomia e CupoNation foram testados (08/11/2026) e ficaram de fora: só mostram o código depois de um clique
que leva para a loja, e a regra do projeto é só aceitar código que aparece completo na fonte.

Só entra cupom cujo código aparece COMPLETO na página (nada de código cortado ou "clique para ver").
Fonte que falha não apaga nada: os cupons já conhecidos continuam, e os que somem da fonte
passam a "não apareceu na última coleta".
"""
import asyncio
import html as H
import json
import logging
import os
import re

from .util import next_data, percorrer

log = logging.getLogger('coleta')
DIAG = os.environ.get('DIAG_CUPONS') == '1'

# loja (como aparece na página) → slug usado pelos sites de cupons
LOJAS = {
    'KaBuM!': 'kabum', 'Amazon': 'amazon', 'Dell.com': 'dell', 'Magazine Luiza': 'magazine-luiza', 'Casas Bahia': 'casas-bahia',
    'Mercado Livre': 'mercado-livre', 'Fast Shop': 'fast-shop', 'Lenovo': 'lenovo', 'Samsung': 'samsung', 'Acer': 'acer',
    'Asus': 'asus', 'Positivo': 'positivo', 'Pichau': 'pichau', 'Terabyte': 'terabyte', 'iByte': 'ibyte', 'Carrefour': 'carrefour',
    'Ponto': 'ponto', 'Extra': 'extra', 'Americanas': 'americanas', 'Avell': 'avell', 'Webcontinental': 'webcontinental',
    'HP': 'hp', 'Shopee': 'shopee', 'AliExpress': 'aliexpress', 'Multilaser': 'multilaser', 'Vaio': 'vaio', 'Microsoft': 'microsoft',
    'Motorola': 'motorola', 'Submarino': 'submarino', 'Shoptime': 'shoptime', 'Kalunga': 'kalunga', 'Leroy Merlin': 'leroy-merlin',
    'Temu': 'temu',
}
# como cada loja aparece escrita nos títulos dos cupons (para não atribuir cupom de uma loja à outra)
APELIDOS = {'KaBuM!': ['kabum'], 'Amazon': ['amazon'], 'Dell.com': ['dell', 'alienware'], 'Magazine Luiza': ['magalu', 'magazine luiza'],
            'Casas Bahia': ['casas bahia'], 'Mercado Livre': ['mercado livre', 'meli'], 'Fast Shop': ['fast shop', 'fastshop'],
            'Lenovo': ['lenovo'], 'Samsung': ['samsung', 'galaxy'], 'Acer': ['acer', 'predator', 'nitro'], 'Asus': ['asus', 'rog', 'zenbook'],
            'Pichau': ['pichau'], 'Carrefour': ['carrefour'], 'Ponto': ['ponto'], 'Extra': ['extra'], 'Americanas': ['americanas'],
            'Avell': ['avell'], 'Webcontinental': ['webcontinental'], 'HP': ['hp'], 'Shopee': ['shopee'], 'AliExpress': ['aliexpress'],
            'Multilaser': ['multilaser'], 'Vaio': ['vaio'], 'Motorola': ['motorola', 'moto g'], 'Leroy Merlin': ['leroy'], 'Temu': ['temu']}


# Categorias do cupom (a página mostra os cupons conforme o card escolhido: Computadores, Games…).
# A mesma lógica está em catCupom() no cupons-dell.html.
_CAT_GAMES = re.compile(r'\bps\s?[2345]\b|playstation|dual\s?sense|xbox|nintendo|\bswitch\b|\bconsoles?\b|video\s?games?|\bgames?\b|'
                        r'\bjogos?\s+(?:de\s+)?(?:ps|xbox|switch|pc|videogame)|gamepad|joystick|controles?\s+(?:sem\s+fio|ps|xbox|gamer|dualsense)|\bgta\b')
_CAT_PCS = re.compile(r'notebook|laptop|computador|\bpcs?\b|desktop|macbook|all.in.one|chromebook|ultrabook|alienware|predator|nitro|ideapad|vivobook')
_CAT_INFO = re.compile(r'monitor|placa|mem[oó]ria|\bssd\b|\bhd\b|impressora|multifuncional|mouse|teclado|headset|fone|webcam|roteador|'
                       r'perif[eé]ric|gamer|processador|tablet|inform[aá]tica|tecnologia|eletr[oô]nico|tv\b|smartphone|celular|scanner|microfone')
_CAT_OUTRO = re.compile(r'pneu|m[oó]ve(?:l|is)|ar.condicionado|aspirador|geladeira|refrigerador|fog[aã]o|lavadora|lava.lou[cç]as|micro.?ondas|'
                        r'air.?fryer|cafeteira|ventilador|colch[aã]o|sof[aá]|\bcama\b|panela|eletrodom|moda|roupa|vestu[aá]rio|cal[cç]ado|t[eê]nis|'
                        r'sapato|beleza|cosm[eé]tic|perfum|maquiagem|skincare|supermercado|mercado\b|bebida|vinho|cerveja|brinquedo|livro|\bpet\b|'
                        r'ra[cç][aã]o|ferrament|jardim|piscina|farm[aá]cia|suplement|bolsa|rel[oó]gio|decora[cç]|cozinha|banheiro|beb[eê]|infantil|'
                        r'viagem|hotel|passage|automotiv|\bcarro|im[oó]ve|seguro|curso|smart\s?tv|epson|brother|aspira')
_CAT_LOJA = re.compile(r'loja toda|site todo|todo o site|toda a loja|primeira compra|primeiro pedido|qualquer|todo o app|em tudo|sem m[ií]nimo|'
                       r'todos os produtos|novos? usu[aá]rios?|novos? clientes?')
_CAT_SELECAO = re.compile(r'selecionad|participantes|sele[cç][aã]o|categorias?\s+selec')


def categoria_cupom(t):
    """Games · Computadores · Informática · Loja toda · Produtos selecionados · Geral (não cita produto) · Outros produtos."""
    t = (t or '').lower()
    if _CAT_GAMES.search(t):
        return 'Games'
    if _CAT_PCS.search(t):
        return 'Computadores'
    if _CAT_INFO.search(t):
        return 'Informática'
    if _CAT_OUTRO.search(t):
        return 'Outros produtos'
    if _CAT_LOJA.search(t):
        return 'Loja toda'
    if _CAT_SELECAO.search(t):
        return 'Produtos selecionados'
    return 'Geral'


def _outra_loja(loja, titulo):
    """True se o título cita outra loja e não cita esta (cupom de outra loja exibido na página)."""
    t = ' ' + re.sub(r'[^a-z0-9 ]', ' ', (titulo or '').lower()) + ' '
    proprio = any(f' {a} ' in t for a in APELIDOS.get(loja, []))
    outra = any(f' {a} ' in t for l, al in APELIDOS.items() if l != loja for a in al if len(a) > 3)
    return outra and not proprio


SITES = {
    'Méliuz': 'https://www.meliuz.com.br/desconto/cupom-{s}',
}
_CODIGO = re.compile(r'^[A-Z0-9][A-Z0-9_\-]{3,24}$')
_NAO = re.compile(r'^(NULL|NONE|TRUE|FALSE|UNDEFINED|CUPOM|CODIGO|COPIAR|ATIVAR|OFERTA|DESCONTO|PROMO|VER|HTTPS?|WWW|NAN|\d+)$')
_CHAVES_COD = ('code', 'couponCode', 'coupon_code', 'voucherCode', 'promoCode', 'codigo', 'cupom')
_CHAVES_TIT = ('title', 'titulo', 'name', 'headline', 'description', 'descricao', 'text')


def _cod_ok(c):
    c = (c or '').strip().upper()
    return c if _CODIGO.match(c) and not _NAO.match(c) and '*' not in c and re.search(r'[A-Z]', c) else ''


def _texto(t):
    return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', ' ', t or ''))).strip()


def _desconto(t):
    m = re.search(r'(at[ée]\s*)?(\d{1,2})\s*%\s*(off|de desconto)?', t, re.I) or re.search(r'R\$\s*\d[\d\.]*(,\d{2})?\s*(off|de desconto)?', t, re.I)
    return m.group(0).strip() if m else ''


def _validade(t):
    m = re.search(r'(v[aá]lid[oa]|expira|termina|at[ée])\s*(em|at[ée])?\s*:?\s*(\d{2}/\d{2}(/\d{2,4})?)', t, re.I)
    return ('Até ' + m.group(3)) if m else ''


def _do_json(nd):
    """Cupons em JSON embutido (Next.js e similares): dicts com um campo de código e um título."""
    out = []
    for d in percorrer(nd):
        cod = ''
        for k in _CHAVES_COD:
            v = d.get(k)
            if isinstance(v, str) and _cod_ok(v):
                cod = _cod_ok(v)
                break
        if not cod:
            continue
        tit = next((str(d[k]) for k in _CHAVES_TIT if isinstance(d.get(k), str) and len(d[k]) > 5), '')
        val = next((str(d[k]) for k in ('expirationDate', 'expiresAt', 'endDate', 'validUntil', 'validade', 'expiration') if d.get(k)), '')
        out.append({'codigo': cod, 'descricao': _texto(tit)[:200], 'validadeBruta': val})
    return out


def _do_html(html):
    """Códigos em atributos do HTML (data-code, data-clipboard-text…) com o texto ao redor."""
    out = []
    for m in re.finditer(r'data-(?:code|coupon|coupon-code|voucher|clipboard-text|cupom|codigo)\s*=\s*["\']([^"\']{4,30})["\']', html, re.I):
        cod = _cod_ok(m.group(1))
        if not cod:
            continue
        janela = _texto(html[max(0, m.start() - 1500):m.end() + 600])
        out.append({'codigo': cod, 'descricao': janela[-400:][:200], 'janela': janela})
    return out


def _do_meliuz(html):
    """Méliuz: cada cupom é um <div ... data-offer-code="CODIGO" data-offer-title="...">; o bloco seguinte traz as regras."""
    out = []
    partes = re.split(r'(?=<div class="cpn-layout )', html)
    for bloco in partes[1:]:
        m = re.search(r'data-offer-code="([^"]*)"', bloco[:1500])
        cod = _cod_ok(H.unescape(m.group(1))) if m else ''
        if not cod:
            continue  # oferta sem código
        tit = re.search(r'data-offer-title="([^"]*)"', bloco[:1500])
        texto = _texto(bloco[:6000])
        out.append({'codigo': cod, 'descricao': H.unescape(tit.group(1)).strip() if tit else '', 'janela': texto})
    return out


def _validade_iso(v):
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', v or '')
    return f'Até {m.group(3)}/{m.group(2)}/{m.group(1)}' if m else ''


async def _pagina(http, site, url, loja):
    html = await http.get(url, tentativas=1)
    if not html:
        return site, loja, None
    achados = []
    nd = next_data(html)
    if nd:
        achados += _do_json(nd)
    for m in re.finditer(r'<script[^>]*type="application/(?:ld\+)?json"[^>]*>(.*?)</script>', html, re.S):
        try:
            achados += _do_json(json.loads(m.group(1)))
        except ValueError:
            pass
    achados += _do_html(html)
    if site == 'Méliuz':
        achados += _do_meliuz(html)
    if DIAG:
        amostra = re.search(r'data-(code|coupon|clipboard-text|voucher)[^>]{0,200}', html, re.I)
        log.info('CUPOM-DIAG %s %s: %d bytes, next_data=%s, %d achados, ex=%s | attr=%r', site, loja, len(html), bool(nd), len(achados),
                 [a['codigo'] for a in achados[:5]], amostra.group(0)[:160] if amostra else None)
    cupons = {}
    for a in achados:
        c = cupons.setdefault(a['codigo'], {'codigo': a['codigo'], 'descricao': '', 'validade': ''})
        texto = a.get('descricao') or ''
        if texto and (not c['descricao'] or a.get('janela') and len(texto) < len(c['descricao'])):
            c['descricao'] = texto[:200]
        c['validade'] = c['validade'] or _validade_iso(a.get('validadeBruta')) or _validade(a.get('janela') or texto)
        c['desconto'] = c.get('desconto') or _desconto(texto) or _desconto(a.get('janela') or '')
    return site, loja, list(cupons.values())


async def coletar(http):
    """Retorna (lista de cupons encontrados agora, resumo por site) ou (None, msg) se nenhum site respondeu."""
    tarefas = [_pagina(http, site, mod.format(s=slug), loja) for site, mod in SITES.items() for loja, slug in LOJAS.items()]
    res = await asyncio.gather(*tarefas)
    por_site, achados = {}, {}
    for site, loja, cups in res:
        st = por_site.setdefault(site, {'paginas': 0, 'cupons': 0})
        if cups is None:
            continue
        st['paginas'] += 1
        for c in cups:
            if _outra_loja(loja, c.get('descricao')):
                continue
            st['cupons'] += 1
            chave = (loja, c['codigo'])
            if chave not in achados:
                achados[chave] = dict(c, loja=loja, fontes=[])
            achados[chave]['fontes'].append({'nome': site, 'url': SITES[site].format(s=LOJAS[loja])})
            for k in ('descricao', 'validade', 'desconto'):
                if not achados[chave].get(k) and c.get(k):
                    achados[chave][k] = c[k]
    log.info('Cupons por site: %s', por_site)
    if not any(v['paginas'] for v in por_site.values()):
        return None, 'nenhum site de cupons respondeu'
    return list(achados.values()), por_site


def juntar(antigos, novos, hoje_txt):
    """Junta os cupons coletados agora com os que já existiam (sem apagar nada)."""
    por_chave = {}
    for c in antigos:
        por_chave[(c.get('loja') or 'Dell.com', c.get('codigo'))] = dict(c)
    vistos = set()
    for n in novos:
        chave = (n['loja'], n['codigo'])
        vistos.add(chave)
        nomes = ', '.join(f['nome'] for f in n['fontes'])
        c = por_chave.get(chave)
        if c is None:
            c = {'id': n['codigo'] if n['loja'] == 'Dell.com' else f"{re.sub(r'[^a-z0-9]', '', n['loja'].lower())}-{n['codigo']}",
                 'codigo': n['codigo'], 'loja': n['loja'], 'categoria': categoria_cupom(n.get('descricao')),
                 'condicoes': 'Confira as regras no site da loja',
                 'descricao': n.get('descricao') or f"Cupom {n['loja']}", 'desconto': n.get('desconto') or '',
                 'validade': n.get('validade') or 'não informada'}
            por_chave[chave] = c
        else:
            for k in ('descricao', 'desconto', 'validade'):
                if n.get(k) and (not c.get(k) or c.get(k) in ('não informada', 'não informado')):
                    c[k] = n[k]
            c['categoria'] = categoria_cupom(c.get('descricao'))  # categorias foram refinadas (Games, Geral…)
        c['fonte'] = n['fontes'][0]['nome']
        c['fonteUrl'] = n['fontes'][0]['url']
        c['fontesExtras'] = [{'nome': f['nome'], 'url': f['url']} for f in n['fontes'][1:]]
        c['status'] = f'Listado como ativo em {nomes} ({hoje_txt})'
        c['ativo'] = True
        c['coletado'] = hoje_txt
    for chave, c in por_chave.items():
        if chave not in vistos and c.get('coletado'):  # cupom de coleta automática que sumiu das fontes
            c['ativo'] = False
            c['status'] = f'Não apareceu na última coleta ({hoje_txt}); provavelmente expirou'
    return list(por_chave.values())
