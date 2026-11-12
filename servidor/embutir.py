"""Embute dados/dados.json no cupons-dell.html (a página funciona offline com esses dados).

Uso (na pasta servidor):  python embutir.py
"""
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PAGINA = RAIZ / 'cupons-dell.html'
DADOS = RAIZ / 'dados' / 'dados.json'


def main():
    d = json.loads(DADOS.read_text(encoding='utf-8'))
    html = PAGINA.read_text(encoding='utf-8')
    js = json.dumps(d, ensure_ascii=False).replace('</', '<\\/')  # nada de "</script>" dentro do JSON
    novo, n = re.subn(r'^const DADOS_EMBUTIDOS = .*;$', lambda m: f'const DADOS_EMBUTIDOS = {js};', html, count=1, flags=re.M)
    if n != 1:
        raise SystemExit('linha "const DADOS_EMBUTIDOS = ...;" não encontrada')
    PAGINA.write_text(novo, encoding='utf-8')
    print(f"ok: {len(d.get('produtos', []))} produtos e {len(d.get('cupons', []))} cupons embutidos")


if __name__ == '__main__':
    main()
