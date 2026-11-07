# Pendente: autorização do GitHub para KaBuM! e Amazon

**Situação (07/11/2026):** o servidor no Render não consegue ler a KaBuM! nem a Amazon, que recusam pedidos vindos dele.
No GitHub Actions essas duas lojas funcionam. A solução combinada é a seta ⟳ também disparar uma coleta no
GitHub Actions e o servidor buscar o resultado de lá (uns 30 s a mais). Para isso o servidor precisa de um
**token do GitHub** (uma senha só para essa tarefa).

**Combinado:** o Jefferson faz no computador (segunda-feira, 09/11/2026) e pede ao Claude o passo a passo de novo.
Depois que o token estiver salvo no Render, o Claude implementa a parte do servidor e do workflow.

## Passo a passo (no computador)

### 1. Criar o token no GitHub
1. Entre em https://github.com/settings/personal-access-tokens/new
   (ou: foto do perfil → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**).
2. **Token name:** `tudo-busca-coleta`
3. **Expiration:** 1 ano (ou o prazo que preferir; quando vencer, é só gerar outro).
4. **Repository access:** *Only select repositories* → escolha **Tudo-Busca**.
5. **Permissions → Repository permissions:**
   - **Actions:** *Read and write* (para disparar a coleta e ler o resultado)
   - **Metadata:** *Read-only* (o GitHub marca sozinho)
   - Nada mais.
6. Clique em **Generate token** e **copie** o código que aparece (começa com `github_pat_`). Ele só é mostrado uma vez.

### 2. Salvar o token no Render
1. Entre em https://dashboard.render.com e abra o serviço **tudo-busca**.
2. Menu **Environment** → **Add Environment Variable**.
3. **Key:** `GITHUB_TOKEN_COLETA` — **Value:** cole o token.
4. **Save Changes** (o Render reinicia o servidor sozinho).

### 3. Avisar o Claude
Diga "pronto, salvei o token". **Não** cole o token no chat.

## O que o Claude faz depois
- Workflow `coleta-externa.yml` (disparo manual pela API): roda só KaBuM! e Amazon e salva o resultado como artefato.
- Servidor: ao tocar na seta, dispara esse workflow com o token, espera terminar e junta KaBuM!/Amazon com o resto.
- Sem token (ou se o GitHub falhar), tudo continua como hoje: preço anterior com o aviso.
