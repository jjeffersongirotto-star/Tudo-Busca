"""Tipo de computador, marca e linha a partir do título do anúncio (qualquer marca)."""
import re

TIPOS = ['Notebook', 'MacBook', 'Desktop', 'All-in-one', 'Mini PC', 'Mac']

# O título precisa começar pelo tipo (com uma marca opcional antes). Isso deixa de fora peças e acessórios.
_INICIO = re.compile(
    r'^\s*(?:(?:novo|nova|kit|apple|dell|lenovo|hp|acer|asus|samsung|positivo|vaio|msi|multilaser|avell|gigabyte|microsoft|lg|'
    r'huawei|xiaomi|alienware|gamer|compaq|philco|intel)\s+){0,2}(notebook|laptop|ultrabook|chromebook|netbook|macbook|imac|mac\s*mini|mac\s*studio|mac\s*pro|'
    r'computador|pc\b|desktop|cpu\b|workstation|esta[cç][aã]o\s+de\s+trabalho|mini\s*pc|all[\s\-]*in[\s\-]*one|aio\b|tudo\s+em\s+um)',
    re.I)
_RUIM = re.compile(r'usad|recondicion|seminov|vitrine|open\s*box|outlet|refurb|reembalad|\bvitrine\b|para\s+notebook|p/\s*notebook|'
                   r'\bcapa\b|mochila|suporte|pel[ií]cula|carregador|maleta|\bbolsa\b|\bcase\s+para|mesa\s+para|base\s+para|'
                   r'^\s*cpu\s+cooler|adaptador|\bcabo\b|\bskin\b|adesivo|teclado\s+para|bateria\s+para|tela\s+para|'
                   r'\bpe[cç]as?\b|placa[\s\-]m[aã]e\s+para|carca[cç]a', re.I)


def tipo(nome):
    """Tipo do produto ou None se não for um computador (acessório, peça, usado…)."""
    nome = nome or ''
    if _RUIM.search(nome):
        return None
    m = _INICIO.search(nome)
    if not m:
        return None
    t = nome.lower()
    if re.search(r'macbook', t):
        return 'MacBook'
    if re.search(r'\bimac\b|mac\s*mini|mac\s*studio|mac\s*pro\b', t):
        return 'Mac'
    if re.search(r'all[\s\-]*in[\s\-]*one|\baio\b|tudo\s+em\s+um', t):
        return 'All-in-one'
    if re.search(r'mini\s*pc|mini\s*computador|\bnuc\b|mini\s*desktop', t):
        return 'Mini PC'
    if re.search(r'notebook|laptop|ultrabook|chromebook|netbook|2\s*em\s*1', t):
        return 'Notebook'
    return 'Desktop'


def tem_tela(tipo_, nome=''):
    if tipo_ in ('Notebook', 'MacBook', 'All-in-one'):
        return True
    if tipo_ == 'Mac':
        return bool(re.search(r'\bimac\b', nome or '', re.I))
    return False


MARCAS = [
    (r'\bapple\b|macbook|\bimac\b|mac\s*mini|mac\s*studio', 'Apple'), (r'\bdell\b|alienware|inspiron|latitude|vostro|\bxps\b|optiplex', 'Dell'),
    (r'lenovo|ideapad|thinkpad|thinkbook|thinkcentre|legion|\bloq\b|\byoga\b', 'Lenovo'),
    (r'\bhp\b|hewlett|pavilion|victus|\bomen\b|elitebook|probook|elitedesk|prodesk', 'HP'),
    (r'\bacer\b|aspire|nitro|predator|\bswift\b', 'Acer'), (r'\basus\b|vivobook|zenbook|\brog\b|\btuf\b|expertbook', 'Asus'),
    (r'samsung|galaxy\s*book', 'Samsung'), (r'positivo', 'Positivo'), (r'\bvaio\b', 'Vaio'), (r'\bmsi\b', 'MSI'),
    (r'multilaser|\bultra\s+u[ld]', 'Multilaser'), (r'\bavell\b', 'Avell'), (r'gigabyte|aorus', 'Gigabyte'),
    (r'microsoft|surface', 'Microsoft'), (r'\blg\b|gram\b', 'LG'), (r'huawei|matebook', 'Huawei'), (r'xiaomi|redmibook', 'Xiaomi'),
    (r'compaq', 'Compaq'), (r'philco', 'Philco'), (r'pichau', 'Pichau'), (r'mancer', 'Mancer'), (r'3green', '3green'),
    (r'beelink', 'Beelink'), (r'minisforum', 'Minisforum'), (r'\bdaten\b', 'Daten'),
    (r'login\b', 'Login'), (r'bringit', 'BRX'), (r'\bbrx\b', 'BRX'), (r'neologic', 'Neologic'), (r'\bskill\b', 'Skill'),
]


def marca(nome, marca_loja=''):
    t = (nome or '') + ' '
    for pad, m in MARCAS:
        if re.search(pad, t, re.I):
            return m
    ml = (marca_loja or '').strip()
    # marca do processador/placa (AMD, Intel, NVIDIA) não é a marca do computador
    if ml and not re.search(r'gen[ée]ric|sem\s*marca|outr|^\s*(amd|intel|nvidia|ryzen|geforce)\s*$', ml, re.I) and len(ml) < 30:
        return ml.title() if ml.isupper() or ml.islower() else ml
    return 'Outras / montado'


_LINHAS = [
    ('Dell', [(r'Alienware', 'Alienware'), (r'\bXPS\b', 'XPS'), (r'Latitude|\bLAT\b', 'Latitude'), (r'Inspiron', 'Inspiron'),
              (r'Vostro', 'Vostro'), (r'Precision', 'Precision'), (r'OptiPlex', 'OptiPlex'), (r'Pro\s*Max', 'Dell Pro Max'),
              (r'Pro\s*Premium', 'Dell Pro Premium'), (r'Pro\s*Essential', 'Dell Pro Essential'), (r'Dell\s*Pro\b', 'Dell Pro'),
              (r'\bG1[56]\b', 'Dell G')]),
    ('Lenovo', [(r'ThinkPad', 'ThinkPad'), (r'ThinkBook', 'ThinkBook'), (r'ThinkCentre', 'ThinkCentre'), (r'Legion', 'Legion'),
                (r'\bLOQ\b', 'LOQ'), (r'Yoga', 'Yoga'), (r'IdeaCentre', 'IdeaCentre'), (r'IdeaPad\s*Gaming', 'IdeaPad Gaming'),
                (r'IdeaPad', 'IdeaPad'), (r'V1[45]\b', 'Lenovo V')]),
    ('HP', [(r'Omen', 'Omen'), (r'Victus', 'Victus'), (r'Pavilion', 'Pavilion'), (r'EliteBook', 'EliteBook'), (r'ProBook', 'ProBook'),
            (r'Envy', 'Envy'), (r'Spectre', 'Spectre'), (r'EliteDesk', 'EliteDesk'), (r'ProDesk', 'ProDesk'), (r'\b2[45]6\b|\b15[\-\s]?f', 'HP 250/256')]),
    ('Acer', [(r'Predator', 'Predator'), (r'Nitro', 'Nitro'), (r'Swift', 'Swift'), (r'Aspire\s*Go', 'Aspire Go'), (r'Aspire', 'Aspire'),
              (r'Extensa', 'Extensa'), (r'TravelMate', 'TravelMate'), (r'Chromebook', 'Chromebook')]),
    ('Asus', [(r'\bROG\b', 'ROG'), (r'\bTUF\b', 'TUF'), (r'Zenbook', 'Zenbook'), (r'Vivobook', 'Vivobook'), (r'ExpertBook', 'ExpertBook')]),
    ('Samsung', [(r'Galaxy\s*Book\s*\d?\s*(Pro|Ultra|360|Edge)?', 'Galaxy Book'), (r'Chromebook', 'Chromebook')]),
    ('Apple', [(r'MacBook\s*Air', 'MacBook Air'), (r'MacBook\s*Pro', 'MacBook Pro'), (r'\biMac\b', 'iMac'), (r'Mac\s*mini', 'Mac mini'),
               (r'Mac\s*Studio', 'Mac Studio')]),
    ('Positivo', [(r'Vision', 'Positivo Vision'), (r'Motion', 'Positivo Motion'), (r'Duo', 'Positivo Duo'), (r'Master', 'Positivo Master')]),
    ('Vaio', [(r'\bFE\s*1[456]', 'Vaio FE'), (r'\bFH\s*1[456]', 'Vaio FH')]),
    ('MSI', [(r'Katana', 'Katana'), (r'Cyborg', 'Cyborg'), (r'Thin', 'Thin'), (r'Modern', 'Modern'), (r'Prestige', 'Prestige')]),
]


def linha(nome, marca_):
    for m, regras in _LINHAS:
        if m == marca_:
            for pad, l in regras:
                if re.search(pad, nome or '', re.I):
                    return l
            return 'Dell (14/15/16)' if m == 'Dell' else marca_
    return marca_ or 'Outras'
