"""Diagnóstico temporário: mostra como cada site de cupons entrega os códigos."""
import asyncio, base64, re, traceback
import httpx
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9'}
def limpo(t): return re.sub(r'\s+', ' ', t)
def b64(u): return base64.b64decode(u + '=' * (-len(u) % 4)).decode('utf-8', 'ignore')
async def cuponomia(c):
    h = (await c.get('https://www.cuponomia.com.br/desconto/kabum')).text
    itens = re.findall(r'<li class="item[^"]*" id="(\d+)" data-type="(\w+)".*?data-coupon-modal="([^"]+)" data-coupon-url="([^"]+)"', h, re.S)
    print('CUPONOMIA itens:', [(i, t) for i, t, _, _ in itens][:12])
    for i, t, modal, url in [x for x in itens if x[1] == 'code'][:2]:
        m = b64(modal); print('  modal:', m)
        r = await c.get('https://www.cuponomia.com.br' + m)
        t2 = r.text; print('  modal status', r.status_code, len(t2))
        for pad in [r'class="[^"]*code[^"]*"[^>]*>[^<]{2,40}<', r'data-clipboard[\w-]*="[^"]{2,40}"', r'value="[A-Z0-9]{4,25}"', r'"code"\s*:\s*"[^"]{2,30}"', r'id="(?:coupon-?code|code)[^"]*"[^>]*>[^<]{2,40}<']:
            print('   ', pad, re.findall(pad, t2)[:6])
        k = t2.find(i); print('   trecho id:', limpo(t2[k-300:k+1500])[:1800] if k >= 0 else None)
        async with httpx.AsyncClient(headers=UA, follow_redirects=False, timeout=25) as c2:
            r = await c2.get('https://www.cuponomia.com.br' + b64(url))
            print('  redirect', r.status_code, r.headers.get('location'))
async def meliuz(c):
    h = (await c.get('https://www.meliuz.com.br/desconto/cupom-kabum')).text
    i = h.find('data-code-button'); print('MELIUZ bloco:', limpo(h[i-1800:i+700])[:2500])
    for pad in [r'"code"\s*:\s*"[^"]{3,30}"', r'"coupon[_A-Za-z]*"\s*:\s*"[^"]{3,30}"', r'data-coupon[\w-]*="[^"]{1,80}"', r'data-[\w-]*code[\w-]*="[^"]{0,60}"']:
        print('  MELIUZ', pad, re.findall(pad, h)[:8])
    print('  MELIUZ scripts:', re.findall(r'<script[^>]*(?:id|type)="([^"]+)"', h)[:15])
async def cuponation(c):
    h = (await c.get('https://www.cuponation.com.br/cupom-desconto-kabum')).text
    for pad in [r'"code"\s*:\s*"[^"]{3,30}"', r'"voucherCode"\s*:\s*"[^"]{0,30}"', r'"couponCode"\s*:\s*"[^"]{0,30}"', r'data-[\w-]*code[\w-]*="[^"]{0,40}"', r'"type"\s*:\s*"[A-Za-z_]{3,20}"', r'"isCode"\s*:\s*\w+']:
        print('  CUPONATION', pad, re.findall(pad, h)[:8])
    print('  CUPONATION scripts:', re.findall(r'<script[^>]*(?:id|type)="([^"]+)"', h)[:15])
    for chave in ['"code"', 'voucher', 'ESQUENTA']:
        i = h.find(chave); print('  CUPONATION trecho', chave, ':', limpo(h[i-600:i+400]) if i >= 0 else None)
async def main():
    async with httpx.AsyncClient(headers=UA, follow_redirects=True, timeout=25) as c:
        for f in (cuponomia, meliuz, cuponation):
            try:
                await f(c)
            except Exception:
                traceback.print_exc()
asyncio.run(main())
