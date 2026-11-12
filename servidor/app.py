"""Servidor do Buscador de Cupons e Notebooks.

GET  /              página (cupons-dell.html)
GET  /api/dados     dados atuais (JSON)
POST /api/atualizar?categoria=computadores|games  coleta nova só da categoria do card escolhido
                    (sem categoria = todas; uma coleta por vez, as outras esperam na fila; 5 min mínimos por categoria)
GET  /api/status?categoria=…  andamento da coleta dessa categoria (+ resumo de todas em "categorias")
GET  /api/versao    versão da página no servidor e do app (Android/Windows) mais novo publicado no GitHub
GET  /baixar        baixa a página (com dados embutidos) para usar como arquivo
"""
import asyncio
import json
import logging
import os
import time
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

import httpx

import versao as versao_app
import keepalive
from coleta import orquestrador
from coleta.banco import Banco

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s: %(message)s')
logging.getLogger('httpx').setLevel(logging.WARNING)
log = logging.getLogger('servidor')

RAIZ = Path(__file__).resolve().parent.parent
SEMENTE = RAIZ / 'dados' / 'dados.json'
PASTA = Path(os.environ.get('PASTA_DADOS', '/tmp/tudo-busca'))
ATUAL = PASTA / 'dados.json'
PAGINA = RAIZ / 'cupons-dell.html'
BANCO = Banco(PASTA / 'banco.json', semente=RAIZ / 'dados' / 'banco.json')
INTERVALO_MIN = int(os.environ.get('INTERVALO_MIN_SEGUNDOS', '300'))

app = FastAPI(title='Tudo-Busca', docs_url=None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['GET', 'POST'], allow_headers=['*'])

CATEGORIAS = orquestrador.CATEGORIAS
estados = {c: {'estado': 'parado', 'inicio': None, 'fim': None, 'fontes': {}, 'resumo': None, 'erro': None} for c in CATEGORIAS}
_trava = asyncio.Lock()   # uma coleta por vez (todas gravam o mesmo arquivo); as outras esperam na fila


def _cat(c):
    return c if c in CATEGORIAS else 'todas'


def carregar():
    for p in (ATUAL, SEMENTE):
        try:
            return json.loads(p.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            continue
    raise RuntimeError('sem dados')


def salvar(d):
    PASTA.mkdir(parents=True, exist_ok=True)
    tmp = ATUAL.with_suffix('.tmp')
    tmp.write_text(json.dumps(d, ensure_ascii=False), encoding='utf-8')
    tmp.replace(ATUAL)


async def coletar(categoria='todas'):
    estado = estados[categoria]
    estado.update(estado='rodando', fila=_trava.locked(), inicio=time.time(), fim=None, resumo=None, erro=None, fontes={})
    async with _trava:
        estado.update(fila=False, inicio=time.time())
        try:
            novo, resumo = await orquestrador.executar(carregar(), estado, banco=BANCO, categoria=categoria)
            salvar(novo)
            BANCO.salvar()
            estado.update(estado='concluido', resumo={k: v for k, v in resumo.items() if k != 'idsNovos'})
            log.info('coleta (%s) concluída: %s', categoria, {k: v for k, v in resumo.items() if k not in ('fontes', 'idsNovos')})
        except Exception as e:
            log.exception('coleta (%s) falhou', categoria)
            estado.update(estado='erro', erro=str(e)[:300])
        finally:
            estado['fim'] = time.time()


def _status(categoria='todas'):
    e = estados[categoria]
    s = {k: e.get(k) for k in ('estado', 'inicio', 'fim', 'fontes', 'resumo', 'erro', 'fila')}
    s['categoria'] = categoria
    s['agora'] = time.time()
    s['categorias'] = {c: {'estado': v['estado'], 'fim': v['fim']} for c, v in estados.items()}
    return s


@app.get('/')
def pagina():
    return FileResponse(PAGINA, media_type='text/html; charset=utf-8', headers={'Cache-Control': 'no-cache'})


WEB = RAIZ / 'web'


@app.get('/manifest.webmanifest')
def manifesto():
    return FileResponse(WEB / 'manifest.webmanifest', media_type='application/manifest+json')


@app.get('/sw.js')
def service_worker():
    return FileResponse(WEB / 'sw.js', media_type='application/javascript', headers={'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/'})


@app.get('/icones/{nome}')
def icone(nome: str):
    arq = (WEB / 'icones' / nome).resolve()
    if arq.parent != (WEB / 'icones').resolve() or not arq.exists() or arq.suffix != '.png':
        return JSONResponse({'erro': 'não encontrado'}, status_code=404)
    return FileResponse(arq, media_type='image/png', headers={'Cache-Control': 'public, max-age=604800'})


NOVO = RAIZ / 'web-novo'   # app novo (Expo, exportado por `npm run export:web` em app/)
_TIPOS = {'.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html; charset=utf-8',
          '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'}


def _versao_novo():
    try:
        return json.loads((NOVO / 'versao.json').read_text(encoding='utf-8')).get('versao')
    except (OSError, ValueError):
        return None


@app.get('/novo')
@app.get('/novo/{caminho:path}')
def app_novo(caminho: str = ''):
    """App novo na web: arquivos do build; qualquer outra rota cai no index.html (o expo-router resolve no navegador)."""
    raiz = NOVO.resolve()
    if caminho:
        arq = (NOVO / caminho).resolve()
        if arq.is_relative_to(raiz) and arq.is_file():
            fixo = '/_expo/static/' in '/' + caminho or caminho.startswith('assets/')   # nomes com hash: podem ficar em cache
            return FileResponse(arq, media_type=_TIPOS.get(arq.suffix.lower()),
                                headers={'Cache-Control': 'public, max-age=31536000, immutable' if fixo else 'no-cache'})
    indice = NOVO / 'index.html'
    if not indice.exists():
        return JSONResponse({'erro': 'app novo ainda não publicado'}, status_code=404)
    return FileResponse(indice, media_type='text/html; charset=utf-8', headers={'Cache-Control': 'no-cache'})


REPO = 'jjeffersongirotto-star/Tudo-Busca'
RELEASES = f'https://github.com/{REPO}/releases/latest'
_release = {'em': 0.0, 'dados': None}


async def _app_mais_novo():
    """Último Release dos apps no GitHub (guardado por 15 min; sem resposta, devolve o último conhecido ou None)."""
    if _release['dados'] is not None and time.time() - _release['em'] < 900:
        return _release['dados']
    try:
        async with httpx.AsyncClient(timeout=8, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'tudo-busca'}) as c:
            r = await c.get(f'https://api.github.com/repos/{REPO}/releases/latest')
            r.raise_for_status()
            j = r.json()
        tag = j.get('tag_name', '')
        _release.update(em=time.time(), dados={
            'versao': tag.split('-v', 1)[-1] if '-v' in tag else tag.lstrip('v'), 'tag': tag, 'pagina': j.get('html_url') or RELEASES,
            'android': f'{RELEASES}/download/Tudo-Busca-Android.apk', 'windows': f'{RELEASES}/download/Tudo-Busca-Instalador-Windows.exe'})
    except Exception as e:  # GitHub fora do ar ou limite de acessos: a busca segue normalmente
        log.warning('release do GitHub indisponível: %s', e)
        _release['em'] = time.time() - 600   # tenta de novo em ~5 min
    return _release['dados']


_nativo = {'em': 0.0, 'dados': None}


async def _nativo_mais_novo():
    """Último APK do app novo (Releases com tag nativo-v2.0.N; não são o 'latest', que segue sendo o app antigo). Cache de 15 min."""
    if _nativo['dados'] is not None and time.time() - _nativo['em'] < 900:
        return _nativo['dados']
    try:
        async with httpx.AsyncClient(timeout=8, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'tudo-busca'}) as c:
            r = await c.get(f'https://api.github.com/repos/{REPO}/releases', params={'per_page': 30})
            r.raise_for_status()
        rel = next((j for j in r.json() if str(j.get('tag_name', '')).startswith('nativo-v') and not j.get('draft')), None)
        if rel:
            apk = next((a.get('browser_download_url') for a in rel.get('assets') or [] if str(a.get('name', '')).endswith('.apk')), None)
            _nativo['dados'] = {'versao': rel['tag_name'][len('nativo-v'):], 'tag': rel['tag_name'], 'android': apk,
                                'pagina': rel.get('html_url') or f'https://github.com/{REPO}/releases'}
        _nativo['em'] = time.time()
    except Exception as e:
        log.warning('releases do app nativo indisponíveis: %s', e)
        _nativo['em'] = time.time() - 600
    return _nativo['dados']


@app.get('/api/versao')
async def versao():
    return JSONResponse({'versao': versao_app.gravada(PAGINA.read_text(encoding='utf-8')), 'app': await _app_mais_novo(),
                         'novo': _versao_novo(), 'nativo': await _nativo_mais_novo(), 'baixar': '/baixar'},
                        headers={'Cache-Control': 'no-store'})


@app.get('/baixar')
def baixar():
    return FileResponse(PAGINA, media_type='text/html; charset=utf-8', filename='tudo-busca.html', headers={'Cache-Control': 'no-cache'})


@app.get('/api/dados')
def dados():
    return JSONResponse(carregar(), headers={'Cache-Control': 'no-store'})


@app.get('/api/status')
def status(categoria: str = Query('todas')):
    return JSONResponse(_status(_cat(categoria)), headers={'Cache-Control': 'no-store'})


@app.post('/api/atualizar')
async def atualizar(categoria: str = Query('todas')):
    """Coleta só a categoria do card escolhido (computadores ou games); as outras ficam como estavam."""
    categoria = _cat(categoria)
    estado = estados[categoria]
    if estado['estado'] == 'rodando':
        return _status(categoria)
    if estado['fim'] and estado['estado'] == 'concluido' and time.time() - estado['fim'] < INTERVALO_MIN:
        s = _status(categoria)
        s['recente'] = True  # coleta dessa categoria feita há pouco: devolve a mesma, sem incomodar as lojas de novo
        return s
    estado['estado'] = 'rodando'
    asyncio.get_running_loop().create_task(coletar(categoria))
    return _status(categoria)


@app.get('/api/banco')
def banco_resumo():
    """Quantos produtos e modelos o banco de dados já conhece."""
    return BANCO.resumo()


@app.get('/healthz')
def saude():
    return {'ok': True}


@app.on_event('startup')
async def iniciar():
    keepalive.iniciar()  # ping na URL pública a cada ~10 min, para o Render não dormir
    if os.environ.get('COLETAR_AO_INICIAR') == '1':
        asyncio.get_running_loop().create_task(coletar())
