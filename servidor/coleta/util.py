"""Funções auxiliares: dinheiro, JSON embutido em páginas, busca recursiva."""
import json
import re
from datetime import datetime, timedelta, timezone

BRT = timezone(timedelta(hours=-3))


def agora():
    return datetime.now(BRT)


def texto_data(dt):
    return dt.strftime('%d/%m/%Y às %H:%M') + ' (horário de Brasília)'


def num(v):
    """Converte 1234.5, '1234.5', 'R$ 1.234,50' em float; None se não der."""
    if v is None or v == '':
        return None
    if isinstance(v, (int, float)):
        return float(v) if v > 0 else None
    s = re.sub(r'[^\d,\.]', '', str(v))
    if not s:
        return None
    if ',' in s:
        s = s.replace('.', '').replace(',', '.')
    elif s.count('.') > 1 or re.search(r'\.\d{3}$', s):
        s = s.replace('.', '')
    try:
        f = float(s)
    except ValueError:
        return None
    return f if f > 0 else None


def reais(v):
    if v is None:
        return ''
    s = f'{v:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return 'R$ ' + s


def next_data(html):
    """JSON do <script id="__NEXT_DATA__"> (Next.js), ou None."""
    m = re.search(r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except ValueError:
        return None


def json_ld(html):
    """Lista de objetos JSON-LD da página."""
    out = []
    for m in re.finditer(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            v = json.loads(m.group(1).strip())
        except ValueError:
            continue
        out.extend(v if isinstance(v, list) else [v])
    return out


def percorrer(obj, _prof=0):
    """Gera todos os dicts dentro de obj (abrindo também strings que são JSON)."""
    if _prof > 40:
        return
    if isinstance(obj, dict):
        yield obj
        for v in obj.values():
            yield from percorrer(v, _prof + 1)
    elif isinstance(obj, list):
        for v in obj:
            yield from percorrer(v, _prof + 1)
    elif isinstance(obj, str) and len(obj) > 50 and obj[:1] in '{[':
        try:
            yield from percorrer(json.loads(obj), _prof + 1)
        except ValueError:
            pass


def aplicar_preco(n, por, de=None, prazo=None, sufixo=''):
    """Atualiza os campos de preço de um notebook. Desconto só quando a loja mostra 'De' maior."""
    n['precoNum'] = round(por, 2)
    n['preco'] = reais(por) + sufixo
    if de and de > por * 1.005:
        n['precoDe'] = reais(de)
        n['precoDeNum'] = round(de, 2)
        n['descontoPct'] = round((de - por) / de * 100, 1)
    else:
        n['precoDe'] = ''
        n['precoDeNum'] = None
        n['descontoPct'] = None
    if prazo is not None:
        n['precoPrazo'] = reais(prazo) if prazo and prazo > por * 1.005 else ''
    n.pop('precoAntigo', None)
