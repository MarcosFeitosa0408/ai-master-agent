# AI MASTER AGENT

**Acessar aplicativo publicado (Camada 1):** [AI MASTER AGENT — GitHub Pages](https://marcosfeitosa0408.github.io/ai-master-agent/)

> Esta versão oferece planejamento por regras locais e análise CSV no navegador; integração Claude, GitHub App e execução remota seguem pendentes.

Planejamento, desenvolvimento e execução inteligente. Frontend React (GitHub Pages) + backend FastAPI (Render).

## Estrutura
- `frontend/` React + Vite (visual dark azul/roxo, 7 módulos). Sem `VITE_API_URL` roda em modo local (dados no navegador).
- `backend/` FastAPI + SQLite. **Fase A**: planos, etapas, histórico, análise de CSV, status de integrações. **API privada bloqueada por padrão até configurar `API_TOKEN`.**
- `.github/workflows/` `ci.yml` (pytest, vitest, build) e `pages.yml` (deploy no GitHub Pages).
- `render.yaml` blueprint do backend.

## Rodar localmente
```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest -q
# Defina API_TOKEN com um valor forte no ambiente do terminal antes de expor a API.
uvicorn app.main:app --reload

# Em outro terminal:
cd frontend
npm ci
npm test
npm run dev
```

## Publicar
1. **Pages**: após revisar/mesclar a pull request, em Settings → Pages → Source, selecione **GitHub Actions**. O workflow publica apenas `frontend/dist`.
2. **Backend/Render (opcional nesta fase)**: `render.yaml` cria `API_TOKEN` privado automaticamente. Não exponha esse token ao navegador. O app publicado deve permanecer em **modo local** (`VITE_API_URL` vazia) até implementarmos autenticação segura de usuários (sessão/OAuth no backend). A API privada responde 401 sem a chave e 503 quando o token não foi configurado.
3. **Não** crie a variável pública `VITE_API_URL` nesta fase: isso faria o browser tentar acessar endpoints protegidos e quebraria o fluxo local. CORS não substitui autenticação.
4. O SQLite do plano gratuito do Render pode ser efêmero; configure armazenamento persistente antes de depender de dados guardados no backend.

## Roadmap
- **A** (feita): API, persistência SQLite, testes.
- **B**: GitHub App (listar repositórios, branch, commit, PR; nunca na main).
- **C**: Claude via backend (`ANTHROPIC_API_KEY` em variável de ambiente).
- **D**: execução de testes/código em sandbox isolado, autenticação completa.

Regras: nada de chaves no frontend; exclusões e publicações só com confirmação; nenhuma integração é apresentada como funcional antes de existir.

## Segurança / limitações verificáveis
- O backend exige `X-API-Key` igual a `API_TOKEN` para seus endpoints privados. Nunca use essa chave em `VITE_...`, em arquivos públicos ou em código Javascript do navegador.
- O frontend GitHub Pages continua operacional apenas **localmente no navegador**; seus controles de execução marcam status, não fazem commits, nem chamam modelos de IA.
- `GET /api/health` é público apenas para monitoramento; `GET /api/plans` exige autenticação. Não confunda a presença do Render com integração funcional no Artifact.
- Um próximo módulo de login seguro (sessão/OAuth/PKCE conforme desenho do backend) será necessário para conectar o frontend à API na internet.
- Não use `VITE_API_URL` para acesso administrativo direto e não armazene segredos no localStorage.


## Central de Dados avançada — integração com ERP Business Platform

A Central de Dados agora usa um motor derivado de MarcosFeitosa0408/erp-business-platform/import-core.js, mantendo o ERP original intocado. O frontend lê CSV, TSV, XLSX e XLS de até 20 MB; a biblioteca Excel está localmente em frontend/public/vendor/ com a licença preservada. Cada arquivo é lido no navegador; o mapeamento deve ser confirmado antes de calcular os KPIs.

- Permite revisar formatos de datas e números, receita bruta/líquida, descontos, estornos, custos e frete.
- Só remove duplicatas exatamente iguais com opção e confirmação explícitas. Rejeita datas e números inválidos e informa as linhas afetadas.
- KPIs empresariais, filtros, evolução mensal, rankings por empresa, loja, canal, categoria, status e forma de pagamento, tabela e exportação CSV/Excel.
- Guarda bases validadas no IndexedDB local e permite removê-las ou exportar backup JSON. Não mistura dados fictícios com reais.
- Sem todos os custos, resultado e margem são indisponíveis. Resultado não equivale a lucro líquido contábil. Em pagamentos, confirme se Valor_Transacao é bruto ou líquido antes de descontar Valor_Estornado.
- A Visão Geral apresenta resumo das bases, e os gráficos completos ficam na Central de Dados.
- Claude e automações remotas do GitHub continuam pendentes. Não publique credenciais ou dados pessoais no repositório.
