"""Campos derivados (mesmas regras do logica-cupons-dell.md, seção 6).

Tudo é extraído só do texto do anúncio/ficha. Campo que não aparece fica None
(a página mostra "não informado" e a nota usa a média, em amarelo).
"""
import re

PERFIL = {'U': 'Econômico (bateria)', 'G': 'Econômico (bateria)', 'V': 'Eficiência (bateria)',
          'ARM': 'Eficiência (ARM)', 'P': 'Intermediário', 'H': 'Desempenho', 'HS': 'Desempenho',
          'HX': 'Alto desempenho', 'APL': 'Eficiência (Apple)', 'APLP': 'Desempenho (Apple Pro)',
          'APLM': 'Alto desempenho (Apple Max)', 'D': 'Desktop', 'DK': 'Desktop alto desempenho', 'T': 'Desktop econômico'}
SEM_TELA = ('Desktop', 'Mini PC')


def _limpo(t):
    t = (t or '').replace('™', ' ').replace('®', ' ').replace(' ', ' ')
    t = re.sub(r'\((?:R|TM)\)', ' ', t, flags=re.I)
    t = re.sub(r'\((?:s[ée]rie|series)\s*\d\)', ' ', t, flags=re.I)
    return re.sub(r'\s+', ' ', t)


def _sufixo(letras):
    letras = (letras or '').upper()
    for s in ('HX', 'HS', 'H', 'U', 'G', 'V', 'P'):
        if letras.startswith(s):
            return s
    return None


def cpu(texto):
    t = _limpo(texto)
    r = dict(cpuModelo=None, cpuFamilia=None, cpuSufixo=None, cpuGeracao=None)
    if re.search(r'apple|mac\s?book|\bimac\b|mac\s*mini|mac\s*studio|chip\s*M[1-5]', t, re.I):
        m = re.search(r'\bM([1-5])(?![\.\d])\s*(Pro|Max|Ultra)?\b', t)
        if m:
            g, v = int(m.group(1)), (m.group(2) or '').capitalize()
            return dict(cpuModelo=f'Apple M{g}{" " + v if v else ""}', cpuFamilia=f'Apple M{g}',
                        cpuSufixo={'Pro': 'APLP', 'Max': 'APLM', 'Ultra': 'APLM'}.get(v, 'APL'),
                        cpuGeracao='recente' if g >= 4 else 'anterior' if g >= 2 else 'antiga')
    m = re.search(r'\bA(1[6-9])\s*(Pro)?\b', t) if re.search(r'apple|mac\s?book', t, re.I) else None
    if m:  # chips A (ex.: MacBook Neo com A18 Pro)
        return dict(cpuModelo=f'Apple A{m.group(1)}{" Pro" if m.group(2) else ""}', cpuFamilia='Apple A', cpuSufixo='APL',
                    cpuGeracao='recente' if int(m.group(1)) >= 18 else 'anterior')
    m = re.search(r'Ryzen\s*AI\s*(?:MAX\+?\s*)?([3579])\s*(?:PRO\s*)?(HX|HS)?\s*(\d{3})\b', t, re.I)
    if m:
        suf = (m.group(2) or 'U').upper()
        return dict(cpuModelo=f'Ryzen AI {m.group(1)} {(m.group(2) or "").upper() + " " if m.group(2) else ""}{m.group(3)}'.replace('  ', ' '),
                    cpuFamilia='Ryzen ' + m.group(1), cpuSufixo=suf, cpuGeracao='recente')
    m = re.search(r'\b(?:Intel\s*)?(?:Core\s*i3[\s\-]*)?N(\d{2,3})\b', t)
    if m and re.search(r'intel|\bN(50|95|97|100|150|200|250|300|305|355)\b', t, re.I):
        return dict(cpuModelo=f'Intel N{m.group(1)}', cpuFamilia='Intel N', cpuSufixo='U', cpuGeracao='recente')
    for pad, fam in ((r'Celeron', 'Celeron'), (r'Pentium', 'Pentium'), (r'Athlon', 'Athlon'), (r'MediaTek|Kompanio', 'MediaTek')):
        if re.search(pad, t, re.I) and not re.search(r'Core\s*i\d|Ryzen|Core\s*Ultra', t, re.I):
            return dict(cpuModelo=fam, cpuFamilia=fam, cpuSufixo='U', cpuGeracao='antiga' if fam != 'MediaTek' else 'recente')
    m = re.search(r'Snapdragon\s*(?:®\s*)?X\s*(Elite|Plus)', t, re.I)
    if m:
        fam = 'Snapdragon X ' + m.group(1).capitalize()
        return dict(cpuModelo=fam, cpuFamilia=fam, cpuSufixo='ARM', cpuGeracao='recente')
    m = re.search(r'Core\s*Ultra\s*([579])\s*(?:processador\s*|processor\s*)?(\d{3})\s?([A-Z]{0,2})\b', t, re.I)
    if m:
        letras = (m.group(3) or '').upper()
        suf = _sufixo(letras)
        return dict(cpuModelo=f'Core Ultra {m.group(1)} {m.group(2)}{letras}', cpuFamilia='Core Ultra ' + m.group(1),
                    cpuSufixo=suf, cpuGeracao='recente', _letras=letras, _ger=99, _intel=True)
    m = re.search(r'Core\s*Ultra\s*([579])\b', t, re.I)
    if m:
        return dict(cpuModelo=None, cpuFamilia='Core Ultra ' + m.group(1), cpuSufixo=None, cpuGeracao='recente')
    m = re.search(r'Core\s*i([357])[\s\-]*([12]\d{2})\s?([A-Z]{1,2})\b', t, re.I)
    if m:  # anúncio que escreve "i7-150U" para o Core 7 150U (série 1)
        suf = _sufixo(m.group(3))
        return dict(cpuModelo=f'Core {m.group(1)} {m.group(2)}{suf or ""}', cpuFamilia='Core ' + m.group(1),
                    cpuSufixo=suf, cpuGeracao='recente')
    m = re.search(r'(?:Core\s*)?\bi([3579])[\s\-]*(\d{4,5})\s?([A-Z]{0,2})\d?\b', t, re.I)
    if m:
        num, letras = m.group(2), (m.group(3) or '').upper()
        suf = _sufixo(letras)
        if len(num) == 5 or (num[0] == '1' and num[1] in '01234'):
            ger = int(num[:2])
        else:
            ger = int(num[0])
        return dict(cpuModelo=f'Core i{m.group(1)}-{num}{letras}', cpuFamilia='Core i' + m.group(1), cpuSufixo=suf,
                    cpuGeracao='13ª ger. Intel' if ger >= 13 else 'antiga', _letras=letras, _ger=ger, _intel=True)
    m = re.search(r'(?:Core\s*)?\bi([3579])\s*(1[0-4]|[2-9])\s*[ªº]', t, re.I)
    if m:  # "i3 9ª", "i5 12º"
        ger = int(m.group(2))
        return dict(cpuModelo=f'Core i{m.group(1)} ({ger}ª geração)', cpuFamilia='Core i' + m.group(1), cpuSufixo=None,
                    cpuGeracao='13ª ger. Intel' if ger >= 13 else 'antiga', _letras='', _ger=ger, _intel=True)
    m = re.search(r'Core\s*i([3579])\b', t, re.I)
    if m:
        g = re.search(r'\b(1[0-4]|[4-9])\s*(?:ª|a|º|th)?\s*(?:gera[cç][aã]o|gen)', t, re.I)
        ger = None if not g else ('13ª ger. Intel' if int(g.group(1)) >= 13 else 'antiga')
        return dict(cpuModelo=f'Core i{m.group(1)} (modelo exato não informado)', cpuFamilia='Core i' + m.group(1),
                    cpuSufixo=None, cpuGeracao=ger)
    m = re.search(r'Core\s*([357])\s*(?:processor\s*|processador\s*)?([123]\d{2})\s?([A-Z]{0,2})\b', t, re.I)
    if m:
        suf = _sufixo(m.group(3))
        return dict(cpuModelo=f'Core {m.group(1)} {m.group(2)}{suf or ""}', cpuFamilia='Core ' + m.group(1),
                    cpuSufixo=suf, cpuGeracao='recente')
    m = re.search(r'Core\s*([357])\b(?![\.,]\d)', t, re.I)
    if m:
        return dict(cpuModelo=None, cpuFamilia='Core ' + m.group(1), cpuSufixo=None, cpuGeracao='recente')
    m = re.search(r'Ryzen\s*(AI\s*)?([3579])[\s\-]*(PRO\s*)?(\d{3,4})?\s?(X3D|[A-Z]{0,2})\b', t, re.I)
    if m:
        ai, n, pro, numero = m.group(1), m.group(2), m.group(3), m.group(4)
        letras = (m.group(5) or '').upper() if numero else ''
        suf = _sufixo(letras) if numero else None
        if ai or (numero and (len(numero) == 3 or int(numero) >= 7000)):
            ger = 'recente'
        elif numero:
            ger = 'antiga'
        else:
            ger = None
        modelo = f'Ryzen {"AI " if ai else ""}{n} {"PRO " if pro else ""}{numero}{letras}' if numero else None
        return dict(cpuModelo=modelo, cpuFamilia='Ryzen ' + n, cpuSufixo=suf, cpuGeracao=ger, _letras=letras,
                    _ger=int(numero[0]) if numero and len(numero) == 4 else (9 if numero else None), _intel=False)
    return r


def gpu(texto):
    t = _limpo(texto)
    m = re.search(r'RTX\s*PRO\s*(\d{3,4})', t, re.I)
    if m:
        return 'RTX PRO ' + m.group(1), True
    m = re.search(r'RTX\s*(\d{4})\s*(Ti\s*Super|Ti|Super)?', t, re.I)
    if m:
        extra = {'ti': ' Ti', 'super': ' Super'}.get(re.sub(r'\s+', ' ', (m.group(2) or '').lower()), ' Ti Super' if m.group(2) else '')
        return 'RTX ' + m.group(1) + extra, True
    m = re.search(r'GTX\s*(\d{3,4})\s*(Ti|Super)?', t, re.I)
    if m:
        return 'GTX ' + m.group(1) + (' ' + m.group(2).capitalize() if m.group(2) else ''), True
    m = re.search(r'\bRX\s*(\d{4})\s*(XTX|XT|GRE)?', t, re.I)
    if m:
        return 'RX ' + m.group(1) + (' ' + m.group(2).upper() if m.group(2) else ''), True
    m = re.search(r'\bArc\s*([AB]\d{3})', t, re.I)
    if m:
        return 'Arc ' + m.group(1).upper(), True
    if re.search(r'\b(Placa\s*gr[aá]fica\s*(Intel|AMD)|(Intel|AMD)\s*Graphics|On-?Board|UHD|Iris|Intel\s*Arc|Arc\s*(Graphics|gráficos)|Radeon\s*(Graphics|\d{3}M|Vega)|Adreno|Gr[aá]ficos?\s*(Intel|AMD|integrad)|integrad[ao])', t, re.I):
        return 'Integrada', False
    if re.search(r'dedicad[ao]|GeForce|NVIDIA', t, re.I):
        return 'Dedicada (modelo não informado)', True
    return None, None


def tela(texto):
    t = _limpo(texto)
    w = rot = None
    m = re.search(r'(\d{4})\s*[xX×]\s*(\d{3,4})', t)
    if m and 1200 <= int(m.group(1)) <= 4000:
        w, rot = int(m.group(1)), f'{m.group(1)} x {m.group(2)}'
    else:
        for pad, ww, rr in [(r'\b4K\b|\bUHD\+?(?!\s*Graphics)', 3840, '4K'), (r'\b3\.?2K\b|\b3K\b|\b2[\.,]8K\b', 2880, '3K'),
                            (r'QHD\+?|\b2[\.,]5K\b|WQXGA', 2560, 'QHD/2.5K'), (r'WUXGA|FHD\+|Full\s*HD\+', 1920, 'FHD+/WUXGA'),
                            (r'Full\s*HD|\bFHD\b|1080p', 1920, 'Full HD'), (r'\bHD\b', 1366, 'HD')]:
            if re.search(pad, t, re.I):
                w, rot = ww, rr
                break
    hz = [int(x) for x in re.findall(r'(\d{2,3})\s*Hz', t, re.I) if 50 <= int(x) <= 500]
    pol = None
    m = re.search(r'(1[0-8])[\.,](\d)\s*(?:"|”|\'\'|pol|polegadas|\s*")', t, re.I) or re.search(r'\b(1[0-8])\s*(?:"|”|pol|polegadas)', t, re.I)
    if m:
        pol = m.group(1) + ('.' + m.group(2) if m.lastindex and m.lastindex >= 2 and m.group(2) else '')
    return dict(telaResW=w, telaRes=rot, telaHz=max(hz) if hz else None, telaOled=bool(re.search(r'OLED', t, re.I)), telaPol=pol)


def peso(texto):
    for m in re.finditer(r'(\d[\.,]\d{1,3})\s*kg', _limpo(texto), re.I):
        v = float(m.group(1).replace(',', '.'))
        if 0.7 <= v <= 5:
            return v
    return None


def ram(texto):
    t = _limpo(texto)
    # armazenamento é sempre ≥128 GB, então o primeiro "N GB" com N de memória é a RAM
    for pad in [r'(\d{1,2})\s*GB\s*(?:de\s*)?(?:RAM|DDR|LPDDR|mem)', r'(?:RAM|Mem[oó]ria)\s*(?:de\s*)?(\d{1,2})\s*GB',
                r'\b(4|8|12|16|24|32|64)\s*gb\b']:
        m = re.search(pad, t, re.I)
        if m and int(m.group(1)) in (4, 8, 12, 16, 18, 24, 32, 36, 48, 64):
            return int(m.group(1))
    return None


def armaz(texto):
    t = _limpo(texto)
    m = re.search(r'(\d)\s*TB', t, re.I)
    if m:
        return int(m.group(1)) * 1000
    m = re.search(r'\b(120|128|240|250|256|480|500|512|960|1000)\s*GB', t, re.I)
    return int(m.group(1)) if m else None


def linha(nome):
    for pad, l in [(r'Alienware', 'Alienware'), (r'\bXPS\b', 'XPS'), (r'Latitude|\bLAT\b', 'Latitude'), (r'Inspiron', 'Inspiron'),
                   (r'Vostro', 'Vostro'), (r'Precision', 'Precision'), (r'Pro\s*Max', 'Dell Pro Max'),
                   (r'Pro\s*Premium', 'Dell Pro Premium'), (r'Pro\s*Essential', 'Dell Pro Essential'),
                   (r'Dell\s*Pro\b', 'Dell Pro'), (r'\bG1[56]\b', 'Dell G')]:
        if re.search(pad, nome or '', re.I):
            return l
    return 'Dell (14/15/16)'


def sistema(texto):
    t = _limpo(texto)
    m = re.search(r'Windows\s*11\s*(Pro|Home)?', t, re.I)
    if m:
        return 'Windows 11' + (' ' + m.group(1).capitalize() if m.group(1) else '')
    if re.search(r'Ubuntu', t, re.I):
        return 'Ubuntu Linux'
    if re.search(r'Linux', t, re.I):
        return 'Linux'
    return ''


def _campos(specs, *chaves, fora=()):
    """Junta os valores das specs cujo nome contém alguma das chaves."""
    out = []
    for k, v in specs.items():
        kl = k.lower()
        if any(c in kl for c in chaves) and not any(f in kl for f in fora):
            out.append(str(v))
    return ' | '.join(out)


def _ram_specs(t):
    m = re.search(r'(\d{1,2})\s*GB', t, re.I) or re.fullmatch(r'\s*(\d{1,2})(?:\.0)?\s*', t or '')
    if m and int(m.group(1)) in (4, 8, 12, 16, 18, 24, 32, 36, 48, 64):
        return int(m.group(1))
    return None


def _desktop(c, tipo_):
    """Ajusta sufixo/geração para processadores de mesa (sem sufixo, F, K, KF, X, X3D, G, T)."""
    letras = c.get('_letras')
    if tipo_ not in ('Desktop', 'Mini PC', 'All-in-one', 'Mac') or letras is None or c.get('cpuFamilia', '').startswith('Apple'):
        return c
    if letras in ('U', 'H', 'HS', 'HX', 'V', 'P') or (letras == 'G' and c.get('_intel')):
        return c  # chip de notebook usado em mini PC / all-in-one
    c['cpuSufixo'] = 'DK' if letras in ('K', 'KF', 'KS', 'X', 'X3D', 'XT') else 'T' if letras == 'T' else 'D'
    g = c.get('_ger')
    if c.get('_intel') and g and g < 99:
        c['cpuGeracao'] = 'anterior' if g >= 12 else 'antiga'
    elif not c.get('_intel') and g:
        c['cpuGeracao'] = 'recente' if g >= 7 else 'anterior' if g == 5 else 'antiga'
    return c


def enriquecer(n):
    """Preenche campos derivados que estiverem vazios em n (não sobrescreve dados conferidos)."""
    from .classifica import linha as linha_marca, marca as marca_de, tem_tela, tipo as tipo_de
    specs = n.get('specs') or {}
    nome = n.get('nome', '')
    if not n.get('tipo'):
        n['tipo'] = tipo_de(nome) or 'Notebook'
    if not n.get('marca'):
        n['marca'] = marca_de(nome, specs.get('Marca', ''))
    if n.get('temTela') is None:
        n['temTela'] = tem_tela(n['tipo'], nome)
    texto = ' | '.join([nome] + [f'{k}: {v}' for k, v in specs.items()])
    c = cpu(_campos(specs, 'process', fora=('velocidade', 'geração do')))
    if not c['cpuModelo'] or 'não informado' in c['cpuModelo']:
        c2 = cpu(nome)  # o título costuma trazer o modelo exato (ex.: i7-1355U)
        if c2['cpuModelo'] and 'não informado' not in c2['cpuModelo'] or not c['cpuFamilia']:
            c = c2 if c2['cpuFamilia'] else c
    if not c['cpuFamilia']:
        c = cpu(texto)
    c = _desktop(c, n['tipo'])
    for k, v in c.items():
        if not k.startswith('_') and n.get(k) is None:
            n[k] = v
    if not n.get('cpuPerfil') or n['cpuPerfil'] == 'Não informado':
        n['cpuPerfil'] = PERFIL.get(n.get('cpuSufixo'), 'Não informado')
    if n.get('gpuModelo') is None and n.get('gpuDedicada') is None:
        g = gpu(_campos(specs, 'gráfic', 'grafic', 'vídeo', 'video'))
        if g[0] is None or g[0].startswith('Dedicada'):
            g2 = gpu(nome)
            g = g2 if g2[0] else g
        n['gpuModelo'], n['gpuDedicada'] = g
    fam = n.get('cpuFamilia') or ''
    if fam.startswith('Apple') and not (n.get('gpuModelo') or '').startswith('Apple'):
        n['gpuModelo'] = {'APLP': 'Apple M Pro', 'APLM': 'Apple M Max'}.get(n.get('cpuSufixo'), 'Apple M (integrada)')
        n['gpuDedicada'] = False
    if not n['temTela']:  # PC de mesa / mini PC: tela e peso não se aplicam
        for k in ('telaResW', 'telaRes', 'telaHz', 'pesoKg'):
            n.setdefault(k, None)
        n.setdefault('telaOled', False)
        n.setdefault('telaPol', '')
        return _fim(n, nome, texto, specs, linha_marca)
    tl = tela(_campos(specs, 'tela', 'display', 'resolu') + ' | ' + nome)
    for k in ('telaResW', 'telaRes', 'telaHz'):
        if n.get(k) is None:
            n[k] = tl[k]
    if n.get('telaOled') is None:
        n['telaOled'] = tl['telaOled']
    if not n.get('telaPol'):
        n['telaPol'] = tl['telaPol'] or ''
    if n.get('pesoKg') is None:
        n['pesoKg'] = peso(texto)
    return _fim(n, nome, texto, specs, linha_marca)


def _fim(n, nome, texto, specs, linha_marca):
    if not n.get('ramGB'):
        n['ramGB'] = _ram_specs(_campos(specs, 'mem', fora=('expans', 'slot', 'cache', 'vídeo', 'video'))) or ram(nome)
    if not n.get('armazGB'):
        n['armazGB'] = armaz(_campos(specs, 'armaz', fora=('tecnologia',)) + ' | ' + nome)
    if not n.get('armazenamento') and n.get('armazGB'):
        n['armazenamento'] = f"{n['armazGB'] // 1000} TB" if n['armazGB'] >= 1000 else f"{n['armazGB']} GB"
    if not n.get('linha'):
        n['linha'] = linha_marca(nome, n.get('marca'))
    if not n.get('sistema'):
        n['sistema'] = sistema(texto)
    if not n.get('procFamilia'):
        f = n.get('cpuFamilia')
        n['procFamilia'] = ('Intel ' + f if f.startswith('Core') else 'AMD ' + f if f.startswith('Ryzen') else f) if f else 'Não informado'
    if not n.get('placaVideo'):
        g = n.get('gpuModelo')
        n['placaVideo'] = ('NVIDIA ' + g if g and g.startswith(('RTX', 'GTX')) else 'AMD Radeon ' + g if g and g.startswith('RX') else
                           'Intel ' + g if g and g.startswith('Arc') else g) or 'Não informado'
    return n
