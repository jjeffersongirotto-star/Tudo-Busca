"""Roda todas as fontes, junta com os dados anteriores e valida.

Regras (logica-cupons-dell.md):
- fonte que falha mantém a coleta anterior dela (marcada como "preço de coleta anterior");
- ids estáveis; item já conhecido só recebe preço novo (specs conferidas são mantidas);
- item novo passa por enrich; gerações antigas (Intel ≤12ª, DDR3, Windows 10) ficam de fora;
- validação final: ≥30 notebooks e ids únicos, senão nada muda.
"""
import asyncio
import copy
import logging
import re
import time

from . import amazon, dell, kabum, vtex, zoom
from .enrich import enriquecer
from .http import Http
from .util import agora, texto_data

log = logging.getLogger('coleta')

FONTES = [
    ('Dell.com', dell, lambda n: not re.match(r'(kabum|amazon|vtex|zb)-', n['id'])),
    ('KaBuM!', kabum, lambda n: n['id'].startswith('kabum-')),
    ('Amazon', amazon, lambda n: n['id'].startswith('amazon-')),
    ('iByte/WAZ/Webcontinental', vtex, lambda n: n['id'].startswith('vtex-')),
    ('Zoom/Buscapé', zoom, lambda n: n['id'].startswith('zb-')),
]
CAMPOS_PRECO = ['preco', 'precoNum', 'precoDe', 'precoDeNum', 'descontoPct', 'precoPrazo']
LIMITE_FONTE = 210  # segundos


def _velho(n):
    t = n.get('nome', '') + ' ' + ' '.join(str(v) for v in (n.get('specs') or {}).values())
    return n.get('cpuGeracao') == 'antiga' or bool(re.search(r'DDR3\b|Windows\s*10\b|Ryzen\s*[3579]\s*[1-5]\d{3}', t, re.I))


def _cupons(cupons, hoje):
    """Cupom com validade vencida deixa de aparecer (ativo=false)."""
    out = []
    for c in cupons:
        c = dict(c)
        val = (c.get('validade') or '').strip()
        achadas = [] if re.match(r'n[ãa]o', val, re.I) else re.findall(r'(?:at[ée]\s*|^)(\d{2})/(\d{2})/(\d{4})', val, re.I)
        datas = [(int(y), int(m), int(d)) for d, m, y in achadas]
        if datas and c.get('ativo') is not False:
            y, mth, d = max(datas)  # várias fontes: vale a validade mais longa
            if (y, mth, d) < (hoje.year, hoje.month, hoje.day):
                c['ativo'] = False
                c['status'] = f'Provavelmente expirado – validade {d:02d}/{mth:02d}/{y} já passou'
        out.append(c)
    return out


async def executar(dados, status=None):
    """Retorna (dados_novos, resumo). status: dict atualizado durante a coleta (para a página mostrar progresso)."""
    status = status if status is not None else {}
    inicio = time.time()
    ant = {n['id']: n for n in dados['notebooks']}
    data_ant = (dados.get('ultimaAtualizacaoTexto') or '').split(' às')[0]
    status['fontes'] = {nome: {'estado': 'aguardando'} for nome, _, _ in FONTES}
    http = Http()

    async def rodar(nome, mod, filtro):
        status['fontes'][nome] = {'estado': 'buscando'}
        t0 = time.time()
        try:
            itens, msg = await asyncio.wait_for(mod.coletar(http, [a for a in ant.values() if filtro(a)]), LIMITE_FONTE)
        except asyncio.TimeoutError:
            itens, msg = None, 'demorou demais'
        except Exception as e:  # um erro numa fonte não derruba as outras
            log.exception('fonte %s', nome)
            itens, msg = None, f'erro: {type(e).__name__}'
        status['fontes'][nome] = {'estado': 'ok' if itens is not None else 'falhou', 'msg': msg,
                                  'itens': len([i for i in itens or [] if not i.get('removido')]), 'segundos': round(time.time() - t0)}
        log.info('fonte %-26s %s (%s) em %ds', nome, status['fontes'][nome]['estado'], msg, time.time() - t0)
        return itens

    try:
        resultados = await asyncio.gather(*(rodar(n, m, f) for n, m, f in FONTES))
    finally:
        await http.fechar()

    if all(r is None for r in resultados):
        raise RuntimeError('nenhuma loja respondeu; os dados anteriores foram mantidos')
    hoje = agora()
    novos, removidos, atualizados, antigos, final = [], [], 0, 0, {}
    for (nome, _, filtro), itens in zip(FONTES, resultados):
        da_fonte = {i: a for i, a in ant.items() if filtro(a)}
        recebidos = {}
        for it in itens or []:
            if it.get('removido'):
                if it['id'] in da_fonte:
                    removidos.append(it['id'])
                recebidos[it['id']] = None
                continue
            if it['id'] in ant:
                n = copy.deepcopy(ant[it['id']])
                for k in CAMPOS_PRECO:
                    if k in it:
                        n[k] = it[k]
                    elif k in ('precoDe', 'precoPrazo'):
                        n[k] = ''
                    elif k in ('precoDeNum', 'descontoPct'):
                        n[k] = None
                for k in ('url', 'vendedor', 'loja'):
                    if it.get(k):
                        n[k] = it[k]
                n.pop('precoAntigo', None)
                (n.get('specs') or {}).pop('Fonte do preço', None)
                atualizados += 1
            else:
                n = enriquecer(it)
                if _velho(n):
                    continue
                novos.append(n['id'])
            recebidos[n['id']] = n
        for i, a in da_fonte.items():  # não veio nesta coleta: fica o anterior, marcado
            if i not in recebidos:
                n = copy.deepcopy(a)
                n['precoAntigo'] = True
                n.setdefault('specs', {})['Fonte do preço'] = f'Preço da coleta de {data_ant}: {nome} não respondeu nesta atualização.'
                recebidos[i] = n
                antigos += 1
        for i, n in recebidos.items():
            if n is not None:
                final[i] = n

    notebooks = list(final.values())
    if len(notebooks) < 30 or len({n['id'] for n in notebooks}) != len(notebooks):
        raise RuntimeError(f'validação falhou: {len(notebooks)} notebooks')
    out = dict(dados)
    out['notebooks'] = notebooks
    out['cupons'] = _cupons(dados.get('cupons', []), hoje)
    out['ultimaAtualizacao'] = hoje.isoformat(timespec='seconds')
    out['ultimaAtualizacaoTexto'] = texto_data(hoje)
    resumo = {'notebooks': len(notebooks), 'novos': len(novos), 'removidos': len(removidos), 'precosAtualizados': atualizados,
              'precosAnteriores': antigos, 'cupons': sum(1 for c in out['cupons'] if c.get('ativo') is not False),
              'segundos': round(time.time() - inicio), 'fontes': status['fontes'], 'idsNovos': novos[:50]}
    return out, resumo


if __name__ == '__main__':  # teste: python -m coleta.orquestrador ../dados/dados.json
    import json
    import sys
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    novo, r = asyncio.run(executar(d))
    print(json.dumps(r, ensure_ascii=False, indent=1))
    antes = {n['id']: n for n in d['notebooks']}
    mud = [(n['id'], antes[n['id']].get('preco'), n.get('preco')) for n in novo['notebooks'] if n['id'] in antes and antes[n['id']].get('precoNum') != n.get('precoNum')]
    print('preços que mudaram:', len(mud))
    for m in mud[:15]:
        print('  ', m)
    for n in novo['notebooks']:
        if n['id'] in r['idsNovos'][:12]:
            print('NOVO', {k: n.get(k) for k in ('id', 'loja', 'nome', 'preco', 'precoDe', 'cpuModelo', 'cpuPerfil', 'gpuModelo', 'ramGB', 'armazGB', 'telaRes', 'telaHz', 'linha', 'url')})
    if len(sys.argv) > 2:
        json.dump(novo, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
