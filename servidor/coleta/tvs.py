"""Games › TVs: smart TVs novas, com as características que importam para jogar tiradas do título do anúncio.

Campos gravados no produto (a nota para games é calculada no app, em app/src/logica/tv.ts):
  telaPol (polegadas), tvRes ('8K' | '4K' | 'Full HD' | 'HD'), tvPainel ('OLED' | 'Mini LED' | 'QNED' | 'QLED' | 'NanoCell' | 'LED'),
  tvHz (taxa de atualização, se o título disser), tvGame (lista: HDMI 2.1, VRR, ALLM, FreeSync, G-Sync, Game Mode Pro…), tvSistema.
"""
import re

from .pecas import RUIM

MARCAS_TV = ['Samsung', 'LG', 'TCL', 'Sony', 'Philips', 'Philco', 'AOC', 'Semp', 'Hisense', 'Toshiba', 'Panasonic', 'Multilaser',
             'Britânia', 'Britania', 'Aiwa', 'Xiaomi', 'Roku', 'HQ', 'Hye', 'JVC', 'Sharp', 'Vizzion', 'Mondial']

_NAO_TV = re.compile(r'suporte|controle\s+remoto|\bcabo\b|antena|\btv\s?box\b|\bstick\b|chromecast|fire\s?tv|pel[ií]cula|capa\b|conversor|projetor|'
                     r'monitor|receptor|rack|painel\s+para|soundbar|home\s+theater|\bbox\b|adaptador|limpa|l[aâ]mpada|placa|fonte|tela\s+para|'
                     r'display\s+para|barra\s+de\s+led|kit\s+de\s+led|retroilumina', re.I)


def _marca(n):
    for m in MARCAS_TV:
        if re.search(r'(?<![\w-])' + re.escape(m) + r'(?![\w-])', n, re.I):
            return 'Britânia' if m == 'Britania' else m
    return ''


def classificar_tv(nome):
    n = ' '.join((nome or '').split())
    if not n or RUIM.search(n):
        return None
    # a TV é o assunto do título ("Smart TV…", "TV LG…", "Televisão…")
    m = re.search(r'smart\s?tv|\btv\b|televis[aã]o|televisor', n, re.I)
    if not m or m.start() > 25:
        return None
    if _NAO_TV.search(n[:m.start() + 40]) and not re.search(r'^\s*(?:smart\s?tv|tv|televis)', n, re.I):
        return None
    if re.search(r'suporte\s+(?:de\s+parede\s+)?para|controle\s+remoto|conversor|tv\s?box', n, re.I):
        return None
    # móveis (estante, painel, rack, home…) citam "para TV até 65 polegadas"
    if re.search(r'\b(?:estante|pain[eé]is?|rack|m[oó]vel|home\s+(?:para|suspens|theater)|aparador|buffet|bancada|mesa\s+para|cumaru|opala|freij[oó])\b|^\s*home\b', n, re.I):
        return None
    pol = re.search(r'(\d{2,3})(?:[.,]\d)?\s*(?:"|”|\'\'|pol\b|pol\.|polegadas|inch|\bpolegada)', n, re.I) or re.search(r'\b(?:tv|smart\s?tv)\s+(?:\w+\s+){0,3}?(\d{2})\b(?!\s?(?:hz|gb|w\b))', n, re.I)
    if not pol or not 19 <= int(pol.group(1)) <= 120:
        return None
    pol = int(pol.group(1))
    res = '8K' if re.search(r'\b8k\b', n, re.I) else '4K' if re.search(r'\b4k\b|uhd|ultra\s?hd|2160', n, re.I) else \
        'Full HD' if re.search(r'full\s?hd|\bfhd\b|1080', n, re.I) else 'HD' if re.search(r'\bhd\b|720', n, re.I) else ''
    painel = 'OLED' if re.search(r'\boled\b|qd-?oled', n, re.I) else 'Mini LED' if re.search(r'mini\s?-?led|neo\s?qled|qd-?mini', n, re.I) else \
        'QNED' if re.search(r'\bqned\b', n, re.I) else 'QLED' if re.search(r'\bqled\b|quantum\s+dot|crystal\s+uhd', n, re.I) else \
        'NanoCell' if re.search(r'nano\s?cell|\bnano\b(?!\s?(?:sim|chip))', n, re.I) else 'LED'
    # "Crystal UHD" da Samsung é LED comum (não é QLED): corrige
    if painel == 'QLED' and re.search(r'crystal\s+uhd', n, re.I) and not re.search(r'\bqled\b', n, re.I):
        painel = 'LED'
    hz = re.search(r'(\d{2,3})\s?hz', n, re.I)
    hz = int(hz.group(1)) if hz and 50 <= int(hz.group(1)) <= 480 else None
    game = [r for r, p in (('HDMI 2.1', r'hdmi\s?2\.1'), ('VRR', r'\bvrr\b'), ('ALLM', r'\ballm\b'), ('FreeSync', r'free\s?sync'),
                           ('G-Sync', r'g-?sync'), ('Game Mode', r'game\s+(?:mode|bar|hub|optimizer)|modo\s+(?:game|jogo)')) if re.search(p, n, re.I)]
    sistema = next((s for s, p in (('Google TV', r'google\s+tv'), ('Android TV', r'android\s+tv'), ('webOS', r'web\s?os|thinq'),
                                    ('Tizen', r'tizen'), ('Roku TV', r'roku'), ('VIDAA', r'vidaa')) if re.search(p, n, re.I)), '')
    marca = _marca(n)
    modelo = f'{pol}" {res + " " if res else ""}{painel}'
    return {'modelo': modelo, 'marca': marca or 'Sem marca conhecida', 'original': bool(marca),
            'kit': bool(re.search(r'\+\s*(?:soundbar|suporte|home|caixa)|\bkit\b|\bcombo\b', n, re.I)), 'edicao': '',
            'campos': {'telaPol': pol, 'tvRes': res, 'tvPainel': painel, 'tvHz': hz, 'tvGame': game, 'tvSistema': sistema}}


ITENS = {
    'tv': {'secao': 'games', 'sub': 'tvs', 'nome': 'TVs', 'grupo': 'modelo',
           'termos': ['smart tv 4k 55', 'smart tv 50 polegadas', 'smart tv 65 polegadas', 'smart tv 43', 'tv oled', 'tv qled', 'smart tv 120hz'],
           'classificar': classificar_tv, 'preco_min': 600, 'preco_max': 80000, 'max_loja': 120},
}
