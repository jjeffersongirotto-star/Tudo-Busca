# Buscador de Cupons e Notebooks Dell — lógica completa do projeto

> Documento para outra IA (ex.: Claude) recriar ou manter o projeto. Tudo aqui foi conferido no código atual (`/workspace/dell-scraper/`).

## 1. Objetivo
Uma página HTML única (`cupons-dell.html`) que funciona offline, com os dados embutidos, e mostra:
- **cupons de desconto** (Dell.com e outras lojas) com botão de copiar;
- **notebooks Dell** de várias lojas (Dell.com, KaBuM!, Amazon, iByte/WAZ/Webcontinental, Zoom/Buscapé), com filtros e uma **nota de custo-benefício** transparente;
- **painel de detalhes** do notebook selecionado, com o link da loja no fim.

Os dados vêm de um pipeline em Python/Bash que roda **só quando o usuário pede** ("atualiza" no chat). Não existe atualização automática diária.

## 2. Estrutura de arquivos (raiz `/workspace`)
```
cupons-dell.html          # saída final (template + JSON embutido)
dados-dell.json           # dados consolidados (cupons + notebooks)
notebooks.json            # notebooks Dell.com (saída de build.py)
skus.txt                  # pares "variante sku" da Dell.com
pg/<sku>.html             # páginas de configuração Dell.com
ext/                      # lojas externas: kabum_*.html, kabum_codes.txt, amz_<ASIN>.html, vtex/<loja>.json, zb_hits.json, zbp_<n>.html, *_notebooks.json
cpn/sites/                # páginas dos sites de cupons + cupons_sites.json
atualizar-dados-dell.md   # notas operacionais detalhadas (histórico das rodadas)
dell-scraper/
  atualizar_tudo.sh       # orquestra tudo (8 passos) + validação + rollback
  fetch_dell.py           # listagens/ofertas Dell → skus.txt → pg/<sku>.html
  parse.py, parse2.py, build.py   # pg/*.html → notebooks.json (preço, "De", specs, dedup)
  fetch_cupom_sites.sh    # baixa 11 sites de cupons
  parse_cupom_sites.py    # extrai códigos → cpn/sites/cupons_sites.json
  fetch_kabum.py / parse_kabum.py       # KaBuM! (listagem __NEXT_DATA__ + páginas de produto)
  fetch_amazon.py / parse_amazon.py     # Amazon (/dp/<ASIN> já cadastrados)
  fetch_vtex.py           # API pública VTEX (iByte, WAZ, Webcontinental)
  fetch_zoom_buscape.py / parse_zoom_buscape.py
  build_lojas.py          # junta tudo, une cupons, define status, chama enrich.py, grava dados-dell.json
  enrich.py               # campos derivados (CPU, GPU, tela, peso, desconto)
  gerar_html.py           # template.html + dados-dell.json → cupons-dell.html (troca __DADOS__)
  template.html           # UI + lógica da nota (objeto NOTA)
```

## 3. Pipeline (`bash dell-scraper/atualizar_tudo.sh`, ~5–10 min, log em `dell-scraper/ultimo_refresh.log`)
0. Backup de `dados-dell.json` e `cupons-dell.html` em `/tmp/dell-bk.XXXX`.
1. **Dell.com** — `fetch_dell.py`: lê 4 listagens (laptops p.1/p.2, notebook-deals, gaming-pc-deals), extrai `/spd/<variante>/<sku>`, une com `skus.txt` (ignora `mb16250`, configurador "monte o seu"), acrescenta configurações irmãs das linhas H/HX (`ac16250, aa16250, da15260, mc16250`) e baixa cada página. Só grava se HTTP 200, >50 KB e contém o SKU; páginas cujo `<title>` não diz notebook/laptop (desktops) são descartadas. Depois `parse.py → parse2.py → build.py` geram `notebooks.json`.
2. **Sites de cupons** — `fetch_cupom_sites.sh` + `parse_cupom_sites.py`.
3. **KaBuM!** — busca `notebook-dell`, `notebook-alienware`, `notebook-gamer-dell`; filtra só "Notebook … Dell/Alienware" disponíveis, descarta usados/recondicionados/gerações antigas (Intel ≤12ª, Ryzen ≤5000, DDR3, Windows 10); baixa `/produto/<code>/<slug>`.
4. **Amazon** — só ASINs já cadastrados (páginas `/dp/`).
5. **VTEX** — `/api/catalog_system/pub/products/search?ft=<termo>` paginado de 50 em 50; se uma loja vier vazia, restaura o JSON anterior.
6. **Zoom/Buscapé** — 10 buscas × 2 sites, união por `objectId`; só aceita se ≥5 resultados.
7. **build_lojas.py + gerar_html.py**.
8. **Validação** — ≥30 notebooks, ≥10 cupons, ids únicos, `node --check` no JS extraído. Se falhar, restaura o backup.

Regra geral: **se uma fonte falha, mantém a coleta anterior daquela fonte** e segue.

## 4. Fontes de dados
| Fonte | Situação | Como |
|---|---|---|
| Dell.com | OK | curl com User-Agent de navegador; preço no bloco "Preço da Dell" antes de "Código do Produto"; specs em `div.h5.fw-bold` |
| KaBuM! | OK | `__NEXT_DATA__` → `catalogServer.data` (`price` = a prazo, `priceWithDiscount` = PIX) + página do produto |
| Amazon.com.br | Parcial | `/dp/<ASIN>` funciona (`priceToPay`); busca `/s?k=` dá captcha |
| iByte, WAZ, Webcontinental | OK | API pública VTEX |
| Zoom / Buscapé | OK | mesmo backend; `__NEXT_DATA__` → `initialReduxState.hits`; link `zoom.com.br/lead?oid=` |
| Cuponomia, Méliuz, CupoNation, Shopilo, Descontos Top, Pega Desconto, Cupom Válido, Eu Amo Cupons, Revista Fórum, Estadão/TecMundo, Cuponeria | OK | parsers específicos (atributos `data-code`, JSON embutido, JSON-LD) |
| Promobit, Seletronic | Manual | JSON/páginas de cupom |
| X (Twitter), Telegram (`t.me/s/<canal>`) | Manual | X via ferramenta `x` (search_posts_all); Telegram pela prévia pública |
| BravoCupom, Melhor Comprar, Picodi | Sem parser | só mostram parte do código (resto via clique/JS/captcha) |
| Magalu, Casas Bahia, Ponto, Carrefour/Extra, Pelando, Terabyte, Pichau | **Bloqueado (403)** | anti-bot/Cloudflare. Magalu aparece indiretamente como vendedora no Zoom/Buscapé |
| Fast Shop, promoções Amazon | **Bloqueado (503)** / SPA | |
| Mercado Livre | Bloqueado | API exige OAuth (403); site pede verificação |
| Americanas, Google Shopping, TikTok | Sem preços | renderização só via JS |
| Discord/WhatsApp, Lomadee/Awin | Sem acesso | login/convite ou cadastro de afiliado |

**Não há API pública** para Dell, sites de cupons ou Mercado Livre — por isso é scraping de HTML.

## 5. Esquema do `dados-dell.json`
```json
{
  "ultimaAtualizacao": "2026-11-07T16:30:00-03:00",
  "ultimaAtualizacaoTexto": "07/11/2026 às 16:30 (horário de Brasília)",
  "cupons": [{
    "id", "codigo", "loja", "desconto", "descricao", "validade", "condicoes", "categoria",
    "fonte", "fonteUrl", "status"?, "ativo"?, "fontesExtras"?: [{"nome","url"}]
  }],
  "notebooks": [{
    "id", "nome", "loja", "vendedor"?, "linha", "modelo", "preco", "precoNum", "precoDe", "precoPrazo"?,
    "procFamilia", "ramGB", "armazenamento", "telaPol", "placaVideo", "sistema", "url", "specs": {"Processador": "...", ...},
    // derivados (enrich.py):
    "cpuModelo", "cpuFamilia", "cpuSufixo", "cpuGeracao", "cpuPerfil", "gpuModelo", "gpuDedicada",
    "telaResW", "telaRes", "telaHz", "telaOled", "pesoKg", "armazGB", "precoDeNum", "descontoPct"
  }]
}
```
- **ids estáveis** (favoritos e selo "novo" dependem disso): Dell = SKU; KaBuM! = `kabum-<código>`; Amazon = `amazon-<ASIN>`; VTEX = `vtex-<loja>-<productId>`; Zoom/Buscapé = `zb-<id da oferta>`; cupom = código.
- Campo desconhecido → `""`/`null` (página mostra "não informado"). **Nunca inventar** código, preço ou URL.
- `descontoPct = (De − Por) ÷ De × 100`, só quando a loja mostra "De". Preço a prazo da KaBuM! **não** conta como desconto.
- Status dos cupons: códigos iguais em vários sites são unidos; `status` = "Listado como ativo em…", "Conflito – ativo em X; expirado em Y", "Provavelmente expirado…" ou "Duvidoso…". `ativo=false` → oculto até marcar "mostrar expirados/duvidosos".

## 6. Campos derivados (`enrich.py`)
Extraídos só do texto do anúncio/ficha (nada é deduzido de código de modelo, exceto o padrão Dell `XX15-C5210H` que contém o processador explícito).
- **CPU**: Snapdragon X Plus/Elite; Core Ultra 5/7/9 + número + sufixo; Core i3/5/7/9 (geração ≥13 → "13ª ger. Intel", senão "antiga"); Core 3/5/7 série 1/2xx ("recente"); Ryzen (AI/3 dígitos/≥7000 → recente).
- **Perfil pelo sufixo**: U/G = Econômico (bateria); V = Eficiência (bateria); Snapdragon = Eficiência (ARM); P = Intermediário; H/HS = Desempenho; HX = Alto desempenho; sem sufixo = Não informado.
- **GPU**: RTX PRO nnnn, RTX nnnn (Ti); Integrada (UHD/Iris/Arc/Radeon xxxM/Adreno); "Dedicada (modelo não informado)".
- **Tela**: resolução (largura em px ou rótulos 4K/3K/QHD/FHD/HD), maior Hz entre 50–500, OLED.
- **Peso** 0,7–5 kg; **armazGB** (TB×1000).

## 7. Interface (`template.html`)
- **3 colunas** (`grid 1fr 1.7fr 1.05fr`; vira 1 coluna abaixo de 1100 px):
  1. **Cupons** — começa **recolhida** (`main.cupons-fechado`, botão expande/recolhe). Cada cupom: loja, código, desconto, validade, condições, fonte; botão **📋 Copiar** (clipboard API com fallback). Programas sem código têm "Resgatar no site da Dell".
  2. **Notebooks** — filtros no topo (Loja, Linha, Processador, **Perfil do processador** [U = economia … H/HX = desempenho], RAM mínima, armazenamento, tela, GPU, GPU dedicada, peso, preço máximo, desconto mínimo, ordenar, "Só promoções acima de 20%", Limpar). Lista em **grade de 2 colunas** (1 coluna < 700 px). Ordem padrão: custo-benefício (%) desc.
  3. **Detalhes** do notebook selecionado: specs, perfil, peso, tabela da nota item por item (linhas estimadas em amarelo), conta do custo-benefício e, no fim, botão **"Ver na <loja>"**.
- **Card**: ★ **favorito** no canto superior direito (localStorage `buscadorDell_favoritos`); favoritos **sempre no topo**, mesmo fora dos filtros, ordenados por custo-benefício %. Botão **"+"** (abaixo da estrela) expande o card com todas as informações ("−" fecha). Tags de perfil, GPU, selo **novo** (ids vistos em `buscadorDell_idsVistos`).
- **Promoção ≥20%**: classe `promo20` (borda/fundo laranja) e selo 🔥 -XX%.
- **Botão Atualizar**: só faz `fetch('dados-dell.json?ts=…')` da mesma pasta (funciona servido por HTTP, ex. `python3 -m http.server`). **Nunca abre abas.** Aberto como arquivo (`file://`, WhatsApp) mostra apenas um aviso para pedir "atualiza" no chat.
- Seção "Como a nota é calculada" gerada a partir do próprio objeto `NOTA` (sempre coerente com o código).

## 8. Nota de custo-benefício (exatamente como está no código)
Calculada no navegador; tabela `NOTA` no `template.html`. Mesma regra para todos.

**Processador (máx. 30)** = base da família + geração + sufixo
- Base: Core i3 4 · Core 3 5 · Core i5 7 · Ryzen 5 7 · Core 5 8 · Core i7 10 · Ryzen 7 10 · Core Ultra 5 10 · Snapdragon X Plus 10 · Core 7 11 · Core Ultra 7 13 · Snapdragon X Elite 13 · Core i9 14 · Ryzen 9 14 · Core Ultra 9 17
- Geração: recente +3 · 13ª ger. Intel +1 · antiga 0
- Sufixo: U/G 0 · Snapdragon (ARM) 2 · V 2 · P 4 · H/HS 8 · HX 10 (um U nunca passa um H da mesma família)

**Placa de vídeo (máx. 20)**: Integrada 3 · RTX 2050 6 · RTX PRO 500 8 · RTX 3050 8 · RTX PRO 1000 10 · RTX 4050 11 · RTX 5050 12 · RTX PRO 2000 13 · RTX 4060 14 · RTX 5060 15 · RTX PRO 3000 15 · RTX 4070 16 · RTX 5070 17 · RTX 5070 Ti 18 · RTX 4080 19 · RTX 5080 19 · RTX 4090 20 · RTX 5090 20

**RAM (máx. 15)** a partir de: 64 GB 15 · 32 GB 14 · 24 GB 12 · 16 GB 10 · 12 GB 7 · 8 GB 5 · 4 GB 2

**Armazenamento (máx. 10)**: ≥2 TB 10 · ≥1 TB 8 · ≥512 GB 6 · ≥256 GB 3 · ≥128 GB 1

**Tela (máx. 15)** = resolução (≥2880 px 8 · ≥2560 7 · ≥1920 5 · ≥1366 2) + OLED 2 + Hz (≥240 4 · ≥144 3 · ≥90 2 · qualquer 1) + tamanho ≥15" 1

**Totais**
- Bruto = soma das 5 partes (cada uma limitada ao seu máximo), máx. 90.
- Pontuação = bruto ÷ 90 × 100 (1 casa).
- CB = pontuação ÷ (preço ÷ 1000) → pontos por R$ 1.000.
- **CB% = CB ÷ maior CB da lista × 100** (melhor notebook = 100%).
- **Dado ausente**: a subparte (procBase, procGer, procSuf, gpu, ram, armaz, telaRes, telaHz, telaTam) recebe a **média dessa subparte entre os notebooks que têm o dado** (1 casa), e a linha fica **amarela** ("estimado"). OLED ausente = 0.
- **Desconto NÃO entra na nota** (só serve para selo, filtro e ordenação "Maior desconto").
- Para mudar pesos: editar só `NOTA` no `template.html` e rodar `gerar_html.py`.

## 9. Restrições e limitações conhecidas
- **CORS**: um HTML local não consegue buscar outros sites; por isso a coleta é feita fora (pipeline) e o botão só recarrega o JSON.
- Sem APIs públicas (Dell, cupons, Mercado Livre); scraping pode quebrar se o HTML mudar.
- **KaBuM! aceita só 1 cupom por pedido** (ex.: notebook e memória em pedidos separados).
- Usar o **preço da página do produto** (preço de campanha), não o da listagem, que às vezes fica com o preço antigo. KaBuM!: PIX = `priceWithDiscount`, a prazo = `price`.
- Cupons só entram se o código aparece **completo** na fonte; validade vencida é removida; o nome do código (ex. "10" em VIRAPRIME10) não é fonte do desconto.
- X/Telegram, termos dos cupons Amazon (dicionário `AMZ`) e ASINs novos são **curadoria manual** em `build_lojas.py`.
- localStorage é por origem: abrir o arquivo por outro caminho/app pode zerar favoritos.

## 10. Como atualizar
```bash
cd /workspace && bash dell-scraper/atualizar_tudo.sh
# conferir: tail dell-scraper/ultimo_refresh.log  →  "✔ dados-dell.json e cupons-dell.html atualizados"
```
Só mudou o visual/pesos? `python3 dell-scraper/gerar_html.py`.

## 11. Instruções para o Claude
Regras: responder/rotular em português; nunca inventar preço, código ou URL; manter ids estáveis; manter o HTML único e offline (dados embutidos via `__DADOS__`); o botão Atualizar nunca abre abas; nada de atualização automática.

Prompt pronto:
```
Você vai manter o projeto "Buscador de Cupons e Notebooks Dell" descrito em logica-cupons-dell.md.
1. Leia o documento inteiro e os scripts em dell-scraper/.
2. Preserve: 3 colunas (cupons recolhidos com botão copiar | notebooks em grade de 2 colunas com filtros, incluindo perfil do processador U=economia, H/HX=desempenho | painel de detalhes com link no fim), estrela de favorito no canto superior direito (favoritos no topo, ordenados por custo-benefício %), botão "+" que expande o card, destaque de promoções ≥20%, botão Atualizar que só recarrega dados-dell.json.
3. Preserve a nota de custo-benefício exatamente como na seção 8 (objeto NOTA), com média para dados ausentes destacada em amarelo e desconto fora da nota.
4. Melhorias sugeridas: [descreva aqui]. Ao terminar, rode `bash dell-scraper/atualizar_tudo.sh`, confirme a validação e mostre quantos notebooks e cupons entraram e quais fontes falharam.
```
