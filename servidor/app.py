"""Servidor do Buscador de Cupons e Notebooks.

GET  /              página (cupons-dell.html)
GET  /api/dados     dados atuais (JSON)
POST /api/atualizar começa uma coleta nova nas lojas (uma por vez; intervalo mínimo entre coletas)
GET  /api/status    andamento da coleta
"""
import asyncio
import json
import logging
import os
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

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

estado = {'estado': 'parado', 'inicio': None, 'fim': None, 'fontes': {}, 'resumo': None, 'erro': None}
_trava = asyncio.Lock()


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


async def coletar():
    async with _trava:
        estado.update(estado='rodando', inicio=time.time(), fim=None, resumo=None, erro=None, fontes={})
        try:
            novo, resumo = await orquestrador.executar(carregar(), estado, banco=BANCO)
            salvar(novo)
            BANCO.salvar()
            estado.update(estado='concluido', resumo={k: v for k, v in resumo.items() if k != 'idsNovos'})
            log.info('coleta concluída: %s', {k: v for k, v in resumo.items() if k not in ('fontes', 'idsNovos')})
        except Exception as e:
            log.exception('coleta falhou')
            estado.update(estado='erro', erro=str(e)[:300])
        finally:
            estado['fim'] = time.time()


def _status():
    s = {k: estado[k] for k in ('estado', 'inicio', 'fim', 'fontes', 'resumo', 'erro')}
    s['agora'] = time.time()
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


@app.get('/api/dados')
def dados():
    return JSONResponse(carregar(), headers={'Cache-Control': 'no-store'})


@app.get('/api/status')
def status():
    return JSONResponse(_status(), headers={'Cache-Control': 'no-store'})


@app.post('/api/atualizar')
async def atualizar():
    if estado['estado'] == 'rodando':
        return _status()
    if estado['fim'] and estado['estado'] == 'concluido' and time.time() - estado['fim'] < INTERVALO_MIN:
        s = _status()
        s['recente'] = True  # coleta feita há pouco: devolve a mesma, sem incomodar as lojas de novo
        return s
    estado['estado'] = 'rodando'
    asyncio.get_running_loop().create_task(coletar())
    return _status()


@app.get('/api/banco')
def banco_resumo():
    """Quantos produtos e modelos o banco de dados já conhece."""
    return BANCO.resumo()


@app.get('/healthz')
def saude():
    return {'ok': True}


@app.on_event('startup')
async def iniciar():
    if os.environ.get('COLETAR_AO_INICIAR') == '1':
        asyncio.get_running_loop().create_task(coletar())
