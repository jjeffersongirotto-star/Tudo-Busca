"""KaBuM!: busca (__NEXT_DATA__) + página de cada produto (preço de campanha)."""
import asyncio
import logging
import re

from .util import aplicar_preco, next_data, num, percorrer

log = logging.getLogger('coleta')

BUSCAS = ['notebook-dell', 'notebook-alienware', 'notebook-gamer-dell']
RUIM = re.compile(r'usad|recondicion|seminov|vitrine|open\s*box|outlet', re.I)


def _produtos(dados):
    """Dicts de produto: têm 'code' e 'priceWithDiscount'."""
    vistos = {}
    for d in percorrer(dados):
        if 'code' in d and 'priceWithDiscount' in d and d.get('name'):
            vistos.setdefault(str(d['code']), d)
    return list(vistos.values())


def _precos(p):
    """(à vista/PIX, a prazo, 'De'); usa a oferta relâmpago/campanha quando existir."""
    of = p.get('offer') if isinstance(p.get('offer'), dict) else None
    por = num((of or {}).get('priceWithDiscount')) or num(p.get('priceWithDiscount'))
    prazo = num((of or {}).get('price')) or num(p.get('price'))
    de = num(p.get('oldPrice'))
    return por, prazo, de


def _converter(p):
    nome = (p.get('name') or '').strip()
    if not re.match(r'\s*notebook', nome, re.I) or not re.search(r'dell|alienware', nome, re.I) or RUIM.search(nome):
        return None
    code = str(p['code'])
    if p.get('available') is False:
        return {'id': 'kabum-' + code, 'removido': True}
    por, prazo, de = _precos(p)
    if not por:
        return None
    sel = p.get('seller') if isinstance(p.get('seller'), dict) else {}
    vend = p.get('sellerName') or sel.get('name') or ''
    n = {'id': 'kabum-' + code, 'loja': 'KaBuM!', 'nome': nome, 'url': f'https://www.kabum.com.br/produto/{code}',
         'vendedor': vend, 'modelo': '', 'specs': {'Anúncio (título)': nome, **({'Vendedor': vend} if vend else {})}}
    aplicar_preco(n, por, de, prazo, sufixo=' à vista')
    return n


async def coletar(http, anteriores):
    achados, falhas = {}, 0
    for b in BUSCAS:
        html = await http.get(f'https://www.kabum.com.br/busca/{b}?page_number=1&page_size=100&facet_filters=&sort=most_searched')
        nd = next_data(html) if html else None
        if not nd:
            falhas += 1
            if html:
                log.warning('KaBuM %s: página sem __NEXT_DATA__ (%d bytes): %r', b, len(html), html[:200])
            continue
        prods = _produtos(nd)
        log.info('KaBuM busca %s: %d produtos no JSON', b, len(prods))
        for p in prods:
            n = _converter(p)
            if n and not n.get('removido'):
                achados[n['id']] = n
    busca_ok = falhas < len(BUSCAS)  # se a busca for bloqueada, ainda conferimos os produtos já conhecidos
    # Preço da página do produto (campanha) para tudo que vamos mostrar
    ids = set(achados) | {a['id'] for a in anteriores if a.get('loja') == 'KaBuM!'}
    out = []

    async def um(i):
        code = i.split('-', 1)[1]
        html = await http.get(f'https://www.kabum.com.br/produto/{code}')
        nd = next_data(html) if html else None
        prods = [p for p in _produtos(nd) if str(p.get('code')) == code] if nd else []
        if prods:
            n = _converter(prods[0])
            if n:
                return n
        if html and re.search(r'produto\s+indispon[ií]vel|esgotado', html, re.I) and not prods:
            return {'id': i, 'removido': True}
        return achados.get(i)  # sem página: fica o preço da busca (ou o anterior)

    res = await asyncio.gather(*(um(i) for i in ids))
    out = [r for r in res if r]
    if not out:
        return None, 'loja recusou os pedidos (busca e páginas de produto)'
    if not busca_ok:
        return out, f'busca recusada; {len(out)} produtos conferidos pela página'
    return out, f'{len(achados)} na busca' + (f', {falhas} busca(s) falharam' if falhas else '')
