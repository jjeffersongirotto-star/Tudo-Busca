"""Diagnóstico temporário: mostra como cada site de cupons entrega os códigos."""
import asyncio, base64, re
import httpx
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9'}
def limpo(t): return re.sub(r'\s+', ' ', t)
async def main():
    async with httpx.AsyncClient(headers=UA, follow_redirects=True, timeout=25) as c:
        # Cuponomia
        h = (await c.get('https://www.cuponomia.com.br/desconto/kabum')).text
        urls = re.findall(r'data-coupon-url="([^"]+)"', h)
        print('CUPONOMIA data-coupon-url:', len(urls))
        i = h.find('data-coupon-url'); print('CUPONOMIA bloco:', limpo(h[i-1500:i+800])[:2300])
        for u in urls[:3]:
            p = base64.b64decode(u + '==').decode('utf-8', 'ignore'); print('  decod:', p)
            r = await c.get('https://www.cuponomia.com.br' + p, headers={'X-Requested-With': 'XMLHttpRequest'})
            t = r.text; print('  status', r.status_code, len(t)); j = t.find('code'); print('  trecho:', limpo(t[:1200]))
        # Méliuz
        h = (await c.get('https://www.meliuz.com.br/desconto/cupom-kabum')).text
        i = h.find('data-code-button'); print('MELIUZ bloco:', limpo(h[i-1800:i+600])[:2400])
        for pad in [r'"code"\s*:\s*"[^"]{3,30}"', r'"coupon[_A-Za-z]*"\s*:\s*"[^"]{3,30}"', r'data-coupon[\w-]*="[^"]{1,80}"']:
            print('  MELIUZ', pad, re.findall(pad, h)[:8])
        print('  MELIUZ scripts:', re.findall(r'<script[^>]*(?:id|type)="([^"]+)"', h)[:15])
        # CupoNation
        h = (await c.get('https://www.cuponation.com.br/cupom-desconto-kabum')).text
        for pad in [r'"code"\s*:\s*"[^"]{3,30}"', r'"voucherCode"\s*:\s*"[^"]{0,30}"', r'"couponCode"\s*:\s*"[^"]{0,30}"', r'data-[\w-]*code[\w-]*="[^"]{0,40}"', r'"type"\s*:\s*"(?:CODE|code|coupon)"']:
            print('  CUPONATION', pad, re.findall(pad, h)[:8])
        print('  CUPONATION scripts:', re.findall(r'<script[^>]*(?:id|type)="([^"]+)"', h)[:15])
        i = h.find('"code"'); print('  CUPONATION trecho code:', limpo(h[i-700:i+300]) if i >= 0 else None)
        i = h.lower().find('copiar'); print('  CUPONATION trecho copiar:', limpo(h[i-900:i+200]) if i >= 0 else None)
asyncio.run(main())
