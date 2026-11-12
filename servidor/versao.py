"""Versão do app (página + service worker).

A versão fica em `cupons-dell.html` (`const VERSAO_APP = '...'`) e em `web/sw.js` (`const VERSAO = '...'`),
no formato AAAA.MM.DD.HHMM-<hash>: data/hora (Brasília) em que o código mudou + 7 letras do hash do código.
O hash ignora os dados embutidos (linha DADOS_EMBUTIDOS) e as próprias linhas de versão, então
recoletar/embutir dados NÃO muda a versão; qualquer mudança no código muda.

    python servidor/versao.py             mostra a versão gravada e a calculada
    python servidor/versao.py --carimbar  grava uma versão nova se o código mudou (o GitHub faz isso sozinho na main)
    python servidor/versao.py --conferir  sai com erro se o código mudou sem carimbar (usado nos PRs)
"""
import hashlib
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HTML = RAIZ / 'cupons-dell.html'
SW = RAIZ / 'web' / 'sw.js'
MANIFESTO = RAIZ / 'web' / 'manifest.webmanifest'
RE_HTML = re.compile(r"^const VERSAO_APP = '([^']*)';$", re.M)
RE_SW = re.compile(r"^const VERSAO = '([^']*)';$", re.M)
RE_DADOS = re.compile(r'^const DADOS_EMBUTIDOS = .*;$', re.M)


def gravada(texto=None):
    m = RE_HTML.search(texto if texto is not None else HTML.read_text(encoding='utf-8'))
    return m.group(1) if m else ''


def hash_codigo():
    h = hashlib.sha256()
    html = RE_HTML.sub('', RE_DADOS.sub('', HTML.read_text(encoding='utf-8')))
    sw = RE_SW.sub('', SW.read_text(encoding='utf-8'))
    for parte in (html, sw, MANIFESTO.read_text(encoding='utf-8')):
        h.update(parte.replace('\r\n', '\n').encode('utf-8'))
    return h.hexdigest()[:7]


def em_dia():
    v = gravada()
    return v.endswith('-' + hash_codigo()) and RE_SW.search(SW.read_text(encoding='utf-8')).group(1) == v


def carimbar():
    if em_dia():
        return gravada(), False
    agora = datetime.now(timezone(timedelta(hours=-3))).strftime('%Y.%m.%d.%H%M')
    nova = f'{agora}-{hash_codigo()}'
    for arq, rx, modelo in ((HTML, RE_HTML, "const VERSAO_APP = '{}';"), (SW, RE_SW, "const VERSAO = '{}';")):
        t = arq.read_text(encoding='utf-8')
        if not rx.search(t):
            raise SystemExit(f'linha de versão não encontrada em {arq.name}')
        arq.write_text(rx.sub(lambda _: modelo.format(nova), t, count=1), encoding='utf-8')
    return nova, True


if __name__ == '__main__':
    if '--carimbar' in sys.argv:
        v, mudou = carimbar()
        print(('nova versão: ' if mudou else 'versão já em dia: ') + v)
    elif '--conferir' in sys.argv:
        if not em_dia():
            print(f'O código mudou e a versão não foi atualizada ({gravada()} ≠ hash {hash_codigo()}).\n'
                  'Rode: python servidor/versao.py --carimbar  (ou deixe a main carimbar sozinha depois do merge)')
            sys.exit(1)
        print('versão em dia:', gravada())
    else:
        print('gravada:', gravada(), '| hash do código:', hash_codigo(), '| em dia:', em_dia())
