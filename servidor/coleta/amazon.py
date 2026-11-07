"""Amazon: só os ASINs já cadastrados (a busca da Amazon pede captcha)."""
import asyncio
import logging
import re

from .util import aplicar_preco, num

log = logging.getLogger('coleta')


def _valor(html, ancora):
    i = html.find(ancora)
    if i < 0:
        return None
    m = re.search(r'class="a-offscreen">\s*([^<]+)<', html[i:i + 3000])
    return num(m.group(1)) if m else None


async def coletar(http, anteriores):
    itens = [a for a in anteriores if a['id'].startswith('amazon-')]
    if not itens:
        return [], 'nenhum ASIN cadastrado'
    bloq = [0]

    async def um(a):
        asin = a['id'].split('-', 1)[1]
        html = await http.get(f'https://www.amazon.com.br/dp/{asin}')
        if not html:
            return None
        if 'captcha' in html.lower()[:20000] or 'validateCaptcha' in html:
            bloq[0] += 1
            return None
        por = _valor(html, 'priceToPay') or _valor(html, 'corePrice') or _valor(html, 'apexPriceToPay')
        if not por:  # oferta principal sem preço: mantém o anterior (outros vendedores podem ter)
            return None
        de = _valor(html, 'basisPrice')
        n = {'id': a['id']}
        aplicar_preco(n, por, de)
        return n

    res = await asyncio.gather(*(um(a) for a in itens))
    out = [r for r in res if r]
    if not out:
        return None, 'captcha/bloqueio' if bloq[0] else 'sem resposta'
    return out, f'{len(out)} de {len(itens)} atualizados'
