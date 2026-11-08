# Tudo-Busca — Buscador de Cupons e Computadores

Página com cupons de desconto e **computadores de qualquer marca** — notebooks, MacBooks, PCs de mesa/gamer, all-in-one, mini PCs e Macs — de várias lojas (Dell.com, KaBuM!, Amazon, iByte, WAZ, Webcontinental, Lojas MM, Multilaser e as ofertas do Zoom/Buscapé), com filtros (tipo, marca, loja, processador…), foto, nota de custo-benefício e lista de 50 em 50.

**Endereço:** https://tudo-busca.onrender.com

## Como funciona
- `cupons-dell.html` — a página. Funciona aberta pelo endereço acima **ou** como arquivo (WhatsApp, pasta do celular): os dados vêm embutidos e a seta ⟳ pede preços novos ao servidor.
- `servidor/` — servidor (Python/FastAPI) que, quando alguém toca na seta, busca os preços atuais nas lojas (cerca de 30 segundos).
  - `app.py` — endereços: `/` (página), `/api/dados`, `POST /api/atualizar`, `/api/status`.
  - `coleta/` — um arquivo por loja (`dell.py`, `kabum.py`, `amazon.py`, `vtex.py`, `zoom.py`), `classifica.py` (tipo, marca, linha e filtro de acessórios/usados), `enrich.py` (processador, GPU, tela…) e `orquestrador.py` (junta tudo, valida e limita a 1.500 produtos).
- `dados/dados.json` — dados iniciais (usados quando o servidor reinicia).
- `logica-cupons-dell.md` — documentação da lógica original: fontes, esquema dos dados, interface e cálculo da nota.

## Regras da coleta
- Se uma loja não responde, ficam os preços anteriores dela, com o aviso "preço de coleta anterior".
- Se **nenhuma** loja responde, nada muda.
- Item já conhecido só recebe preço novo (ids estáveis: favoritos continuam valendo).
- Item novo passa pela extração automática. Ficam de fora: acessórios, peças, usados/recondicionados e modelos antigos (notebook: Intel ≤ 12ª, Ryzen ≤ 5000, Celeron/Pentium; desktop: Intel ≤ 11ª, Ryzen ≤ 3000; DDR3; Windows 10). Apple M1 continua.
- Custo-benefício: cada produto é comparado com o melhor do mesmo grupo (notebooks, PCs de mesa ou all-in-one). PC sem tela não usa o item Tela da nota.
- Coletas seguidas têm intervalo mínimo de 5 minutos (para não incomodar as lojas).
- Cupons com validade vencida deixam de aparecer. Os cupons em si ainda **não** são recoletados automaticamente.

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
python -m coleta.orquestrador ../dados/dados.json   # só testar a coleta
```
O teste da coleta também roda no GitHub Actions (`Testar coleta de preços`). Disparado manualmente num branch `ccr-*`, ele também grava a coleta como dados iniciais (`dados/dados.json`).
