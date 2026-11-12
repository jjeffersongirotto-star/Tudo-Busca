"""Catálogo de seções (cards da página) e classificação dos produtos que não são computadores.

Estrutura (a mesma usada pela página, em SECOES do cupons-dell.html):
  seção (card)          → sub-card              → item (tipo de acessório, etc.)
  computadores          → (computadores atuais)
  games                 → consoles (em breve)
                        → acessorios            → controle-ps5

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
                   'Witsurge', 'Mobapad', 'Easysmx', 'Exbom', 'Feir', 'Elg', 'Dobe', 'Kontrolfreek', 'Machenike', 'Gulikit']
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


ITENS = {
    'controle-ps5': {
        'secao': 'games', 'sub': 'acessorios', 'nome': 'Controles de PS5',
        'termos': ['controle ps5', 'controle dualsense', 'dualsense edge'],
        'classificar': classificar_controle_ps5,
        'preco_min': 60, 'preco_max': 4000,
    },
}


def classificar(item, nome, preco=None):
    """Campos do item para o anúncio (ou None se não for desse item / preço fora da faixa)."""
    cfg = ITENS[item]
    r = cfg['classificar'](nome)
    if r is None:
        return None
    if preco is not None and not (cfg['preco_min'] <= preco <= cfg['preco_max']):
        return None
    # DualSense oficial por menos de R$ 200 é quase sempre anúncio falso, peça ou erro
    if r.get('original') and preco is not None and preco < 200:
        return None
    return r
