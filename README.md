# Tudo-Busca — Buscador de Cupons e Ofertas

Página com cupons de desconto e **computadores de qualquer marca** — notebooks, MacBooks, PCs de mesa/gamer, all-in-one, mini PCs e Macs — de várias lojas (Dell.com, KaBuM!, Amazon, iByte, WAZ, Webcontinental, Lojas MM, Multilaser e as ofertas do Zoom/Buscapé), com filtros (tipo, marca, loja, processador…), foto, nota de custo-benefício e lista de 50 em 50.

No topo há **cards de seleção**: **💻 Computadores** (tudo acima) e **🎮 Games** (sub-cards **Consoles** — em breve — e **Acessórios**, hoje com **Controles de PS5**: DualSense, DualSense Edge, Access e controles compatíveis de outras marcas). A coluna de **cupons muda conforme o card escolhido**: mostra só as lojas e as categorias de cupom que valem para aquela seleção (ex.: em Controles de PS5, cupons de games e da loja toda da KaBuM!, AliExpress, Shopee, Amazon, Magalu…). Cada oferta de games mostra, nos detalhes, os cupons da loja que podem valer.

**Endereço:** https://tudo-busca.onrender.com

## Apps
- **Celular e computador (qualquer sistema):** abra o endereço e toque em **Instalar app** (no iPhone: Compartilhar → Adicionar à Tela de Início). Funciona sem internet com os últimos dados.
- **Android (APK) e Windows (instalador .exe):** página [Releases](../../releases/latest) do repositório, gerados pelo workflow `Gerar apps` (`apps/android`, `apps/computador`).

## Como funciona
- `cupons-dell.html` — a página. Funciona aberta pelo endereço acima **ou** como arquivo (WhatsApp, pasta do celular): os dados vêm embutidos e a seta ⟳ pede preços novos ao servidor.
- `servidor/` — servidor (Python/FastAPI) que, quando alguém toca na seta, busca os preços atuais nas lojas (cerca de 30 segundos).
  - `app.py` — endereços: `/` (página), `/api/dados`, `POST /api/atualizar`, `/api/status`.
  - `coleta/` — um arquivo por loja (`dell.py`, `kabum.py`, `amazon.py`, `vtex.py`, `zoom.py`), `classifica.py` (tipo, marca, linha e filtro de acessórios/usados), `enrich.py` (processador, GPU, tela…) e `orquestrador.py` (junta tudo, valida e limita a 1.500 computadores).
  - `coleta/categorias.py` — catálogo das seções que não são computador (seção → sub-card → item) e a classificação de cada item (ex.: é mesmo um controle de PS5? original Sony ou compatível? exclui capas, peças, carregadores, usados).
  - `coleta/games.py` — busca de cada item nas lojas: KaBuM!, Zoom/Buscapé, AliExpress, iByte/Webcontinental/Lojas MM (VTEX), e tentativas em Shopee, Temu e Mercado Livre.
- `servidor/embutir.py` — embute `dados/dados.json` no `cupons-dell.html` (para a página funcionar offline com os dados novos).
- `dados/dados.json` — dados iniciais (usados quando o servidor reinicia).
- `dados/banco.json` — **banco de dados de produtos**: tudo o que já se descobriu de cada computador (por produto e por código do modelo), mais o histórico de preços. Cada coleta aprende com os anúncios e completa o que falta neles com o que o banco já sabe.
- `logica-cupons-dell.md` — documentação da lógica original: fontes, esquema dos dados, interface e cálculo da nota.

## Categorias e dados que faltam
- Cada computador ganha uma categoria, calculada só com o que se sabe dele: **Entrada · Básico · Intermediário · Gamer · Avançado · Topo de linha**.
- Dado que falta no anúncio: 1º vem do **banco de dados** (mesmo produto ou mesmo modelo em outra loja; marcado como "completado pelo banco"); 2º, se não houver, do **computador típico da categoria** (tabela `PADRAO` em `cupons-dell.html`), em amarelo como "estimado".

## Regras da coleta
- Se uma loja não responde, ficam os preços anteriores dela, com o aviso "preço de coleta anterior".
- Se **nenhuma** loja responde, nada muda.
- Item já conhecido só recebe preço novo (ids estáveis: favoritos continuam valendo).
- Item novo passa pela extração automática. Ficam de fora: acessórios, peças, usados/recondicionados e modelos antigos (notebook: Intel ≤ 12ª, Ryzen ≤ 5000, Celeron/Pentium; desktop: Intel ≤ 11ª, Ryzen ≤ 3000; DDR3; Windows 10). Apple M1 continua.
- Custo-benefício: cada produto é comparado com o melhor do mesmo grupo (notebooks, PCs de mesa ou all-in-one). PC sem tela não usa o item Tela da nota.
- Coletas seguidas têm intervalo mínimo de 5 minutos (para não incomodar as lojas).
- Cupons: lidos do **Méliuz** para ~25 lojas (KaBuM!, Amazon, Dell, Magalu, Casas Bahia, Mercado Livre, Lenovo, Samsung, Acer, Asus, HP, Pichau…), só com código completo na página. Cuponomia e CupoNation ficam de fora porque escondem o código. Cupom que some da fonte vira "não apareceu na última coleta"; validade vencida deixa de aparecer.

## Games (Controles de PS5)
- **Para incluir um tipo novo** (ex.: headsets, consoles): no servidor, um item em `ITENS` (`coleta/categorias.py`) com os termos de busca e a função que reconhece o produto; na página, o item/sub-card em `SECOES` (`cupons-dell.html`).
- **Nota de oferta (0–100):** compara o preço com o preço típico (mediana) do mesmo modelo em todas as lojas da coleta: no típico = 50; 20% abaixo = 100; 20% acima = 0. Kits (controle + jogo/base) não entram na comparação. O "De → Por" da loja aparece no selo, mas não muda a nota.
- Por padrão a lista mostra **só originais Sony**; desmarcando, aparecem os compatíveis de outras marcas. Em marketplaces "original" é o que o vendedor diz.
- **Lojas** (testadas em 11/11/2026): KaBuM! ✔, Zoom/Buscapé ✔ (ofertas de Amazon, Magalu, Fast Shop…), AliExpress ✔, iByte/Webcontinental ✔. **Shopee** (HTTP 403 na API de busca), **Temu** (desafio em JavaScript) e **Mercado Livre** (verificação anti-robô) recusam buscas automáticas: são tentadas a cada coleta e, se recusarem, ficam os anúncios da coleta anterior (hoje nenhum).
- Cupons: Méliuz agora inclui **Temu** (em 11/11/2026 o Méliuz não tinha nenhum cupom da Temu com código). As categorias dos cupons foram refinadas: Computadores, Games, Informática, Loja toda, Produtos selecionados, Geral (não cita produto) e Outros produtos.

## Pendente
- KaBuM! e Amazon pelo GitHub Actions: falta a autorização (token). Passo a passo em [`docs/autorizacao-github.md`](docs/autorizacao-github.md).

## Limitações
- Plano gratuito do Render: o servidor "dorme" após 15 min sem uso; o primeiro toque na seta pode levar ~1 minuto para acordá-lo.
- Ao reiniciar, o servidor volta aos dados iniciais; a página guarda no aparelho a última coleta vista.
- A Dell às vezes recusa parte das páginas (bloqueio por excesso de pedidos); essas ficam com o preço anterior.

## Rodar localmente
```bash
pip install -r servidor/requirements.txt
cd servidor && uvicorn app:app --port 8000   # abra http://localhost:8000
python -m coleta.orquestrador ../dados/dados.json /tmp/coleta.json   # testar a coleta (grava o resultado em /tmp/coleta.json)
python embutir.py   # depois de atualizar dados/dados.json: embute os dados na página
```
O teste da coleta também roda no GitHub Actions (`Testar coleta de preços`). Disparado manualmente num branch `ccr-*`, ele também grava a coleta como dados iniciais (`dados/dados.json`).
