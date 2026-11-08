"""Roda todas as fontes, junta com os dados anteriores e valida.

Regras (logica-cupons-dell.md):
- fonte que falha mantém a coleta anterior dela (marcada como "preço de coleta anterior");
- ids estáveis; item já conhecido só recebe preço novo (specs conferidas são mantidas);
- item novo passa por enrich; gerações antigas (Intel ≤12ª, DDR3, Windows 10) ficam de fora;
- validação final: ≥30 produtos e ids únicos, senão nada muda.
"""
import asyncio
import copy
import logging
import re
import time

from . import amazon, cupons as cupons_mod, dell, kabum, vtex, zoom
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
MAX_PRODUTOS = 1500  # acima disso, saem primeiro os anúncios com menos informação


def _velho(n):
    """Modelos antigos ficam de fora. Notebook: Intel ≤12ª, Ryzen ≤5000, Celeron/Pentium/Athlon.
    Desktop: o que a extração marcou como 'antiga' (Intel ≤11ª, Ryzen ≤3000). Apple M1 continua (ainda é vendido)."""
    t = n.get('nome', '') + ' ' + ' '.join(str(v) for v in (n.get('specs') or {}).values())
    if re.search(r'DDR3\b|Windows\s*(7|8|10)\b|\bW(7|8|10)\b', t, re.I):
        return True
    if (n.get('cpuFamilia') or '').startswith('Apple'):
        return False
    if n.get('cpuGeracao') == 'antiga':
        return True
    return n.get('tipo') in ('Notebook', 'All-in-one') and bool(re.search(r'Ryzen\s*[3579][\s\-]*[1-5]\d{3}[A-Z]?\b', t, re.I))


def _sem_dados(n):
    """Anúncio sem preço plausível ou sem nenhum dado de hardware: não dá para avaliar."""
    p = n.get('precoNum')
    return (p is not None and p < 400) or (not n.get('cpuFamilia') and not n.get('ramGB'))


def _pontos_info(n):
    """Quanto o anúncio informa (usado só para escolher quem fica quando passa do limite)."""
    return sum(1 for k in ('cpuFamilia', 'ramGB', 'armazGB', 'gpuModelo', 'precoNum', 'imagem') if n.get(k))


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


async def executar(dados, status=None, banco=None):
    """Retorna (dados_novos, resumo). status: dict atualizado durante a coleta (para a página mostrar progresso).
    banco: Banco de dados de produtos (completa o que falta e aprende com a coleta)."""
    status = status if status is not None else {}
    inicio = time.time()
    ant = {n['id']: n for n in (dados.get('produtos') or dados.get('notebooks') or [])}
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

    async def rodar_cupons():
        status['fontes']['Cupons'] = {'estado': 'buscando'}
        try:
            r, info = await asyncio.wait_for(cupons_mod.coletar(http), LIMITE_FONTE)
        except Exception as e:
            log.exception('cupons')
            r, info = None, f'erro: {type(e).__name__}'
        status['fontes']['Cupons'] = {'estado': 'ok' if r is not None else 'falhou', 'itens': len(r or []),
                                      'msg': info if isinstance(info, str) else ', '.join(f"{k}: {v['cupons']}" for k, v in info.items())}
        return r

    try:
        *resultados, cupons_novos = await asyncio.gather(*(rodar(n, m, f) for n, m, f in FONTES), rodar_cupons())
    finally:
        await http.fechar()

    if all(r is None for r in resultados) and cupons_novos is None:
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
                for k in ('url', 'vendedor', 'loja', 'imagem'):
                    if it.get(k):
                        n[k] = it[k]
                n.pop('precoAntigo', None)
                (n.get('specs') or {}).pop('Fonte do preço', None)
                atualizados += 1
            else:
                n = enriquecer(it)
                if _velho(n) or _sem_dados(n):
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

    produtos = list(final.values())
    completados = 0
    if banco is not None:
        data = hoje.strftime('%Y-%m-%d')
        for n in produtos:
            antes = n.get('cpuPerfil')
            if banco.completar(n):
                completados += 1
                for k in ('cpuPerfil', 'procFamilia', 'placaVideo'):  # recalcula o que depende do que foi completado
                    if n.get(k) in (None, '', 'Não informado'):
                        n.pop(k, None)
                enriquecer(n)
            banco.aprender(n, data)
    if len(produtos) > MAX_PRODUTOS:
        produtos.sort(key=lambda n: (n['id'] in ant, _pontos_info(n)), reverse=True)
        produtos = produtos[:MAX_PRODUTOS]
    if len(produtos) < 30 or len({n['id'] for n in produtos}) != len(produtos):
        raise RuntimeError(f'validação falhou: {len(produtos)} produtos')
    out = dict(dados)
    out.pop('notebooks', None)
    out['produtos'] = produtos
    lista_cupons = dados.get('cupons', [])
    if cupons_novos is not None:
        lista_cupons = cupons_mod.juntar(lista_cupons, cupons_novos, hoje.strftime('%d/%m/%Y'))
    out['cupons'] = _cupons(lista_cupons, hoje)
    out['ultimaAtualizacao'] = hoje.isoformat(timespec='seconds')
    out['ultimaAtualizacaoTexto'] = texto_data(hoje)
    por_tipo = {}
    for n in produtos:
        por_tipo[n.get('tipo') or 'Notebook'] = por_tipo.get(n.get('tipo') or 'Notebook', 0) + 1
    resumo = {'produtos': len(produtos), 'porTipo': por_tipo, 'novos': len(novos), 'removidos': len(removidos), 'precosAtualizados': atualizados,
              'precosAnteriores': antigos, 'completadosPeloBanco': completados,
              'banco': banco.resumo() if banco is not None else None, 'cupons': sum(1 for c in out['cupons'] if c.get('ativo') is not False),
              'segundos': round(time.time() - inicio), 'fontes': status['fontes'], 'idsNovos': novos}
    return out, resumo


if __name__ == '__main__':  # teste: python -m coleta.orquestrador ../dados/dados.json
    import json
    import sys
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    logging.getLogger('httpx').setLevel(logging.WARNING)
    from .banco import Banco
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    caminho_banco = sys.argv[1].replace('dados.json', 'banco.json')
    banco = Banco(caminho_banco)
    novo, r = asyncio.run(executar(d, banco=banco))
    banco.salvar()
    print('banco:', banco.resumo())
    print(json.dumps(r, ensure_ascii=False, indent=1))
    antes = {n['id']: n for n in (d.get('produtos') or d.get('notebooks'))}
    mud = [(n['id'], antes[n['id']].get('preco'), n.get('preco')) for n in novo['produtos'] if n['id'] in antes and antes[n['id']].get('precoNum') != n.get('precoNum')]
    import collections as _c
    ativos = [c for c in novo['cupons'] if c.get('ativo') is not False]
    print('CUPONS ativos por loja:', dict(_c.Counter(c.get('loja') for c in ativos)))
    for c in [c for c in ativos if c.get('coletado')][:25]:
        print('  CUPOM', c['loja'], '|', c['codigo'], '|', c.get('desconto'), '|', c.get('validade'), '|', (c.get('descricao') or '')[:90], '|', c.get('fonte'))
    print('removidos:', [i for i in antes if i not in {n['id'] for n in novo['produtos']}])
    print('preços que mudaram:', len(mud))
    for m in mud[:15]:
        print('  ', m)
    import collections
    print('por loja:', dict(collections.Counter(n.get('loja', '').split(' (')[0] for n in novo['produtos'])))
    print('por marca:', dict(collections.Counter(n.get('marca', '') for n in novo['produtos']).most_common(25)))
    vistos_t = collections.Counter()
    for n in novo['produtos']:
        if n['id'] in r['idsNovos'] and vistos_t[n.get('tipo')] < 4:
            vistos_t[n.get('tipo')] += 1
            print('NOVO', {k: n.get(k) for k in ('id', 'tipo', 'marca', 'loja', 'nome', 'preco', 'cpuModelo', 'cpuPerfil', 'gpuModelo', 'ramGB', 'armazGB', 'linha', 'imagem')})
    imgs = {n['id']: n['imagem'] for n in novo['produtos'] if n.get('imagem')}
    print('IMAGENS', len(imgs), 'de', len(novo['produtos']))
    import os
    if os.environ.get('SAIDA_IMAGENS'):
        json.dump(imgs, open(os.environ['SAIDA_IMAGENS'], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    if len(sys.argv) > 2:
        json.dump(novo, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
