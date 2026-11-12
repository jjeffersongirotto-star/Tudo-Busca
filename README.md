# Tudo-Busca — Buscador de Cupons e Ofertas

Página com cupons de desconto e **computadores de qualquer marca** — notebooks, MacBooks, PCs de mesa/gamer, all-in-one, mini PCs e Macs — de várias lojas (Dell.com, KaBuM!, Amazon, iByte, WAZ, Webcontinental, Lojas MM, Multilaser e as ofertas do Zoom/Buscapé), com filtros (tipo, marca, loja, processador…), foto, nota de custo-benefício e lista de 50 em 50.

No topo há **cards de seleção**: **💻 Computadores** (tudo acima) e **🎮 Games** (sub-cards **Consoles** — em breve — e **Acessórios**, hoje com **Controles de PS5**: DualSense, DualSense Edge, Access e controles compatíveis de outras marcas). A coluna de **cupons muda conforme o card escolhido**: mostra só as lojas e as categorias de cupom que valem para aquela seleção (ex.: em Controles de PS5, cupons de games e da loja toda da KaBuM!, AliExpress, Shopee, Amazon, Magalu…). Cada oferta (games e computadores) mostra, nos detalhes, os cupons da loja que podem valer para ela, lendo o título **e as regras** de cada cupom:
  - **do item** (cita o próprio produto, ex.: "DualSense") e **gerais da loja** (não citam produto, categoria nem marca — ex.: "R$50 OFF em compras a partir de R$290" do AliExpress) entram como válidos;
  - **itens selecionados** ("produtos participantes", "seleção do link", "50% OFF em jogos e acessórios gamer selecionados") aparecem por último, como "confira se este item participa", sem preço estimado;
  - cupons de **outra categoria, produto ou marca** (ex.: "30% OFF no Samsung S26", "Produtos JBL", "PS5 Pro com R$500", código PHILCO50) ou cujas regras excluem a categoria **não aparecem** como válidos;
  - para cada cupom: ✔/✖ se o preço atinge a **compra mínima** (quando a regra informa) e o **preço estimado com o cupom** (preço − desconto, respeitando teto como "limitado a R$80"). O card mostra o menor preço estimado com um cupom do item ou geral. Sempre confira no carrinho.

**Endereço:** https://tudo-busca.onrender.com

## Apps
- **Celular e computador (qualquer sistema):** abra o endereço e toque em **Instalar app** (no iPhone: Compartilhar → Adicionar à Tela de Início). Funciona sem internet com os últimos dados.
- **Android (APK) e Windows (instalador .exe):** página [Releases](../../releases/latest) do repositório, gerados pelo workflow `Gerar apps` (`apps/android`, `apps/computador`).

## App novo (em construção) — `app/`

O site e os apps estão sendo reescritos num **código único** com Expo (React Native + TypeScript + expo-router):
o mesmo código gera o **site** e o **app Android nativo** (iOS depois). O servidor (`servidor/`) continua o mesmo.

- **Ver agora:** https://tudo-busca.onrender.com/novo — já com tudo do site atual (cards, filtros, notas, cupons do card, ⟳ por card, favoritos, cópia offline). O site atual continua em `/` até a troca.
- **Interface** em `app/src/ui/` (topo/cards, coluna de cupons, lista, especificações, regras); a mesma tela roda no navegador e no Android.
- **Lógica compartilhada** em `app/src/logica/` (nota/categorias/padrão, filtros, cupons, ofertas de games, junção de dados, versões),
  com testes em `app/tests/` que comparam o resultado com as funções da página antiga (`cupons-dell.html`) sobre um retrato dos dados.
- **Dados:** `app/src/dados/` — cliente do servidor (`/api/dados`, `/api/atualizar`, `/api/status`, `/api/versao`) e cópia offline
  guardada no aparelho (mesmas chaves da página antiga: favoritos, seleção e cache continuam).
- **Build web:** o GitHub (workflow *App novo*) refaz o build a cada mudança em `app/` e grava em `web-novo/`; o FastAPI serve em `/novo`.
  O Render não precisa de Node.

Rodar localmente:

```bash
cd app
npm install
npm test            # testes da lógica
npx expo start --web   # usa o servidor público; para um servidor local: EXPO_PUBLIC_API_URL=http://localhost:8000
npm run export:web  # gera web-novo/ (servido em /novo)
```

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

**A pesquisa (⟳) busca só o card selecionado:** em **Computadores**, só as lojas de computadores; em **Games / Acessórios / Controles de PS5**, só a coleta de games. Os cupons também são buscados só nas lojas daquela categoria. As outras categorias ficam como estavam. No servidor: `POST /api/atualizar?categoria=computadores|games` (sem categoria = todas), intervalo mínimo de 5 min **por categoria**, uma coleta por vez (a outra espera "na fila") e `GET /api/status?categoria=…` com o andamento. Cada categoria tem a sua data (`atualizacaoPorSecao`); ao juntar a cópia embutida, a guardada no aparelho e a do servidor, a página usa, **categoria por categoria**, a mais recente. Loja que falha mantém o preço anterior (marcado "preço da coleta anterior").

## Versões e aviso de atualização

Ao tocar em **⟳**, a página consulta o servidor (`/api/versao`) para saber se há versão nova:

| Onde o app roda | O que acontece |
|---|---|
| Navegador no computador ou no celular (inclusive app instalado pelo navegador) | **nunca trava**: a busca começa na hora. Se a página estiver desatualizada, o app se atualiza em segundo plano (vale na próxima abertura) e aparece só uma dica pequena com **Recarregar agora** e ✕ para fechar |
| Página aberta como arquivo (WhatsApp, pasta do celular) | **nunca trava**: busca na hora e mostra uma dica pequena com **Baixar** a página nova / abrir o site |
| APK Android / app do Windows baixados | se o app instalado estiver atrás do último [Release](https://github.com/jjeffersongirotto-star/Tudo-Busca/releases/latest): aviso **"🆕 Nova versão disponível"** com **Baixar a versão nova**, e a busca fica pausada até instalar. Se só a página mudou, mostra a dica pequena e busca normalmente |

Sem internet, servidor fora ou GitHub sem resposta, a busca segue normalmente (não trava).

**Como a versão é definida (automático):**
- Página: `const VERSAO_APP = 'AAAA.MM.DD.HHMM-hash'` em `cupons-dell.html` e a mesma em `web/sw.js` — data/hora (Brasília) da mudança + hash do código. Recoletar ou embutir dados **não** muda a versão.
- Não precisa lembrar: o workflow **Versão do app** carimba sozinho na `main` sempre que o código da página muda (e avisa nos PRs). Para carimbar na mão: `python servidor/versao.py --carimbar` (`--conferir` só verifica).
- APK e Windows: versão `1.0.<número da execução>` do workflow **Gerar apps**, igual à tag do Release (`apps-v1.0.N`). Os apps informam a versão instalada à página (`?shell=1.0.N`); APKs/instaladores anteriores a esta mudança não informam, então só recebem o aviso de página nova.

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
