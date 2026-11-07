"""Cliente HTTP com cabeçalhos de navegador, limite por site e novas tentativas."""
import asyncio
import logging
from urllib.parse import urlparse

import httpx

log = logging.getLogger('coleta')

CABECALHOS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.6',
}


class Http:
    def __init__(self, por_site=4, timeout=25):
        self.cli = httpx.AsyncClient(headers=CABECALHOS, follow_redirects=True, timeout=timeout, http2=False)
        self.por_site = por_site
        self.sem = {}
        self.erros = {}

    def _sem(self, url):
        h = urlparse(url).netloc
        if h not in self.sem:
            self.sem[h] = asyncio.Semaphore(self.por_site)
        return self.sem[h]

    async def get(self, url, tentativas=2, json=False, **kw):
        """Retorna texto (ou JSON) ou None. Nunca lança exceção."""
        ultimo = ''
        for t in range(tentativas):
            try:
                async with self._sem(url):
                    r = await self.cli.get(url, **kw)
                if r.status_code == 200:
                    return r.json() if json else r.text
                ultimo = f'HTTP {r.status_code}'
                if r.status_code in (403, 404, 410):
                    break
            except Exception as e:  # rede, timeout, JSON inválido
                ultimo = type(e).__name__ + ': ' + str(e)[:120]
            await asyncio.sleep(1.5 * (t + 1))
        host = urlparse(url).netloc
        self.erros[host] = self.erros.get(host, 0) + 1
        log.warning('falha %s -> %s', url[:140], ultimo)
        return None

    async def fechar(self):
        await self.cli.aclose()
