"""Banco de dados de produtos: tudo o que já foi descoberto de cada computador.

- Cada coleta ENSINA o banco: os dados conhecidos de cada produto são guardados (dado novo atualiza o antigo).
- Cada coleta CONSULTA o banco: o que falta num anúncio é preenchido com o que o banco já sabe,
  primeiro pelo mesmo produto (id) e depois pelo mesmo modelo em qualquer loja (código do modelo).
- O que não estiver nem no anúncio nem no banco fica vazio; a página usa o valor típico da categoria (em amarelo).

Arquivo JSON: {"produtos": {id: {...}}, "modelos": {codigo: {...}}}
"""
import json
import re
from pathlib import Path

# Campos de hardware que o banco guarda e completa
CAMPOS = ['tipo', 'marca', 'linha', 'temTela', 'cpuModelo', 'cpuFamilia', 'cpuSufixo', 'cpuGeracao', 'cpuPerfil',
          'gpuModelo', 'gpuDedicada', 'ramGB', 'armazGB', 'armazenamento', 'telaResW', 'telaRes', 'telaHz', 'telaOled',
          'telaPol', 'pesoKg', 'sistema', 'procFamilia', 'placaVideo', 'imagem']
VAZIO = (None, '', 'Não informado', 'não informado')
NOMES = {'cpuModelo': 'processador', 'cpuFamilia': 'processador', 'cpuSufixo': 'perfil do processador',
         'cpuGeracao': 'geração do processador', 'gpuModelo': 'placa de vídeo', 'ramGB': 'RAM', 'armazGB': 'armazenamento',
         'telaResW': 'resolução da tela', 'telaHz': 'taxa da tela', 'telaPol': 'tamanho da tela', 'pesoKg': 'peso',
         'sistema': 'sistema', 'imagem': 'foto'}


def _vazio(v):
    return v in VAZIO or (isinstance(v, str) and 'não informado' in v.lower())


def codigo_modelo(n):
    """Código do fabricante no título/ficha (ex.: 83MMS00300, DC15-I51334U-M50, G614JU-N3367). Mesmo código = mesmo computador."""
    texto = ' '.join([n.get('nome', ''), str(n.get('modelo') or '')] + [str(v) for k, v in (n.get('specs') or {}).items()
                                                                          if re.search(r'modelo|refer|c[oó]digo|part', k, re.I)])
    achados = []
    for m in re.finditer(r'\b([A-Z0-9]{6,9}/A\b|[A-Z0-9]{2,}(?:[\-/][A-Z0-9]{2,}){1,4}|[0-9]{2}[A-Z]{2,4}[0-9A-Z]{4,8}|[A-Z]{1,3}[0-9]{3,}[A-Z0-9]{2,})\b', texto.upper()):
        c = m.group(1)
        # descarta medidas, memórias e nomes genéricos ("16GB", "RTX4050", "DDR5", "1920X1080", "I5-1334U")
        if re.fullmatch(r'\d+(GB|TB|MB|HZ|W|MHZ|GHZ|MP|NITS)|DDR\d.*|RTX\d+|GTX\d+|RX\d+|\d{3,4}X\d{3,4}|I[3579]-\d+[A-Z]*|R[3579]-\d+[A-Z]*|WIFI\d.*', c):
            continue
        if len(re.sub(r'[\-/]', '', c)) >= 7 and re.search(r'\d', c) and re.search(r'[A-Z]', c):
            achados.append(c)
    return max(achados, key=len) if achados else ''


class Banco:
    def __init__(self, caminho, semente=None):
        self.caminho = Path(caminho)
        self.d = {'produtos': {}, 'modelos': {}}
        for p in (self.caminho, Path(semente) if semente else None):
            if p and p.exists():
                try:
                    self.d = json.loads(p.read_text(encoding='utf-8'))
                    break
                except ValueError:
                    pass
        self.d.setdefault('produtos', {})
        self.d.setdefault('modelos', {})

    def completar(self, n):
        """Preenche campos vazios de n com o banco. Retorna a lista (legível) do que foi completado."""
        fontes = [self.d['produtos'].get(n['id'], {})]
        cod = codigo_modelo(n)
        if cod:
            fontes.append(self.d['modelos'].get(cod, {}))
        usados = []
        for k in CAMPOS:
            if not _vazio(n.get(k)):
                continue
            for f in fontes:
                if not _vazio(f.get(k)):
                    n[k] = f[k]
                    if k in NOMES and NOMES[k] not in usados:
                        usados.append(NOMES[k])
                    break
        if usados:
            n['doBanco'] = usados
        else:
            n.pop('doBanco', None)
        return usados

    def aprender(self, n, data, modelos=True):
        """Guarda o que se sabe de n (dado novo substitui o antigo; vazio não apaga nada).
        modelos=False: só guarda o produto e o histórico de preço (usado para o que não é computador)."""
        conhecido = {k: n[k] for k in CAMPOS if not _vazio(n.get(k)) and k not in (n.get('_estimados') or [])}
        reg = self.d['produtos'].setdefault(n['id'], {})
        reg.update(conhecido)
        reg['nome'] = n.get('nome', reg.get('nome', ''))
        reg['loja'] = n.get('loja', reg.get('loja', ''))
        reg.setdefault('vistoPrimeiro', data)
        reg['vistoUltimo'] = data
        if n.get('precoNum'):
            hist = reg.setdefault('precos', [])
            if not hist or hist[-1][1] != n['precoNum']:
                hist.append([data, n['precoNum']])
                del hist[:-30]  # guarda as 30 últimas mudanças de preço
        cod = codigo_modelo(n) if modelos else ''
        if cod:
            reg['codigo'] = cod
            mod = self.d['modelos'].setdefault(cod, {})
            mod.update({k: v for k, v in conhecido.items() if k != 'imagem' or not mod.get('imagem')})
            mod.setdefault('ids', [])
            if n['id'] not in mod['ids']:
                mod['ids'].append(n['id'])

    def salvar(self):
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.caminho.with_suffix('.tmp')
        tmp.write_text(json.dumps(self.d, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        tmp.replace(self.caminho)

    def historico(self, i):
        """(menor preço já visto, data) do produto i, ou (None, None)."""
        hist = (self.d['produtos'].get(i) or {}).get('precos') or []
        if not hist:
            return None, None
        data, preco = min(hist, key=lambda h: h[1])
        return preco, data

    def resumo(self):
        return {'produtos': len(self.d['produtos']), 'modelos': len(self.d['modelos'])}
