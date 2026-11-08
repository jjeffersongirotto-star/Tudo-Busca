"""iByte, WAZ e Webcontinental: API pública de catálogo VTEX."""
import logging
import re
from urllib.parse import quote

from .classifica import tipo
from .util import aplicar_preco, imagem_ok, num

log = logging.getLogger('coleta')

# Lojas com catálogo público VTEX. As que não responderem são ignoradas (e mantêm a coleta anterior).
LOJAS = {'iByte': 'www.ibyte.com.br', 'WAZ': 'www.waz.com.br', 'Webcontinental': 'www.webcontinental.com.br',
         'Fast Shop': 'www.fastshop.com.br', 'Gazin': 'www.gazin.com.br', 'Novo Mundo': 'www.novomundo.com.br',
         'eFácil': 'www.efacil.com.br', 'Colombo': 'www.colombo.com.br', 'Lebes': 'www.lebes.com.br',
         'Girafa': 'www.girafa.com.br', 'Lojas MM': 'www.lojasmm.com', 'Zema': 'www.zema.com',
         'Positivo': 'loja.positivotecnologia.com.br', 'Multilaser': 'www.multilaser.com.br', 'Avell': 'avell.com.br',
         'Carrefour': 'www.carrefour.com.br', 'Havan': 'www.havan.com.br', 'Eletrozema': 'www.eletrozema.com.br'}
TERMOS = ['notebook', 'notebook gamer', 'computador', 'pc gamer', 'macbook', 'all in one', 'mini pc']
PAGINAS = 2  # 50 por página


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
    if not tipo(nome):
        return None
    item = (p.get('items') or [{}])[0]
    s, o = _oferta(item)
    if not o:
        return 'indisponivel'
    specs = {'Anúncio (título)': nome, 'Loja': loja, 'Vendedor (seller VTEX)': s.get('sellerName', ''),
             'Referência': p.get('productReference', ''), 'Marca': marca}
    for k in (p.get('allSpecifications') or [])[:30]:
        v = p.get(k)
        if isinstance(v, list) and v and len(k) < 60:
            specs[k] = ', '.join(str(x) for x in v)[:300]
    link = p.get('link') or ''
    if link.startswith('/'):
        link = 'https://' + host + link
    slug = re.sub(r'[^a-z0-9]', '', loja.lower().replace('á', 'a'))
    n = {'id': f"vtex-{slug}-{p.get('productId')}", 'loja': loja, 'vendedor': s.get('sellerName', ''), 'nome': nome,
         'modelo': p.get('productReference', ''), 'url': link, 'specs': specs,
         'imagem': imagem_ok(((item.get('images') or [{}])[0]).get('imageUrl'))}
    aplicar_preco(n, num(o.get('Price')), num(o.get('ListPrice')))
    return n


async def coletar(http, anteriores):
    """Busca por termo em cada loja; itens antigos que não voltaram são consultados pelo productId."""
    itens, problemas, ok_lojas = {}, [], 0
    for loja, host in LOJAS.items():
        achou, falhou = 0, False
        for termo in TERMOS:
            for ini in range(0, 50 * PAGINAS, 50):
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
            continue
        else:
            ok_lojas += 1
        log.info('VTEX %s: %d anúncios na busca%s', loja, achou, ' (com falhas)' if falhou else '')
    if not ok_lojas:
        return None, 'nenhuma loja VTEX respondeu'
    return list(itens.values()), ('sem resposta: ' + ', '.join(problemas)) if problemas else ''
