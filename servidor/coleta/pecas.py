"""Peças e acessórios de computador (Computadores › Acessórios): SSD/HD, memória RAM, placa-mãe, placa de vídeo,
processador, fonte, monitor, mouse, teclado e headset.

Cada classificador recebe o título do anúncio e devolve {modelo, marca, original, kit, edicao} ou None.
- modelo: o que importa para comparar (ex.: "SSD NVMe 1TB", "DDR5 16GB", "B650 (AM5)", "RTX 4060");
- original: produto de marca conhecida (genérico sem marca fica de fora do filtro "Só originais / de marca").
A lista é ordenada por preço (com cupom); não há nota de oferta.
"""
import re

RUIM = re.compile(r'\busad[oa]s?\b|recondicionad|seminov|semi-nov|vitrine|open\s*box|mostru[aá]rio|defeito|retirada\s+de\s+pe[cç]as'
                  r'|\bpe[cç]as?\s+de\s+reposi|replica|r[eé]plica|para\s+retirada', re.I)

MARCAS = ['Kingston Fury', 'Kingston', 'Crucial', 'Samsung', 'Western Digital', 'WD Black', 'WD', 'Seagate', 'SanDisk', 'Corsair', 'XPG', 'ADATA',
          'Lexar', 'Patriot', 'HyperX', 'TeamGroup', 'Team Group', 'T-Force', 'Netac', 'Hikvision', 'Husky', 'Redragon', 'Logitech', 'Razer',
          'Asus', 'ROG', 'Gigabyte', 'Aorus', 'MSI', 'ASRock', 'AMD', 'Intel', 'Zotac', 'Galax', 'PNY', 'Palit', 'Gainward', 'Sapphire',
          'PowerColor', 'XFX', 'Cooler Master', 'Thermaltake', 'EVGA', 'Seasonic', 'Gamemax', 'Aerocool', 'Rise Mode', 'Mancer', 'Pichau',
          'LG', 'AOC', 'Philips', 'Dell', 'Alienware', 'BenQ', 'Acer', 'Lenovo', 'HP', 'Microsoft', 'Multilaser', 'C3Tech', 'Fortrek',
          'SteelSeries', 'JBL', 'Havit', 'Machenike', 'Akko', 'Keychron', 'Aula', 'Attack Shark', 'Fallen', 'Zowie', 'Glorious', 'Pulsar',
          'Lamzu', 'Endgame Gear', 'Vinik', 'Dazz', 'Philco', 'Positivo', 'Duex', 'Ninja', 'Superframe', 'Pcyes', 'Super Flower', 'DeepCool',
          'Lian Li', 'NZXT', 'be quiet', 'Arctic', 'Biostar', 'Afox', 'Sparkle', 'Inno3D', 'Colorful', 'Gskill', 'G.Skill', 'Apacer',
          'Toshiba', 'Seagate', 'Kioxia', 'Solidigm', 'Mancer', 'Lacie', 'Sony', 'Audio-Technica', 'Edifier', 'Astro', 'Fifine', 'Hoopson']


def marca(n):
    for m in MARCAS:
        if re.search(r'(?<![\w-])' + re.escape(m).replace(r'\ ', r'[\s\-]?') + r'(?![\w-])', n, re.I):
            return {'Kingston Fury': 'Kingston', 'WD Black': 'WD', 'Western Digital': 'WD', 'Team Group': 'TeamGroup', 'T-Force': 'TeamGroup',
                    'ROG': 'Asus', 'Aorus': 'Gigabyte', 'Gskill': 'G.Skill', 'Alienware': 'Dell'}.get(m, m)
    return ''


def _limpo(nome):
    n = ' '.join((nome or '').split())
    return None if not n or RUIM.search(n) else n


def _no_inicio(n, tipo, ate=30):
    """O produto é o assunto do título: o tipo aparece logo no começo (depois de "Kit", marca…)."""
    m = re.search(tipo, n, re.I)
    return bool(m) and m.start() <= ate


def _kit(n):
    return bool(re.search(r'\bkit\b|\bcombo\b|\+', n, re.I))


def _gb(n, maximo_gb=None):
    """Capacidade: '1TB', '512GB'… (a maior do título que faça sentido)."""
    caps = []
    for v, u in re.findall(r'(\d+(?:[.,]\d+)?)\s?(tb|gb)\b', n, re.I):
        g = float(v.replace(',', '.')) * (1000 if u.lower() == 'tb' else 1)
        if not maximo_gb or g <= maximo_gb:
            caps.append(g)
    return max(caps) if caps else None


def _fmt_cap(g):
    if g is None:
        return ''
    return f'{g / 1000:g}TB' if g >= 1000 else f'{g:g}GB'


def _res(modelo, n, original=None):
    m = marca(n)
    return {'modelo': modelo, 'marca': m or 'Sem marca conhecida', 'original': bool(m) if original is None else original,
            'kit': _kit(n), 'edicao': ''}


# ---------------------------------------------------------------- SSD / HD
def classificar_armazenamento(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'\bssd\b|\bhd\b|hard\s+disk|disco\s+r[ií]gido|m\.?2\s+nvme|\bnvme\b', 40):
        return None
    if re.search(r'gaveta|\bcase\b|enclosure|adaptador|dissipador|cabo|leitor|dock|suporte|caddy|cart[aã]o|pen\s?drive|notebook\s+com|'
                 r'computador|\bpc\s+gamer|desktop|all\s+in\s+one|\bmem[oó]ria\s+ram\b', n, re.I):
        return None
    cap = _gb(n, 30000)
    if not cap:
        return None
    externo = bool(re.search(r'extern|port[aá]til|usb', n, re.I))
    if re.search(r'\bssd\b|nvme|m\.?2', n, re.I):
        tipo = 'SSD externo' if externo else 'SSD NVMe' if re.search(r'nvme|pcie|m\.?2', n, re.I) else 'SSD SATA'
    else:
        tipo = 'HD externo' if externo else 'HD'
    return _res(f'{tipo} {_fmt_cap(cap)}', n)


# ---------------------------------------------------------------- memória RAM
def classificar_memoria(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'mem[oó]ria|\bram\b|\bddr[345]\b', 40) or not re.search(r'\bddr\s?[345]\b|\bram\b', n, re.I):
        return None
    if re.search(r'cart[aã]o|micro\s?sd|pen\s?drive|flash|\bssd\b|notebook\s+(?:com|gamer)|computador|\bpc\s+gamer|celular|smartphone|dissipador', n, re.I):
        return None
    ddr = re.search(r'ddr\s?([345])', n, re.I)
    cap = _gb(n, 512)
    if not ddr or not cap:
        return None
    dupla = re.search(r'(\d)\s?x\s?(\d+)\s?gb', n, re.I)
    if dupla:
        cap = int(dupla.group(1)) * int(dupla.group(2))
    sodimm = ' notebook' if re.search(r'so-?dimm|notebook|laptop', n, re.I) else ''
    return _res(f'DDR{ddr.group(1)} {_fmt_cap(cap)}{sodimm}', n)


# ---------------------------------------------------------------- placa-mãe
_CHIPSET = re.compile(r'\b([ABHXZQ]\d{3})(M|E)?(?=[a-z]*\b)', re.I)


def classificar_placa_mae(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'placa[\s-]+m[aã]e|motherboard|mainboard', 30):
        return None
    if re.search(r'notebook|celular|tv\b|impressora|\bcabo\b|espelho|backplate|suporte', n, re.I):
        return None
    ch = _CHIPSET.search(n)
    sock = re.search(r'\b(AM[345])\b|LGA\s?-?(\d{4})', n, re.I)
    sk = (sock.group(1).upper() if sock.group(1) else 'LGA' + sock.group(2)) if sock else ''
    modelo = ((ch.group(1) + (ch.group(2) or '')).upper() if ch else 'Outro chipset') + (f' ({sk})' if sk else '')
    return _res(modelo, n)


# ---------------------------------------------------------------- placa de vídeo
_GPU = re.compile(r'\b(RTX|GTX|RX|ARC)\s?-?\s?([A-Z]?\d{3,4})\s?(TI\s?SUPER|TI|SUPER|XTX|XT|GRE)?\b', re.I)


def classificar_placa_video(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'placa\s+de\s+v[ií]deo|\bgpu\b|\brtx\b|\bgtx\b|\brx\s?\d|geforce|radeon', 30):
        return None
    if re.search(r'suporte|\bcabo\b|riser|cooler\s+para|backplate|ventoinha|notebook|computador|\bpc\s+gamer|desktop|monitor|kit\s+upgrade', n, re.I):
        return None
    g = _GPU.search(n)
    if not g:
        return None
    modelo = f'{g.group(1).upper()} {g.group(2).upper()}' + (f' {g.group(3).upper()}' if g.group(3) else '')
    modelo = modelo.replace('TISUPER', 'TI SUPER').replace(' TI', ' Ti').replace('SUPER', 'Super').replace('ARC ', 'Arc ')
    vram = re.search(r'(\d{1,2})\s?gb', n, re.I)
    return _res(modelo + (f' {vram.group(1)}GB' if vram else ''), n)


# ---------------------------------------------------------------- processador
def classificar_processador(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'processador|\bcpu\b|ryzen|core\s+(?:i[3579]|ultra)', 30):
        return None
    if re.search(r'cooler|pasta\s+t[eé]rmica|dissipador|notebook|computador|\bpc\s+gamer|desktop|\bkit\s+upgrade|placa[\s-]+m[aã]e|'
                 r'celular|tablet|smartphone', n, re.I):
        return None
    r = re.search(r'ryzen\s+([3579])\s+(\d{4}\w*)', n, re.I)
    i = re.search(r'core\s+(?:i([3579])|ultra\s+([3579]))[\s-]+(\d{3,5}\w*)', n, re.I)
    if r:
        modelo = f'Ryzen {r.group(1)} {r.group(2).upper()}'
    elif i:
        modelo = f'Core i{i.group(1)}-{i.group(3).upper()}' if i.group(1) else f'Core Ultra {i.group(2)} {i.group(3).upper()}'
    else:
        return None
    return _res(modelo, n)


# ---------------------------------------------------------------- fonte
def classificar_fonte(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'\bfonte\b', 20):
        return None
    if re.search(r'notebook|carregador|celular|\btv\b|impressora|roteador|led\b|fita|c[aâ]mera|\bcabo\b|extensor|bancada|chaveada|12v\b|24v\b|5v\b', n, re.I):
        return None
    w = re.search(r'(\d{3,4})\s?w\b', n, re.I)
    if not w or not 200 <= int(w.group(1)) <= 2000:
        return None
    cert = re.search(r'80\s?plus\s+(bronze|silver|gold|platinum|titanium|white|standard)', n, re.I)
    return _res(f'{w.group(1)}W' + (f' 80 Plus {cert.group(1).capitalize()}' if cert else ''), n)


# ---------------------------------------------------------------- monitor
def classificar_monitor(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'\bmonitor\b', 25):
        return None
    if re.search(r'suporte|bra[cç]o|\bcabo\b|pel[ií]cula|limpa|card[ií]aco|beb[eê]|press[aã]o|glicose|\bkit\s+(?:pc|computador)|computador\s+completo', n, re.I):
        return None
    pol = re.search(r'(\d{2}(?:[.,]\d)?)\s?(?:"|”|pol|polegadas|\'\'|inch)', n, re.I)
    hz = re.search(r'(\d{2,3})\s?hz', n, re.I)
    if not pol:
        return None
    return _res(f'{pol.group(1).replace(",", ".")}"' + (f' {hz.group(1)}Hz' if hz else ''), n)


# ---------------------------------------------------------------- mouse, teclado, headset
def classificar_mouse(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'\bmouse\b', 20):
        return None
    if re.search(r'mouse\s?pad|mousepad|bungee|feet|skates|grip\s+tape|\bcabo\b|receptor|bateria|carregador|teclado', n, re.I):
        return None
    sem_fio = re.search(r'sem\s+fio|wireless|bluetooth|2[.,]4\s?ghz', n, re.I)
    return _res('Mouse sem fio' if sem_fio else 'Mouse com fio', n)


def classificar_teclado(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'\bteclado\b', 20):
        return None
    if re.search(r'keycaps?|switch(?:es)?\s+(?:para|avulso)|capa\s+para|pel[ií]cula|musical|piano|arranjador|sintetizador|controlador\s+midi|'
                 r'tablet|ipad|celular|notebook\s+com|apoio\s+de\s+pulso|descanso', n, re.I):
        return None
    mec = re.search(r'mec[aâ]nico|mechanical|switch(?:es)?\s+(?:outemu\s+|gateron\s+|kailh\s+)?(?:brown|blue|red|black|yellow|silver)', n, re.I)
    combo = re.search(r'mouse', n, re.I)
    return _res('Teclado + mouse' if combo else 'Teclado mecânico' if mec else 'Teclado', n)


def classificar_headset(nome):
    n = _limpo(nome)
    if not n or not _no_inicio(n, r'headset|fone\s+de\s+ouvido\s+gamer|fone\s+gamer', 25):
        return None
    if re.search(r'suporte|almofada|espuma|earpads?|\bcabo\b|adaptador|capa', n, re.I):
        return None
    sem_fio = re.search(r'sem\s+fio|wireless|bluetooth|2[.,]4\s?ghz', n, re.I)
    return _res('Headset sem fio' if sem_fio else 'Headset com fio', n)


ITENS = {
    'pc-armazenamento': {'nome': 'SSD e HD', 'termos': ['ssd nvme 1tb', 'ssd 480gb', 'hd 1tb', 'hd externo'],
                         'classificar': classificar_armazenamento, 'preco_min': 60, 'preco_max': 8000},
    'pc-memoria': {'nome': 'Memória RAM', 'termos': ['memoria ram ddr4', 'memoria ram ddr5', 'memoria notebook ddr4'],
                   'classificar': classificar_memoria, 'preco_min': 40, 'preco_max': 6000},
    'pc-placa-mae': {'nome': 'Placa-mãe', 'termos': ['placa mae am5', 'placa mae am4', 'placa mae lga 1700'],
                     'classificar': classificar_placa_mae, 'preco_min': 250, 'preco_max': 10000},
    'pc-placa-video': {'nome': 'Placa de vídeo', 'termos': ['placa de video rtx', 'placa de video rx'],
                       'classificar': classificar_placa_video, 'preco_min': 500, 'preco_max': 30000},
    'pc-processador': {'nome': 'Processador', 'termos': ['processador ryzen', 'processador intel core'],
                       'classificar': classificar_processador, 'preco_min': 200, 'preco_max': 12000},
    'pc-fonte': {'nome': 'Fonte', 'termos': ['fonte atx 650w', 'fonte 80 plus'],
                 'classificar': classificar_fonte, 'preco_min': 120, 'preco_max': 5000},
    'pc-monitor': {'nome': 'Monitor', 'termos': ['monitor gamer', 'monitor 24 polegadas', 'monitor 27 polegadas'],
                   'classificar': classificar_monitor, 'preco_min': 350, 'preco_max': 20000},
    'pc-mouse': {'nome': 'Mouse', 'termos': ['mouse gamer', 'mouse sem fio'],
                 'classificar': classificar_mouse, 'preco_min': 20, 'preco_max': 1500},
    'pc-teclado': {'nome': 'Teclado', 'termos': ['teclado mecanico', 'teclado sem fio'],
                   'classificar': classificar_teclado, 'preco_min': 30, 'preco_max': 2500},
    'pc-headset': {'nome': 'Headset', 'termos': ['headset gamer'],
                   'classificar': classificar_headset, 'preco_min': 40, 'preco_max': 3000},
}
for _cfg in ITENS.values():
    _cfg.update({'secao': 'pecas', 'sub': 'acessorios', 'grupo': 'modelo'})
