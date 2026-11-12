"""Coleta das seções que não são computadores (hoje: Games › Acessórios › Controles de PS5).

Cada loja tem uma função buscar(http, termo) que devolve anúncios "crus"
({id, loja, vendedor, nome, url, preco, precoDe, prazo, imagem, specs}) ou None se a loja recusou/não respondeu.
A classificação (é mesmo um controle de PS5? original ou compatível?) fica em categorias.py.

Regras (iguais às dos computadores):
- loja que não responde mantém os anúncios da coleta anterior, marcados "preço de coleta anterior";
- loja que responde substitui os seus anúncios (oferta de marketplace é passageira);
- nada é inventado: sem preço na loja, o anúncio não entra.
"""
import asyncio
import json
import logging
import re
import time
from urllib.parse import quote, unquote

from . import kabum as kabum_mod, zoom as zoom_mod
from .categorias import ITENS, classificar
from .util import aplicar_preco, imagem_ok, next_data, num

log = logging.getLogger('coleta')
LIMITE_LOJA = 120        # segundos por loja
MAX_POR_LOJA = 60        # anúncios por loja e por item (os mais baratos dos originais + os mais baratos dos compatíveis)


def _slug(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


# ---------------------------------------------------------------- KaBuM!
async def kabum(http, termo):
    html = await http.get(f'https://www.kabum.com.br/busca/{_slug(termo)}', tentativas=2)
    nd = next_data(html) if html else None
    if not nd:
        return None
    out = []
    for p in kabum_mod._produtos(nd):
        if p.get('available') is False:
            continue
        por, prazo, de = kabum_mod._precos(p)
        if not por:
            continue
        code = str(p['code'])
        sel = p.get('seller') if isinstance(p.get('seller'), dict) else {}
        img = ''
        for k in ('image', 'thumbnail', 'imageUrl', 'images', 'photos'):
            v = p.get(k)
            v = v[0] if isinstance(v, list) and v else v
            v = (v.get('url') or v.get('src') or v.get('g') or v.get('m')) if isinstance(v, dict) else v
            if imagem_ok(v):
                img = imagem_ok(v)
                break
        out.append({'id': 'kabum-' + code, 'loja': 'KaBuM!', 'vendedor': p.get('sellerName') or sel.get('name') or '',
                    'nome': (p.get('name') or '').strip(), 'url': f'https://www.kabum.com.br/produto/{code}',
                    'preco': por, 'precoDe': de, 'prazo': prazo, 'sufixo': ' à vista', 'imagem': img})
    return out


# ---------------------------------------------------------------- Zoom / Buscapé (mostram Amazon, Magalu, Fast Shop…)
async def zoom(http, termo):
    vistos, algum = {}, False
    for site in zoom_mod.SITES:
        html = await http.get(f'https://{site}/search?q={quote(termo)}')
        nd = next_data(html) if html else None
        if not nd:
            continue
        algum = True
        for h in zoom_mod._hits(nd):
            best = h.get('bestOffer') if isinstance(h.get('bestOffer'), dict) else {}
            oid = str(best.get('id') or re.sub(r'\D', '', str(h.get('objectId') or h.get('objectID') or '')))
            if not oid:
                continue
            loja_v = best.get('merchantName') or ''
            url = h.get('url') or h.get('link') or ''
            if url.startswith('/'):
                url = 'https://' + site + url
            vistos.setdefault(oid, {'id': 'zb-' + oid, 'loja': f'Zoom/Buscapé ({loja_v})' if loja_v else 'Zoom/Buscapé', 'vendedor': loja_v,
                                    'nome': (h.get('name') or h.get('title') or '').strip(), 'url': url or f'https://www.zoom.com.br/lead?oid={oid}',
                                    'preco': zoom_mod._preco(h), 'imagem': imagem_ok(h.get('image') or h.get('thumbnail')),
                                    'specs': {'Comparadores': 'Zoom e Buscapé (mesma oferta nos dois sites)'}})
    return list(vistos.values()) if algum else None


# ---------------------------------------------------------------- AliExpress (busca pública; dados em window._dida_config_._init_data_)
async def aliexpress(http, termo):
    html = await http.get(f'https://pt.aliexpress.com/w/wholesale-{_slug(termo)}.html', tentativas=2)
    if not html:
        return None
    i = html.find('"itemList"')
    j = html.find('"content":', i) if i >= 0 else -1
    if j < 0:
        log.info('AliExpress: página sem lista de produtos (%d bytes; provável verificação anti-robô)', len(html))
        return None
    try:
        lista, _ = json.JSONDecoder().raw_decode(html[j + 10:])
    except ValueError:
        return None
    out = []
    for a in lista:
        pid = str(a.get('productId') or '')
        pr = (a.get('prices') or {}).get('salePrice') or {}
        por = num(pr.get('minPrice'))
        nome = ((a.get('title') or {}).get('displayTitle') or '').strip()
        if not pid or not por or not nome:
            continue
        desc = pr.get('discount')
        de = round(por / (1 - desc / 100), 2) if isinstance(desc, (int, float)) and 0 < desc < 95 else None
        cdi = {}
        try:
            cdi = json.loads(unquote(((a.get('trace') or {}).get('pdpParams') or {}).get('pdp_cdi') or '{}'))
        except ValueError:
            pass
        envio = {'CN': 'China', 'BR': 'Brasil'}.get(cdi.get('shipFrom'), cdi.get('shipFrom') or '')
        specs = {'Preço': 'Preço com desconto mostrado na busca do AliExpress (pode depender de cupom/novo usuário; confira no carrinho)'}
        if envio:
            specs['Envio de'] = envio
        if (a.get('trade') or {}).get('tradeDesc'):
            specs['Vendidos'] = a['trade']['tradeDesc'].replace('  ', ' ')
        if (a.get('evaluation') or {}).get('starRating'):
            specs['Avaliação'] = f"{a['evaluation']['starRating']} de 5"
        out.append({'id': 'ali-' + pid, 'loja': 'AliExpress', 'vendedor': '', 'nome': nome, 'url': f'https://pt.aliexpress.com/item/{pid}.html',
                    'preco': por, 'precoDe': de, 'imagem': imagem_ok((a.get('image') or {}).get('imgUrl')), 'specs': specs})
    return out


# ---------------------------------------------------------------- Shopee (API pública de busca; costuma exigir verificação)
async def shopee(http, termo):
    url = (f'https://shopee.com.br/api/v4/search/search_items?by=relevancy&keyword={quote(termo)}&limit=60&newest=0&order=desc'
           f'&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2')
    d = await http.get(url, json=True, tentativas=1, headers={'Referer': f'https://shopee.com.br/search?keyword={quote(termo)}',
                                                              'X-Requested-With': 'XMLHttpRequest', 'X-API-SOURCE': 'pc'})
    itens = (d or {}).get('items') if isinstance(d, dict) else None
    if not itens:
        return None
    out = []
    for it in itens:
        b = it.get('item_basic') or it
        por = (b.get('price_min') or b.get('price') or 0) / 100000
        de = (b.get('price_before_discount') or 0) / 100000
        if not por or not b.get('itemid'):
            continue
        out.append({'id': f"shopee-{b.get('shopid')}-{b['itemid']}", 'loja': 'Shopee', 'vendedor': '', 'nome': b.get('name', ''),
                    'url': f"https://shopee.com.br/product/{b.get('shopid')}/{b['itemid']}", 'preco': por, 'precoDe': de or None,
                    'imagem': f"https://down-br.img.susercontent.com/file/{b['image']}" if b.get('image') else ''})
    return out


# ---------------------------------------------------------------- Temu (página de busca; costuma responder só com desafio em JavaScript)
async def temu(http, termo):
    html = await http.get(f'https://www.temu.com/br/search_result.html?search_key={quote(termo)}', tentativas=1)
    if not html:
        return None
    m = re.search(r'window\.rawData\s*=\s*(\{.*?\});\s*</script>', html, re.S)
    if not m:
        return None  # desafio anti-robô (página só com script)
    try:
        raw = json.loads(m.group(1))
    except ValueError:
        return None
    from .util import percorrer
    out = []
    for d in percorrer(raw):
        gid = d.get('goodsId') or d.get('goods_id')
        nome = d.get('title') or d.get('goodsName')
        pi = d.get('priceInfo') if isinstance(d.get('priceInfo'), dict) else {}
        por = num(pi.get('price') or d.get('price'))
        if gid and nome and por:
            por = por / 100 if por > 5000 else por
            out.append({'id': f'temu-{gid}', 'loja': 'Temu', 'vendedor': '', 'nome': nome, 'url': f'https://www.temu.com/br/g-{gid}.html',
                        'preco': por, 'imagem': imagem_ok(d.get('thumbUrl') or d.get('imageUrl'))})
    return out or None


# ---------------------------------------------------------------- Mercado Livre (lista pública; costuma pedir verificação)
async def mercadolivre(http, termo):
    html = await http.get(f'https://lista.mercadolivre.com.br/{_slug(termo)}', tentativas=1)
    if not html or 'suspicious-traffic' in html[:3000] or 'bot-interceptor' in html:
        return None
    out = []
    for m in re.finditer(r'"polycard":\{"unique_id":"[^"]*","metadata":\{"id":"(MLB\d+)".*?"url":"([^"]+)".*?"text":"([^"]{10,200})".*?"current_price":\{"value":([\d.]+)', html, re.S):
        mid, url, nome, por = m.groups()
        out.append({'id': 'ml-' + mid, 'loja': 'Mercado Livre', 'vendedor': '', 'nome': nome, 'url': 'https://' + url.lstrip('/') if not url.startswith('http') else url,
                    'preco': float(por)})
    return out or None


# ---------------------------------------------------------------- lojas VTEX que vendem games (API pública de catálogo)
VTEX = {'iByte': 'www.ibyte.com.br', 'Webcontinental': 'www.webcontinental.com.br', 'Lojas MM': 'www.lojasmm.com'}


async def vtex(http, termo):
    out, algum = [], False
    for loja, host in VTEX.items():
        lista = await http.get(f'https://{host}/api/catalog_system/pub/products/search?ft={quote(termo)}&_from=0&_to=49', json=True, tentativas=1)
        if not isinstance(lista, list):
            continue
        algum = True
        for p in lista:
            item = (p.get('items') or [{}])[0]
            vend = sorted(item.get('sellers') or [], key=lambda s: not s.get('sellerDefault'))
            o = next((s.get('commertialOffer') for s in vend if (s.get('commertialOffer') or {}).get('AvailableQuantity', 0) > 0), None)
            if not o or not num(o.get('Price')):
                continue
            link = p.get('link') or ''
            if link.startswith('/'):
                link = 'https://' + host + link
            out.append({'id': f"vtex-{_slug(loja).replace('-', '')}-{p.get('productId')}", 'loja': loja, 'vendedor': '',
                        'nome': (p.get('productName') or '').strip(), 'url': link, 'preco': num(o.get('Price')), 'precoDe': num(o.get('ListPrice')),
                        'imagem': imagem_ok(((item.get('images') or [{}])[0]).get('imageUrl'))})
    return out if algum else None


LOJAS = [  # (nome mostrado no andamento, função, prefixo do id do anúncio)
    ('KaBuM!', kabum, 'kabum-'),
    ('Zoom/Buscapé', zoom, 'zb-'),
    ('AliExpress', aliexpress, 'ali-'),
    ('Shopee', shopee, 'shopee-'),
    ('Temu', temu, 'temu-'),
    ('Mercado Livre', mercadolivre, 'ml-'),
    ('iByte/Webcontinental/MM', vtex, 'vtex-'),
]


def _montar(raw, item, cfg, hoje_txt):
    """Anúncio cru → produto da página (ou None se não for do item)."""
    info = classificar(item, raw['nome'], raw.get('preco'))
    if info is None:
        return None
    n = {'id': f"g-{item}-{raw['id']}", 'secao': cfg['secao'], 'sub': cfg['sub'], 'item': item, 'tipo': cfg['nome'],
         'loja': raw['loja'], 'vendedor': raw.get('vendedor') or '', 'nome': raw['nome'], 'url': raw['url'], 'imagem': raw.get('imagem') or '',
         'modelo': info['modelo'], 'marca': info['marca'], 'original': info['original'], 'kit': info['kit'], 'edicao': info['edicao']}
    aplicar_preco(n, raw['preco'], raw.get('precoDe'), raw.get('prazo'), sufixo=raw.get('sufixo', ''))
    specs = {'Anúncio (título)': raw['nome'], 'Loja': raw['loja']}
    if raw.get('vendedor'):
        specs['Vendedor'] = raw['vendedor']
    specs['Modelo identificado'] = info['modelo'] + (' · ' + info['edicao'] if info['edicao'] else '')
    specs['Marca'] = info['marca']
    if info['kit']:
        specs['Kit'] = 'Anúncio com outro item junto (jogo, base, cabo…)'
    specs.update(raw.get('specs') or {})
    specs['Coletado em'] = hoje_txt
    n['specs'] = specs
    return n


def _cortar(lista):
    """Limita por loja: guarda os mais baratos de cada modelo (para não lotar a página com anúncios genéricos)."""
    if len(lista) <= MAX_POR_LOJA:
        return lista
    orig = sorted([n for n in lista if n['original']], key=lambda n: n['precoNum'])
    comp = sorted([n for n in lista if not n['original']], key=lambda n: n['precoNum'])
    k = max(MAX_POR_LOJA - len(orig), MAX_POR_LOJA // 3)
    return (orig[:MAX_POR_LOJA - min(k, len(comp))] + comp[:k])[:MAX_POR_LOJA]


async def coletar(http, anteriores, status, hoje_txt, data_ant):
    """anteriores: produtos não-computador da coleta anterior. Retorna (produtos, resumo por loja)."""
    resumo = {}
    final = []

    async def uma(nome, fn, prefixo):
        st = status.setdefault('fontes', {})
        st[f'Games: {nome}'] = {'estado': 'buscando'}
        t0 = time.time()
        achados, respondeu = {}, False
        try:
            for item, cfg in ITENS.items():
                for termo in cfg['termos']:
                    r = await asyncio.wait_for(fn(http, termo), LIMITE_LOJA)
                    if r is None:
                        if fn in (shopee, temu, mercadolivre):
                            break  # recusou a primeira busca: não insiste (evita bloqueio maior)
                        continue
                    respondeu = True
                    for raw in r:
                        n = _montar(raw, item, cfg, hoje_txt)
                        if n and (n['id'] not in achados or n['precoNum'] < achados[n['id']]['precoNum']):
                            achados[n['id']] = n
        except asyncio.TimeoutError:
            log.warning('games %s: demorou demais', nome)
        except Exception:
            log.exception('games %s', nome)
        lista = _cortar(list(achados.values())) if respondeu else None
        msg = (f'{len(lista)} anúncios' if lista else 'respondeu, mas sem anúncios do item') if respondeu else 'loja recusou a busca (proteção anti-robô) ou não respondeu'
        st[f'Games: {nome}'] = {'estado': 'ok' if respondeu else 'falhou', 'msg': msg, 'itens': len(lista or []), 'segundos': round(time.time() - t0)}
        log.info('games %-24s %s (%s) em %ds', nome, 'ok' if respondeu else 'falhou', msg, time.time() - t0)
        return nome, prefixo, lista

    res = await asyncio.gather(*(uma(*l) for l in LOJAS))
    for nome, prefixo, lista in res:
        dela = [a for a in anteriores if a['id'].startswith(f"g-{a.get('item', '')}-{prefixo}")]
        if lista is None:
            for a in dela:  # loja não respondeu: fica a coleta anterior, marcada
                a = dict(a)
                a['precoAntigo'] = True
                a['specs'] = dict(a.get('specs') or {}, **{'Fonte do preço': f'Preço da coleta de {data_ant}: {nome} não respondeu nesta atualização.'})
                final.append(a)
            resumo[nome] = {'estado': 'falhou', 'itens': 0, 'mantidos': len(dela)}
        else:
            final.extend(lista)
            resumo[nome] = {'estado': 'ok', 'itens': len(lista)}
    # o mesmo anúncio pode vir de duas buscas: fica um só
    unicos = {}
    for n in final:
        unicos.setdefault(n['id'], n)
    return list(unicos.values()), resumo
