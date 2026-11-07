"""iByte, WAZ e Webcontinental: API pública de catálogo VTEX."""
import logging
import re
from urllib.parse import quote

from .util import aplicar_preco, num

log = logging.getLogger('coleta')

LOJAS = {'iByte': 'www.ibyte.com.br', 'WAZ': 'www.waz.com.br', 'Webcontinental': 'www.webcontinental.com.br'}
TERMOS = ['notebook dell', 'notebook alienware']
RUIM = re.compile(r'usad|recondicion|seminov|vitrine|open\s*box|mochila|capa|carregador|fonte|bateria|teclado|mouse|suporte|pel[ií]cula', re.I)


def _oferta(item):
    vend = item.get('sellers') or []
    vend = sorted(vend, key=lambda s: (not s.get('sellerDefault'), -(s.get('commertialOffer') or {}).get('AvailableQuantity', 0)))
    for s in vend:
        o = s.get('commertialOffer') or {}
        if o.get('AvailableQuantity', 0) > 0 and num(o.get('Price')):
            return s, o
    return None, None


def _converter(p, loja, host):
    nome = (p.get('productName') or '').strip()
    marca = p.get('brand') or ''
    if not re.search(r'notebook|laptop', nome, re.I) or not re.search(r'dell|alienware', nome + ' ' + marca, re.I) or RUIM.search(nome):
        return None
    item = (p.get('items') or [{}])[0]
    s, o = _oferta(item)
    if not o:
        return 'indisponivel'
    specs = {'Anúncio (título)': nome, 'Loja': loja, 'Vendedor (seller VTEX)': s.get('sellerName', ''),
             'Referência': p.get('productReference', ''), 'Marca': marca}
    for k in p.get('allSpecifications') or []:
        v = p.get(k)
        if isinstance(v, list) and v and len(k) < 60:
            specs[k] = ', '.join(str(x) for x in v)[:300]
    link = p.get('link') or ''
    if link.startswith('/'):
        link = 'https://' + host + link
    n = {'id': f"vtex-{loja.lower()}-{p.get('productId')}", 'loja': loja, 'vendedor': s.get('sellerName', ''), 'nome': nome,
         'modelo': p.get('productReference', ''), 'url': link, 'specs': specs}
    aplicar_preco(n, num(o.get('Price')), num(o.get('ListPrice')))
    return n


async def coletar(http, anteriores):
    """Busca por termo em cada loja; itens antigos que não voltaram são consultados pelo productId."""
    itens, problemas, ok_lojas = {}, [], 0
    for loja, host in LOJAS.items():
        achou, falhou = 0, False
        for termo in TERMOS:
            for ini in range(0, 200, 50):
                url = f'https://{host}/api/catalog_system/pub/products/search?ft={quote(termo)}&_from={ini}&_to={ini + 49}'
                lista = await http.get(url, json=True)
                if lista is None:
                    falhou = True
                    break
                for p in lista:
                    n = _converter(p, loja, host)
                    if isinstance(n, dict):
                        itens[n['id']] = n
                        achou += 1
                if len(lista) < 50:
                    break
        # itens que já estavam na lista e não apareceram na busca
        for a in anteriores:
            if a.get('loja') != loja or a['id'] in itens:
                continue
            pid = a['id'].rsplit('-', 1)[-1]
            lista = await http.get(f'https://{host}/api/catalog_system/pub/products/search?fq=productId:{pid}', json=True)
            if lista is None:
                continue  # fica com o preço anterior (orquestrador marca como antigo)
            n = _converter(lista[0], loja, host) if lista else 'indisponivel'
            if isinstance(n, dict):
                itens[n['id']] = n
            else:
                itens[a['id']] = {'id': a['id'], 'removido': True}
        if falhou and not achou:
            problemas.append(loja)
        else:
            ok_lojas += 1
        log.info('VTEX %s: %d anúncios na busca%s', loja, achou, ' (com falhas)' if falhou else '')
    if not ok_lojas:
        return None, 'nenhuma loja VTEX respondeu'
    return list(itens.values()), ('sem resposta: ' + ', '.join(problemas)) if problemas else ''
