"""Dell.com: atualiza o preço das configurações (SKUs) já cadastradas, página por página."""
import asyncio
import logging
import re

from .util import aplicar_preco, json_ld, num

log = logging.getLogger('coleta')
RS = r'R\$\s*([\d\.]+,\d{2})'


def _preco(html, sku):
    """(por, de) a partir da página de configuração."""
    i = html.find('Preço da Dell')
    if i >= 0:
        fim = html.find('Código do Produto', i)
        bloco = html[i:fim if fim > i else i + 4000]
        valores = [num(v) for v in re.findall(RS, re.sub(r'<[^>]+>', ' ', bloco))]
        valores = [v for v in valores if v and v > 500]
        if valores:
            por = valores[-1] if len(valores) > 1 and valores[-1] < valores[0] else valores[0]
            de = valores[0] if len(valores) > 1 and valores[0] > por else None
            return por, de
    for o in json_ld(html):
        ofs = o.get('offers') if isinstance(o, dict) else None
        ofs = ofs if isinstance(ofs, list) else [ofs] if ofs else []
        for of in ofs:
            p = num((of or {}).get('price') or (of or {}).get('lowPrice'))
            if p and p > 500:
                return p, None
    return None, None


async def coletar(http, anteriores):
    skus = [a for a in anteriores if a.get('loja', 'Dell.com') == 'Dell.com' and a.get('url')]
    if not skus:
        return [], 'nenhum SKU cadastrado'
    ok = [0]

    async def um(a):
        html = await http.get(a['url'], tentativas=2)
        if not html or len(html) < 50000 or a['id'].lower() not in html.lower():
            return None
        if re.search(r'indispon[ií]vel|esgotado|n[aã]o est[aá] mais dispon', html[:300000], re.I) and 'Preço da Dell' not in html:
            return {'id': a['id'], 'removido': True}
        por, de = _preco(html, a['id'])
        if not por:
            if not ok[0]:
                i = html.find('R$')
                log.warning('Dell %s: preço não encontrado; trecho: %r', a['id'], re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html[max(0, i - 300):i + 300]))[:400])
            return None
        ok[0] += 1
        n = {'id': a['id']}
        aplicar_preco(n, por, de)
        return n

    res = await asyncio.gather(*(um(a) for a in skus))
    out = [r for r in res if r]
    log.info('Dell.com: %d de %d SKUs com preço novo', ok[0], len(skus))
    if not out:
        return None, 'nenhuma página da Dell respondeu'
    return out, f'{ok[0]} de {len(skus)} SKUs atualizados'
