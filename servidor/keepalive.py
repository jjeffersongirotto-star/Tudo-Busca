"""Ping periódico na URL pública para o Render não dormir o plano gratuito.

O ping precisa sair e voltar pela URL pública (não por localhost), para o
proxy do Render contar como tráfego e manter o serviço acordado.
Só liga no Render (env RENDER) ou com KEEPALIVE=1; KEEPALIVE=0 desliga.
"""
import asyncio
import logging
import os

import httpx

log = logging.getLogger('servidor')

URL_PADRAO = 'https://tudo-busca.onrender.com'
CAMINHO = '/api/status'


def ativo(env=None):
    env = os.environ if env is None else env
    k = str(env.get('KEEPALIVE', '')).strip()
    if k == '0':
        return False
    if k == '1':
        return True
    return bool(env.get('RENDER'))


def url_status(env=None):
    env = os.environ if env is None else env
    base = (env.get('RENDER_EXTERNAL_URL') or URL_PADRAO).rstrip('/')
    return f'{base}{CAMINHO}'


def _int_env(nome, padrao, env=None):
    env = os.environ if env is None else env
    try:
        return max(1, int(env.get(nome, str(padrao))))
    except (TypeError, ValueError):
        return padrao


async def _pingar():
    espera = _int_env('KEEPALIVE_ESPERA', 60)
    intervalo = _int_env('KEEPALIVE_INTERVALO', 600)
    await asyncio.sleep(espera)
    url = url_status()
    log.info('keepalive: ping em %s a cada %ss', url, intervalo)
    while True:
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True,
                                        headers={'User-Agent': 'tudo-busca-keepalive'}) as c:
                r = await c.get(url)
            log.info('keepalive: %s → HTTP %s', url, r.status_code)
        except Exception as e:
            log.warning('keepalive falhou: %s', e)
        await asyncio.sleep(intervalo)


def iniciar(loop=None):
    """Agenda o ping em segundo plano. Não bloqueia e não levanta exceção."""
    try:
        if not ativo():
            log.info('keepalive: desligado (só roda no Render, ou com KEEPALIVE=1)')
            return None
        loop = loop or asyncio.get_running_loop()
        return loop.create_task(_pingar())
    except Exception as e:
        log.warning('keepalive não iniciou: %s', e)
        return None
