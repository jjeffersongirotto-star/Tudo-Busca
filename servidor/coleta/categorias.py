"""Catálogo de seções (cards da página) e classificação dos produtos que não são computadores.

Estrutura (a mesma usada pela página, em SECOES do cupons-dell.html):
  seção (card)          → sub-card              → item (tipo de acessório, etc.)
  computadores          → (computadores atuais)
  games                 → consoles              → console-ps5, console-ps4, console-xbox, console-switch, console-switch2, console-steam
                        → acessorios            → controle-ps5, controle-ps4, controle-xbox, controle-switch,
                                                  acessorio-ps, acessorio-xbox, acessorio-switch

Para incluir um tipo novo de produto basta acrescentar um item em ITENS com:
  - termos: buscas feitas em cada loja;
  - classificar(nome) → dict com os campos do item (modelo, marca, original…) ou None se o anúncio não é desse item;
  - preco_min / preco_max: faixa plausível (fora dela o anúncio é descartado: peça, capa, erro de preço).
"""
import re

RUIM = re.compile(r'\busad[oa]s?\b|recondicionad|seminov|semi-nov|vitrine|open\s*box|mostru[aá]rio|defeito|com\s+defeito|retirada\s+de\s+pe[cç]as'
                  r'|\bpe[cç]as?\b|replica|r[eé]plica', re.I)

# ---------- Controles de PS5 ----------
_PS5 = re.compile(r'\bps\s?-?5\b|playstation\s*5|playstation®\s*5|dual\s?sense', re.I)
_CONTROLE = re.compile(r'controle|controlador|controlo|comando|gamepad|joystick|dual\s?sense|\bjoypad', re.I)
# o anúncio é de uma PEÇA/ACESSÓRIO do controle, não do controle
_ACESSORIO = re.compile(
    r'^\s*(?:\d+\s*(?:pcs|p[cç]s|unid\w*|x)\s+)?(?:kit\s+(?:de\s+)?(?:reparo|repara[cç][aã]o|bot[oõ]es|grips?|capas?|manuten)|suporte|capa|case|'
    r'capinha|pel[ií]cula|skin|adesivo|grip|carregador|base\b|dock|esta[cç][aã]o|cabo|bateria|bot[aã]o|bot[oõ]es|conjunto\s+de\s+bot|tampa|'
    r'thumb|analógico|anal[oó]gico|m[oó]dulo|placa|flex|gatilho|alto-?falante|protetor|bolsa|estojo|organizador|ventoinha|cooler|fone|headset|'
    r'adaptador|receptor|volante|faceplate|shell|carca[cç]a|xb10|\d+\s*(?:pcs|p[cç]s)\b)', re.I)
_PECA = re.compile(r'reparo|reposi[cç][aã]o|substitui[cç][aã]o|pe[cç]a\s+de|m[oó]dulo\s+(?:stick|anal)|cabo\s+flex|capas?\s+(?:de|para)\s+(?:joystick|anal|stick|polegar)'
                   r'|grips?\s+para\s+(?:thumb|anal|joystick)|thumbstick\s+caps|kit\s+de\s+bot|placa\s+(?:m[aã]e|de\s+circuito)|carca[cç]a|faceplate|'
                   r'\bshell\b|charger|charging|\bpara\s+(?:o\s+|a\s+)?(?:controle\s+)?dual\s?sense\b|skin\s+(?:para|de)|adesivo|pel[ií]cula|suporte\s+(?:de\s+)?(?:parede|mesa|controle)|carregador\s+(?:duplo|para)|'
                   r'base\s+(?:de\s+)?carregamento\s+(?:dupla|para)|esta[cç][aã]o\s+de\s+carga|\bsem\s+controle\b|apenas\s+(?:a\s+)?(?:capa|caixa)', re.I)
_ANTES = re.compile(r'\b(?:fita|grip|capa|capinha|case|skin|adesivo|pel[ií]cula|suporte|carregador|base|dock|cabo|bateria|bot[oõ]es|bot[aã]o|tampa|'
                    r'm[oó]dulo|placa|gatilho|protetor|bolsa|estojo|organizador|adaptador|receptor|kit\s+de|pe[cç]as?|thumb|anal[oó]gico|'
                    r'ventilador|cooler|fone|headset|faceplate|shell|carca[cç]a|alça|al[cç]a|chaveiro|tapete|mousepad|lumin[aá]ria|caneca|camiseta)\b', re.I)
_SO_OUTRO = re.compile(r'dualshock|xbox|switch|nintendo', re.I)
_NAO_CONTROLE = re.compile(r'[oó]culos|realidade\s+virtual|\bvr\s?2?\b|^\s*console\b|\bconsole\s+(?:sony\s+)?(?:playstation|ps\s?5)|'
                           r'\bps\s?5\s+(?:slim|pro|digital|standard|fat)\b(?!\s*/)\s*(?:\d|com|\+|,|-|$)', re.I)
MARCAS_CONTROLE = ['Sony', 'Nacon', 'Redragon', 'Fantech', 'Data Frog', 'IMECOO', '8BitDo', 'PowerA', 'Hori', 'GameSir', 'Turtle Beach',
                   'Victrix', 'SCUF', 'Razer', 'PDP', 'Knup', 'Multilaser', 'Thrustmaster', 'Logitech', 'BigBig Won', 'Flydigi',
                   'Witsurge', 'Mobapad', 'Easysmx', 'Exbom', 'Feir', 'Elg', 'Dobe', 'Kontrolfreek', 'Machenike', 'Gulikit',
                   # marcas de outros acessórios (headset, armazenamento, capas)
                   'HyperX', 'JBL', 'SteelSeries', 'Corsair', 'Astro', 'Seagate', 'Samsung', 'SanDisk', 'Kingston', 'Western Digital', 'WD_Black',
                   'Lexar', 'Hyperkin', 'Orb', 'OIVO', 'Dobe', 'Baseus', 'Ugreen', 'Anker', 'Logitech G', 'Rig', 'Plantronics']
_EDGE = re.compile(r'dual\s?sense\s+edge|\bedge\b.*\b(?:ps5|playstation|sony)|cfi-?zcp', re.I)
_ACCESS = re.compile(r'\bacc?ess\b.*(?:sony|ps5|playstation)|cfi-?zac', re.I)
_ORIGINAL = re.compile(r'\bsony\b|\boriginal\b|\boficial\b|cfi-?z|playstation\s*®', re.I)
_GENERICO = re.compile(r'compat[ií]vel\s+com\s+(?:o\s+|a\s+)?(?:ps\s?5|playstation|sony)|tipo\s+dualsense|estilo\s+dualsense|similar|gen[eé]rico|'
                       r'\bturbo\b|\bmacro\b|\brgb\b|hall|\bp\d{2,}\b|\bbt\s?5|vibra[cç][aã]o\s+dupla|traseiros?\s+program', re.I)


def _marca(nome):
    for m in MARCAS_CONTROLE:
        if re.search(r'\b' + re.escape(m).replace(r'\ ', r'[\s\-]?') + r'\b', nome, re.I):
            return m
    return ''


def classificar_controle_ps5(nome):
    """Controle (inteiro, novo) que funciona no PS5. Retorna os campos do item ou None."""
    n = ' '.join((nome or '').split())
    if not n or RUIM.search(n) or not _PS5.search(n) or not _CONTROLE.search(n):
        return None
    if _ACESSORIO.match(n) or _PECA.search(n) or _NAO_CONTROLE.search(n):
        return None
    # o que vem ANTES da palavra "controle" diz o que é o produto ("Fita de Controle…", "Capa para Controle…")
    antes = n[:_CONTROLE.search(n).start()]
    if _ANTES.search(antes):
        return None
    if re.search(r'carregador|(?:base|esta[cç][aã]o|dock|suporte)\s+(?:[\wÀ-ú]+\s+){0,2}(?:de\s+)?(?:carga|carregamento)', n, re.I) and '+' not in n:
        return None  # carregador/estação de carga (o kit "Controle + Base de carregamento" continua)
    # controle de outro console que só cita o PS5 depois ("Controle Xbox ... estilo PS5") fica de fora
    o = _SO_OUTRO.search(n)
    if o and o.start() < _PS5.search(n).start():
        return None
    marca = _marca(n)
    if marca == 'Sony' and not re.search(r'(?<!para )(?<!for )\bsony\b', n, re.I):
        marca = ''  # "para Sony PlayStation 5" não é marca
    dualsense = bool(re.search(r'dual\s?sense|cfi-?z|\bacc?ess\b', n, re.I))
    # oficial = cita DualSense (ou modelo CFI-Z…), não cita outra marca e não tem cara de genérico (turbo, RGB, macro…)
    oficial = dualsense and marca in ('', 'Sony') and not _GENERICO.search(n)
    if oficial:
        marca = 'Sony'
        modelo = 'DualSense Edge' if _EDGE.search(n) else 'Access (adaptado)' if _ACCESS.search(n) else 'DualSense'
    else:
        marca = marca or 'Sem marca conhecida'
        modelo = 'Compatível (outra marca)'
    kit = bool(re.search(r'\+\s*(?:base|carregador|jogo|cabo|capa|suporte)|\bkit\b|\bcombo\b|\bbundle\b', n, re.I))
    edicao = ''
    m = re.search(r'edi[cç][aã]o\s+(?:limitada\s+)?(?:d[aeo]s?\s+)?([\w\sÀ-ú\'’\-]{3,40}?)(?:,|\s-|\s\||$)', n, re.I)
    if m:
        edicao = m.group(0).strip(' ,-|')
    return {'modelo': modelo, 'marca': marca, 'original': oficial, 'kit': kit, 'edicao': edicao}



# ---------- Consoles ----------
# anúncio que NÃO é o console (jogo, capa, suporte, peça…), mesmo citando o nome dele
_NAO_CONSOLE = re.compile(
    r'^\s*(?:jogo|game\b|capa|case|capinha|skin|adesivo|pel[ií]cula|suporte|base|dock|cooler|ventoinha|carregador|cabo|fonte|hd\b|ssd|'
    r'cart[aã]o|controle|joy[\s-]?con|headset|fone|bolsa|estojo|kit\s+(?:de\s+)?(?:limpeza|acess)|leitor|tampa|faceplate|cover|protetor|'
    r'volante|teclado|mouse|m[ií]dia|filme|livro|camiseta|caneca|r[eé]plica|miniatura|chaveiro|tapete|organizador|gift|vale)', re.I)
_PECA_CONSOLE = re.compile(r'\bpara\s+(?:o\s+|a\s+)?(?:console|ps\s?[45]|playstation|xbox|nintendo|switch)\b|\bcompat[ií]vel\s+com\b|'
                           r'retr[oô]|\bgame\s*stick\b|\bmini\b|\bportátil\s+r\d|\bsup\s+\d|\bx\d{1,2}\b.*\bjogos\b|\d{3,}\s*jogos|'
                           r'emulador|\btv\s*box\b|\bfat\s*boy\b|\bcapa\s+protetora\b|somente\s+(?:a\s+)?caixa|sem\s+console', re.I)


def _kit(n):
    return bool(re.search(r'\+|\bcom\s+(?:\d+\s+)?(?:jogos?|controles?|game)\b|\bbundle\b|\bkit\b|\bcombo\b|\bpacote\b|\bedi[cç][aã]o\s+(?:bundle|pacote)', n, re.I))


def _console_base(n, plataforma):
    """Texto limpo se o anúncio é de um console novo da plataforma; senão None."""
    n = ' '.join((n or '').split())
    if not n or RUIM.search(n) or not plataforma.search(n):
        return None
    if _NAO_CONSOLE.match(n) or _PECA_CONSOLE.search(n):
        return None
    # o que vem antes do nome do console diz o que é ("Capa para PlayStation 5…")
    if _ANTES.search(n[:plataforma.search(n).start()]):
        return None
    # o console é o assunto: o título diz "console" ou começa pelo nome dele ("Sony PlayStation 5…", "KIT Nintendo Switch…");
    # jogo ou acessório que só cita o console no meio ("Splatoon 3 - Nintendo Switch", "Pedais … Xbox Series X") fica de fora
    inicio = re.sub(r'^\s*(?:kit|combo|bundle|novo|lan[cç]amento|pr[eé]-?venda)\s+', '', n, flags=re.I)
    sem_marca = re.sub(r'^\s*(?:sony|microsoft|valve)\s+', '', inicio, flags=re.I)
    pos = [m.start() for m in (plataforma.search(inicio), plataforma.search(sem_marca)) if m]
    if not re.search(r'\bconsole\b', n, re.I) and (not pos or min(pos) > 3):
        return None
    return n


_PS5_CONSOLE = re.compile(r'playstation\s*®?\s*5|\bps\s?-?5\b', re.I)
_PS4_CONSOLE = re.compile(r'playstation\s*®?\s*4|\bps\s?-?4\b', re.I)
_XBOX_CONSOLE = re.compile(r'xbox\s+(?:series\s+[xs]|one)', re.I)
_SWITCH2 = re.compile(r'(?:nintendo\s+)?switch\s*(?:™\s*)?2\b|(?:nintendo\s+)?switch\s+ii\b', re.I)
_SWITCH = re.compile(r'nintendo\s+switch|\bswitch\s+(?:oled|lite)\b', re.I)


def classificar_console_ps5(nome):
    n = _console_base(nome, _PS5_CONSOLE)
    if not n or _XBOX_CONSOLE.search(n) or re.search(r'nintendo|switch', n, re.I):
        return None
    if re.search(r'\bpro\b', n, re.I):
        modelo = 'PS5 Pro'
    elif re.search(r'digital|sem\s+(?:leitor|drive|disco)', n, re.I):
        modelo = 'PS5 Digital'
    else:
        modelo = 'PS5 Mídia física'
    versao = 'Slim' if re.search(r'\bslim\b', n, re.I) else ''
    return {'modelo': modelo, 'marca': 'Sony', 'original': True, 'kit': _kit(n), 'edicao': versao}


def classificar_console_ps4(nome):
    n = _console_base(nome, _PS4_CONSOLE)
    if not n or _PS5_CONSOLE.search(n) or re.search(r'xbox|nintendo|switch', n, re.I):
        return None
    modelo = 'PS4 Pro' if re.search(r'\bpro\b', n, re.I) else 'PS4 Slim' if re.search(r'\bslim\b', n, re.I) else 'PS4'
    return {'modelo': modelo, 'marca': 'Sony', 'original': True, 'kit': _kit(n), 'edicao': ''}


def _armaz(n):
    m = re.search(r'\b(\d)\s?tb\b|\b(512)\s?gb\b', n, re.I)
    return (m.group(1) + 'TB') if m and m.group(1) else '512GB' if m else ''


def classificar_console_xbox(nome):
    n = _console_base(nome, _XBOX_CONSOLE)
    if not n or re.search(r'playstation|\bps\s?[45]\b|nintendo|switch', n, re.I):
        return None
    a = _armaz(n)
    if re.search(r'series\s+x', n, re.I):
        modelo = 'Xbox Series X' + (' Digital' if re.search(r'digital', n, re.I) else '') + (' ' + a if a == '2TB' else '')
    elif re.search(r'series\s+s', n, re.I):
        modelo = 'Xbox Series S' + (' 1TB' if a == '1TB' else ' 512GB')
    elif re.search(r'one\s+x\b|one\s+x\s|\bxbox\s+one\s*x$|scorpio', n, re.I):
        modelo = 'Xbox One X'    # o "Pro" da geração do PS4
    elif re.search(r'one\s+s\b', n, re.I):
        modelo = 'Xbox One S' + (' Digital' if re.search(r'all[\s-]*digital|digital', n, re.I) else '')
    else:
        modelo = 'Xbox One'
    return {'modelo': modelo, 'marca': 'Microsoft', 'original': True, 'kit': _kit(n), 'edicao': ''}


def classificar_console_switch(nome):
    """Nintendo Switch 1 (padrão, OLED, Lite)."""
    n = _console_base(nome, _SWITCH)
    if not n or _SWITCH2.search(n) or re.search(r'playstation|\bps\s?[45]\b|xbox', n, re.I):
        return None
    modelo = 'Switch OLED' if re.search(r'\boled\b', n, re.I) else 'Switch Lite' if re.search(r'\blite\b', n, re.I) else 'Switch (padrão)'
    return {'modelo': modelo, 'marca': 'Nintendo', 'original': True, 'kit': _kit(n), 'edicao': ''}


def classificar_console_switch2(nome):
    n = _console_base(nome, _SWITCH2)
    if not n or re.search(r'playstation|\bps\s?[45]\b|xbox', n, re.I):
        return None
    return {'modelo': 'Switch 2', 'marca': 'Nintendo', 'original': True, 'kit': _kit(n), 'edicao': ''}


_STEAM = re.compile(r'steam\s*deck|steam\s*machine', re.I)


def classificar_console_steam(nome):
    """Valve: Steam Deck (portátil, LCD e OLED) e Steam Machine (o "cubinho" de mesa)."""
    n = _console_base(nome, _STEAM)
    if not n or re.search(r'\bdock(?:ing)?\b|\bcase\b|\bcapa\b|pel[ií]cula|\bgrip\b|carregador|\bskin\b|suporte|cart[aã]o|gift|controller|controle', n, re.I):
        return None
    m = re.search(r'\b(64|256|512)\s?gb\b|\b(1|2)\s?tb\b', n, re.I)
    arm = (' ' + m.group(1) + 'GB') if m and m.group(1) else (' ' + m.group(2) + 'TB') if m else ''
    if re.search(r'steam\s*machine', n, re.I):
        modelo = 'Steam Machine' + arm
    else:
        modelo = ('Steam Deck OLED' if re.search(r'\boled\b', n, re.I) else 'Steam Deck LCD') + arm
    return {'modelo': modelo, 'marca': 'Valve', 'original': True, 'kit': _kit(n), 'edicao': ''}


# ---------- Controles de PS4, Xbox e Switch ----------
def _controle(nome, plataforma, outros, oficial_re, marca_oficial, modelo_oficial):
    """Controle inteiro e novo da plataforma: oficial (da fabricante do console) ou compatível."""
    n = ' '.join((nome or '').split())
    if not n or RUIM.search(n) or not plataforma.search(n) or not (_CONTROLE.search(n) or re.search(r'joy[\s-]?con|pro\s+controller', n, re.I)):
        return None
    if _ACESSORIO.match(n) or _PECA.search(n) or re.search(r'^\s*console\b|\bconsole\s+(?:xbox|nintendo|playstation)', n, re.I):
        return None
    pos = _CONTROLE.search(n) or re.search(r'joy[\s-]?con|pro\s+controller', n, re.I)
    if _ANTES.search(n[:pos.start()]):
        return None
    if re.search(r'carregador|(?:base|esta[cç][aã]o|dock|suporte)\s+(?:[\wÀ-ú]+\s+){0,2}(?:de\s+)?(?:carga|carregamento)', n, re.I) and '+' not in n:
        return None
    o = outros.search(n)
    if o and o.start() < plataforma.search(n).start():
        return None
    from .pecas import marca as marca_pecas
    # "para Nintendo Switch", "Compatible with…" não fazem o controle ser da Nintendo: tira o nome da plataforma antes
    sem_plat = re.sub(r'\b(?:para|p/|for|with|compat[ií]vel\s+com|compatible\s+with)\s+(?:o\s+|a\s+)?(?:nintendo|microsoft|sony|xbox|playstation|ps\s?[45])\b'
                      r'|\bnintendo\s+switch\b', ' ', n, flags=re.I)
    marca = _marca(n) or marca_pecas(n)
    oficial = bool(oficial_re.search(sem_plat)) and marca in ('', marca_oficial) and not _GENERICO.search(n) \
        and not re.search(r'compat[ií]vel|compatible|tipo\s|estilo\s|similar|gen[eé]rico|\bvinik\b|\boex\b|\bknup\b', n, re.I)
    if oficial:
        marca, modelo = marca_oficial, modelo_oficial(n)
    else:
        marca, modelo = marca or 'Sem marca conhecida', 'Compatível (outra marca)'
    kit = bool(re.search(r'\+\s*(?:base|carregador|jogo|cabo|capa|suporte|bateria)|\bkit\b|\bcombo\b|\bbundle\b', n, re.I))
    return {'modelo': modelo, 'marca': marca, 'original': oficial, 'kit': kit, 'edicao': ''}


def classificar_controle_ps4(nome):
    return _controle(nome, re.compile(r'\bps\s?-?4\b|playstation\s*4|dual\s?shock\s*4', re.I), re.compile(r'xbox|switch|nintendo|dual\s?sense|\bps\s?5\b', re.I),
                     re.compile(r'dual\s?shock|cuh-?zct', re.I), 'Sony', lambda n: 'DualShock 4')


def classificar_controle_xbox(nome):
    return _controle(nome, re.compile(r'xbox', re.I), re.compile(r'playstation|\bps\s?[345]\b|switch|nintendo|dual\s?(?:sense|shock)', re.I),
                     re.compile(r'\bmicrosoft\b|\boriginal\b|\boficial\b|xbox\s+wireless\s+controller|controle\s+(?:sem\s+fio\s+)?xbox\s+(?:series|one|core|elite)|\belite\b', re.I),
                     'Microsoft', lambda n: 'Xbox Elite' if re.search(r'\belite\b', n, re.I) else 'Xbox Wireless')


def classificar_controle_switch(nome):
    # controle de Wii, Wii U, GameCube… (outros consoles da Nintendo) não é de Switch
    if re.search(r'\bwii\b|wii\s?u|game\s?cube|\bn64\b|\b3ds\b', nome or '', re.I) and not re.search(r'switch', nome or '', re.I):
        return None
    return _controle(nome, re.compile(r'switch|nintendo|joy[\s-]?con', re.I), re.compile(r'playstation|\bps\s?[345]\b|xbox|dual\s?(?:sense|shock)', re.I),
                     re.compile(r'\bnintendo\b|joy[\s-]?con|pro\s+controller', re.I), 'Nintendo',
                     lambda n: ('Joy-Con 2' if re.search(r'joy[\s-]?con\s*2', n, re.I) or _SWITCH2.search(n) else 'Joy-Con') if re.search(r'joy[\s-]?con', n, re.I)
                     else ('Pro Controller 2' if _SWITCH2.search(n) else 'Pro Controller'))


# ---------- Outros acessórios (headset, carregador, capa, suporte, cartão, VR…) ----------
_TIPOS_ACESSORIO = [
    # capa/bolsa primeiro: "Bolsa para Switch, Steam Deck e PlayStation Portal" é bolsa
    ('Capa / case', r'\bcapa\b|\bcase\b|estojo|bolsa|mochila|\bskin\b|pel[ií]cula|protetor|faceplate|\btampas?\s+(?:do\s+)?(?:console|ps\s?5|playstation)'),
    ('PlayStation Portal', r'playstation\s+portal|\bportal\s+remote'),
    ('PlayStation VR2', r'\bvr\s?2\b|realidade\s+virtual|[oó]culos\s+vr'),
    ('Leitor de disco', r'leitor\s+de\s+(?:disco|m[ií]dia)|unidade\s+de\s+disco|disc\s+drive'),
    # suporte antes de headset: "Suporte para fone/headset" é suporte
    ('Suporte', r'suporte|\bstand\b|cooler|ventila'),
    ('Headset / fone', r'headset|\bfone\b|\bpulse\b'),
    ('Carregador / base', r'carregador|base\s+(?:de\s+)?carreg|esta[cç][aã]o\s+de\s+carga|\bdock\b|bateria'),
    ('Armazenamento', r'cart[aã]o\s+(?:de\s+(?:mem|expans)|micro\s?sd)|micro\s?sd|\bssd\b|\bhd\s+externo|expans[aã]o\s+de\s+armazen'),
    ('Volante', r'volante'),
    ('Câmera', r'c[aâ]mera'),
    ('Cabo', r'\bcabo\b'),
]
_OFICIAL_ACESS = re.compile(r'\bsony\b|\bmicrosoft\b|\bnintendo\b|\boriginal\b|\boficial\b|\blicenciad|playstation\s+portal|\bpulse\b', re.I)
# o nome da plataforma ("Nintendo Switch", "Sony PlayStation") não indica produto oficial: tira antes de procurar a marca
_NOME_PLATAFORMA = re.compile(r'\bnintendo\s+switch|\bsony\s+playstation|\bmicrosoft\s+xbox|\b(?:para|p/|compat[ií]vel\s+com)\s+(?:o\s+|a\s+)?(?:sony|microsoft|nintendo)', re.I)


def _acessorio(nome, plataforma, outros):
    n = ' '.join((nome or '').split())
    if not n or RUIM.search(n) or not plataforma.search(n):
        return None
    # console, controle e jogo têm cards próprios
    if re.search(r'^\s*(?:console|jogo|game)\b', n, re.I) or re.search(r'^\s*(?:controle|joy[\s-]?con|dual\s?sense|dual\s?shock)\b', n, re.I):
        return None
    o = outros.search(n)
    if o and o.start() < plataforma.search(n).start():
        return None
    tipo = next((t for t, r in _TIPOS_ACESSORIO if re.search(r, n, re.I)), None)
    if not tipo:
        return None
    marca = _marca(_NOME_PLATAFORMA.sub(' ', n))
    oficial = bool(_OFICIAL_ACESS.search(_NOME_PLATAFORMA.sub(' ', n))) and not re.search(r'compat[ií]vel|gen[eé]rico|tipo\s|estilo\s', n, re.I) and marca in ('', 'Sony', 'Microsoft', 'Nintendo', 'Hori')
    if oficial and not marca:
        marca = next((m for m in ('Sony', 'Microsoft', 'Nintendo') if re.search(m, _NOME_PLATAFORMA.sub(' ', n), re.I)), '') or 'Oficial'
    # "original" aqui = produto oficial ou de marca conhecida (headset HyperX, cartão Samsung…); genérico sem marca fica de fora do filtro
    return {'modelo': tipo, 'marca': marca or 'Sem marca conhecida', 'original': bool(oficial or marca), 'kit': False, 'edicao': ''}


def classificar_acessorio_ps(nome):
    return _acessorio(nome, re.compile(r'playstation|\bps\s?[45]\b|dual\s?sense|dual\s?shock', re.I), re.compile(r'xbox|switch|nintendo', re.I))


def classificar_acessorio_xbox(nome):
    return _acessorio(nome, re.compile(r'xbox', re.I), re.compile(r'playstation|\bps\s?[345]\b|switch|nintendo', re.I))


def classificar_acessorio_switch(nome):
    return _acessorio(nome, re.compile(r'switch|nintendo|joy[\s-]?con', re.I), re.compile(r'playstation|\bps\s?[345]\b|xbox', re.I))


ITENS = {
    # Consoles (só aparelhos novos e oficiais; a faixa de preço descarta jogos, capas e peças que citam o console)
    'console-ps5': {'secao': 'games', 'sub': 'consoles', 'nome': 'PlayStation 5', 'grupo': 'modelo',
                    'termos': ['console playstation 5', 'playstation 5 pro', 'ps5 digital'],
                    'classificar': classificar_console_ps5, 'preco_min': 2000, 'preco_max': 12000},
    'console-ps4': {'secao': 'games', 'sub': 'consoles', 'nome': 'PlayStation 4', 'grupo': 'modelo',
                    'termos': ['console playstation 4'],
                    'classificar': classificar_console_ps4, 'preco_min': 1000, 'preco_max': 6000},
    'console-xbox': {'secao': 'games', 'sub': 'consoles', 'nome': 'Xbox', 'grupo': 'modelo',
                     'termos': ['console xbox series x', 'console xbox series s', 'console xbox one x', 'console xbox one s'],
                     'classificar': classificar_console_xbox, 'preco_min': 900, 'preco_max': 12000},
    'console-switch': {'secao': 'games', 'sub': 'consoles', 'nome': 'Nintendo Switch', 'grupo': 'modelo',
                       'termos': ['console nintendo switch', 'nintendo switch oled', 'nintendo switch lite'],
                       'classificar': classificar_console_switch, 'preco_min': 800, 'preco_max': 6000},
    'console-switch2': {'secao': 'games', 'sub': 'consoles', 'nome': 'Nintendo Switch 2', 'grupo': 'modelo',
                        'termos': ['nintendo switch 2'],
                        'classificar': classificar_console_switch2, 'preco_min': 2200, 'preco_max': 9000},
    'console-steam': {'secao': 'games', 'sub': 'consoles', 'nome': 'Steam Deck / Steam Machine', 'grupo': 'modelo',
                      'termos': ['steam deck oled', 'steam deck', 'steam machine valve'],
                      'classificar': classificar_console_steam, 'preco_min': 1800, 'preco_max': 20000},
    # Acessórios
    'controle-ps5': {
        'secao': 'games', 'sub': 'acessorios', 'nome': 'Controles de PS5',
        'termos': ['controle ps5', 'controle dualsense', 'dualsense edge'],
        'classificar': classificar_controle_ps5,
        'preco_min': 60, 'preco_max': 4000,
    },
    'controle-ps4': {'secao': 'games', 'sub': 'acessorios', 'nome': 'Controles de PS4',
                     'termos': ['controle ps4 dualshock 4'],
                     'classificar': classificar_controle_ps4, 'preco_min': 50, 'preco_max': 1500},
    'controle-xbox': {'secao': 'games', 'sub': 'acessorios', 'nome': 'Controles de Xbox',
                      'termos': ['controle xbox series', 'controle xbox elite'],
                      'classificar': classificar_controle_xbox, 'preco_min': 60, 'preco_max': 3000},
    'controle-switch': {'secao': 'games', 'sub': 'acessorios', 'nome': 'Controles de Switch',
                        'termos': ['joy-con nintendo switch', 'controle pro nintendo switch'],
                        'classificar': classificar_controle_switch, 'preco_min': 50, 'preco_max': 2000},
    'acessorio-ps': {'secao': 'games', 'sub': 'acessorios', 'nome': 'Outros acessórios PlayStation', 'grupo': 'modelo',
                     'termos': ['headset ps5', 'base de carregamento dualsense', 'leitor de disco ps5', 'playstation portal'],
                     'classificar': classificar_acessorio_ps, 'preco_min': 20, 'preco_max': 6000},
    'acessorio-xbox': {'secao': 'games', 'sub': 'acessorios', 'nome': 'Outros acessórios Xbox', 'grupo': 'modelo',
                       'termos': ['headset xbox', 'bateria controle xbox', 'cartao de expansao xbox'],
                       'classificar': classificar_acessorio_xbox, 'preco_min': 20, 'preco_max': 4000},
    'acessorio-switch': {'secao': 'games', 'sub': 'acessorios', 'nome': 'Outros acessórios Switch', 'grupo': 'modelo',
                         'termos': ['case nintendo switch', 'dock nintendo switch', 'cartao micro sd switch'],
                         'classificar': classificar_acessorio_switch, 'preco_min': 20, 'preco_max': 3000},
}


# preço mínimo plausível de console NOVO por modelo: abaixo disso é golpe, anúncio importado enganoso ou erro
MIN_MODELO = {'PS5 Pro': 4000, 'PS5 Digital': 2500, 'PS5 Mídia física': 3000, 'PS4 Pro': 1800, 'Xbox Series X': 2800,
              'Xbox Series S': 1800, 'Switch 2': 2800, 'Switch OLED': 1500, 'Switch (padrão)': 1300, 'Switch Lite': 1000,
              'Steam Deck OLED': 2500, 'Steam Deck LCD': 1800, 'Steam Machine': 3000}

# Computadores › Acessórios (peças: SSD, memória, placa-mãe…): mesmos lojas e regras, seção "pecas"
from .pecas import ITENS as _PECAS  # noqa: E402
from .tvs import ITENS as _TVS  # noqa: E402
ITENS.update(_PECAS)
ITENS.update(_TVS)   # Games › TVs


def classificar(item, nome, preco=None):
    """Campos do item para o anúncio (ou None se não for desse item / preço fora da faixa)."""
    cfg = ITENS[item]
    r = cfg['classificar'](nome)
    if r is None:
        return None
    if preco is not None and not (cfg['preco_min'] <= preco <= cfg['preco_max']):
        return None
    # DualSense oficial por menos de R$ 200 é quase sempre anúncio falso, peça ou erro
    if preco is not None and item.startswith('console-'):
        minimo = next((v for k, v in MIN_MODELO.items() if r['modelo'].startswith(k)), 0)
        if preco < minimo:
            return None
    if item == 'controle-ps5' and r.get('original') and preco is not None and preco < 200:
        return None
    return r
