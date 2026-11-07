"""Zoom / Buscapé (mesmo backend): __NEXT_DATA__ da busca; aceita só se vierem ≥5 resultados."""
import html
import logging
import re
from urllib.parse import quote

from .util import aplicar_preco, imagem_ok, next_data, num, percorrer

log = logging.getLogger('coleta')

TERMOS = ['notebook dell', 'notebook dell inspiron', 'notebook dell latitude', 'notebook dell vostro', 'notebook dell xps',
          'notebook alienware', 'notebook dell g15', 'notebook dell pro', 'notebook dell 15', 'notebook dell 14']
SITES = ['www.zoom.com.br', 'www.buscape.com.br']
RUIM = re.compile(r'usad|recondicion|seminov|vitrine|open\s*box', re.I)
_amostra = [False]


def _preco(h):
    for k in ('price', 'minPrice', 'bestPrice', 'lowestPrice', 'priceMin'):
        v = h.get(k)
        if isinstance(v, dict):
            v = v.get('value') or v.get('amount') or v.get('min')
        f = num(v)
        if f:
            return f
    return None


def _hits(nd):
    out = []
    for d in percorrer(nd):
        if ('objectId' in d or 'objectID' in d) and (d.get('name') or d.get('title')) and _preco(d):
            out.append(d)
    return out


def _converter(h, site):
    nome = html.unescape(h.get('name') or h.get('title') or '').strip()
    if not re.match(r'\s*(dell\s+)?(notebook|laptop)', nome, re.I) or not re.search(r'dell|alienware', nome, re.I) or RUIM.search(nome):
        return None
    # id estável = id da oferta (produto agrupado usa a melhor oferta), igual às coletas anteriores
    best = h.get('bestOffer') if isinstance(h.get('bestOffer'), dict) else {}
    oid = str(best.get('id') or re.sub(r'\D', '', str(h.get('objectId') or h.get('objectID') or '')))
    if not oid:
        return None
    loja_v = best.get('merchantName') or ''
    if not loja_v:
        for k in ('merchantName', 'storeName', 'merchants', 'merchant', 'store'):
            v = h.get(k)
            v = v[0] if isinstance(v, list) and v else v
            v = v.get('name') if isinstance(v, dict) else v
            if isinstance(v, str) and v:
                loja_v = v
                break
    url = h.get('url') or h.get('link') or h.get('productUrl') or ''
    if url.startswith('/'):
        url = 'https://' + site + url
    if not url:
        url = f'https://www.zoom.com.br/lead?oid={oid}'
    n = {'id': f'zb-{oid}', 'loja': f'Zoom/Buscapé ({loja_v})' if loja_v else 'Zoom/Buscapé', 'vendedor': loja_v, 'nome': nome,
         'modelo': '', 'url': url, 'specs': {'Anúncio (título)': nome, **({'Loja vendedora': loja_v} if loja_v else {}),
                                            'Comparadores': 'Zoom e Buscapé (mesma oferta nos dois sites)'}}
    aplicar_preco(n, _preco(h))  # comparador não mostra preço "De"
    n['imagem'] = imagem_ok(h.get('image') or h.get('thumbnail'))
    return n


async def coletar(http, anteriores):
    achados = {}
    for site in SITES:
        for t in TERMOS:
            html = await http.get(f'https://{site}/search?q={quote(t)}')
            nd = next_data(html) if html else None
            if not nd:
                continue
            hits = _hits(nd)
            if hits and not _amostra[0]:
                _amostra[0] = True
                log.info('Zoom: formato da busca reconhecido (%d resultados na primeira página)', len(hits))
            for h in hits:
                n = _converter(h, site)
                if n and (n['id'] not in achados or len(n['nome']) > len(achados[n['id']]['nome'])):
                    achados[n['id']] = n  # mesma oferta como produto e como oferta: fica o nome mais completo
    log.info('Zoom/Buscapé: %d ofertas Dell', len(achados))
    if len(achados) < 5:
        return None, f'só {len(achados)} resultados (mínimo 5)'
    # ofertas antigas que sumiram da busca saem da lista (oferta de comparador é passageira)
    removidos = [{'id': a['id'], 'removido': True} for a in anteriores if a['id'].startswith('zb-') and a['id'] not in achados]
    return list(achados.values()) + removidos, ''
