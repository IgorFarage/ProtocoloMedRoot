# PROTOCOLOMED — Frontend

Documentação técnica e operacional do frontend PROTOCOLOMED. Este documento descreve arquitetura, configuração, comandos de desenvolvimento, modelo de dados, integração sugerida com backend e boas práticas para contribuir.

---

Sumário

- Visão geral
- Estrutura do repositório
- Tecnologias e versões recomendadas
- Como rodar (desenvolvimento / build / preview)
- Configuração do ambiente
- Rotas e fluxo de navegação
- Modelo de dados (submissões)
- Autenticação (atual) e recomendações de segurança
- Integração com backend (API sugerida)
- Testes, lint e CI/CD (recomendações)
- Deploy
- Troubleshooting comum
- Contribuição

---

## Visão geral

O frontend é uma aplicação single-page (SPA) construída com Vite + React + TypeScript. Fornece:

- Página pública (informativa) e landing
- Questionário para pacientes com upload de fotos (client-side)
- Login simples por "papel" (Paciente / Médico) para protótipo
- Dashboard para médicos que lista submissões de pacientes (armazenadas em `localStorage` no protótipo)

O objetivo deste repositório é servir como base para um produto, permitindo um caminho claro para integração com um backend e armazenamento persistente.

## Estrutura do repositório

- `src/`
	- `pages/` — páginas da aplicação (`Index`, `Questionnaire`, `Login`, `Dashboard`)
	- `components/` — componentes reutilizáveis (`Header`, `ProtectedRoute`, etc.)
	- `auth/` — provedor de autenticação (`AuthProvider.tsx`)
	- `main.tsx`, `App.tsx` — bootstrap e roteamento
- `public/` — recursos estáticos servidos na raiz (favicon, imagens)
- `dist/` — build de produção (gerado por `npm run build`)
- `package.json`, `tsconfig.*.json`, `vite.config.ts` — configuração do projeto

## Tecnologias e versões recomendadas

- Node.js: 16 LTS ou superior
- npm: 8.x ou superior
- Vite: compatível com a versão no `package.json`
- TypeScript: conforme `devDependencies`

Recomenda-se usar `nvm` (Node Version Manager) para garantir versão consistente.

## Como rodar (desenvolvimento / build / preview)

1. Instalar dependências

```powershell
cd frontend
npm ci
```

2. Rodar em modo desenvolvimento

```powershell
npm run dev
# abrir http://localhost:5173 (porta pode variar)
```

3. Gerar build de produção

```powershell
npm run build
```

4. Servir build local (preview)

```powershell
npm run preview
```

Observações:

- Use `npm ci` em CI para instalações reprodutíveis.
- Se houver problemas com tipos TypeScript, rode `npm ci` e, se necessário, instale tipos adicionais (`npm i -D @types/node`).

## Configuração do ambiente

Este frontend não exige variáveis de ambiente por padrão. Ao integrar com backend, adicione um `.env` (não comite em VCS) com, por exemplo:

```env
VITE_API_BASE_URL=https://api.seudominio.com
```

No código, acesse com `import.meta.env.VITE_API_BASE_URL`.

## Rotas e fluxo de navegação

- `/` — Home
- `/login` — Seleção de papel (Paciente ou Médico) e login client-side
- `/questionario` — Questionário do paciente com etapas e upload de fotos
- `/dashboard` — Dashboard médico (protegido por `ProtectedRoute`)

Rotas são definidas em `src/App.tsx` usando `react-router`.

## Modelo de dados: submissões (prototipo)

Quando o paciente finaliza o questionário, o frontend persiste um objeto em `localStorage` na chave `submissions`.

Formato (exemplo):

```json
[
	{
		"id": "1672531200000",
		"patientName": "João Silva",
		"timestamp": 1672531200000,
		"answers": {
			"age": "26-35",
			"hairLoss": "moderate",
			"pattern": "crown",
			"family": "no",
			"previous": "otc",
			"health": "none"
		}
	}
]
```

Observação: fotos atualmente não são persistidas no protótipo (só previews locais). Para produção, salve fotos em storage (S3) e armazene URLs no backend.

## Autenticação (atual) e recomendações de segurança

- Implementação atual: `AuthProvider` em `src/auth/AuthProvider.tsx` armazena `auth_user` em `localStorage` e provê `login(user)`/`logout()`.
- Limitações:
	- Autenticação client-side sem verificação de identidade (apenas para protótipo)
	- Dados em `localStorage` são facilmente manipuláveis

Recomendações para produção:

1. Implementar backend de autenticação (OAuth2, OpenID Connect, ou JWT com refresh tokens).
2. Usar HTTPS e cookies `HttpOnly`/`Secure` para tokens de sessão (evitar `localStorage` para tokens sensíveis).
3. Validar papéis e permissões no backend (ex.: middleware que garante `role: doctor` para endpoints de listagem de submissões).

## Integração com backend (API sugerida)

Endpoins mínimos recomendados:

- `POST /api/auth/login` — retorna token e dados do usuário
- `GET /api/submissions` — listagem de submissões (Médicos)
- `GET /api/submissions/:id` — detalhes de submissão
- `POST /api/submissions` — criar submissão (Paciente)
- `POST /api/uploads` — upload de arquivos (retorna URL)

Exemplo de payload de submissão (cliente -> servidor):

```json
{
	"patientName": "João Silva",
	"answers": { "age": "26-35", "hairLoss": "moderate" },
	"photos": ["https://storage.example.com/uploads/1.jpg"]
}
```

Recomendações:

- Use autenticação baseada em tokens (JWT) ou sessões.
- Proteja endpoints com verificação de role/permission.
- Armazene uploads em bucket com políticas adequadas e gere URLs assinadas quando necessário.

## Testes, lint e CI/CD (recomendações)

- Lint: configurar ESLint com regras para TypeScript/React.
- Formatação: use Prettier com config compartilhada.
- Testes: adicione testes unitários com Vitest/Jest e testes e2e com Playwright or Cypress.
- CI: configurar pipeline (GitHub Actions) com steps: `install`, `lint`, `test`, `build` e `deploy`.

Exemplo de job minimal no GitHub Actions:

```yaml
name: CI
on: [push, pull_request]
jobs:
	build:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- uses: actions/setup-node@v4
				with:
					node-version: '18'
			- run: npm ci
			- run: npm run lint
			- run: npm test
			- run: npm run build
```

## Deploy

O projeto é compatível com plataformas de hosting estático (Vercel, Netlify, AWS S3 + CloudFront, GitHub Pages). Para deploy:

1. Configure build command: `npm run build`.
2. Aponte a pasta de publicação para `dist/`.
3. Defina variáveis de ambiente para produção (por exemplo `VITE_API_BASE_URL`).

## Segurança e privacidade

- Não armazene dados sensíveis no `localStorage` em produção.
- Criptografe dados sensíveis no backend e aplique controles de acesso rígidos.
- Ao lidar com imagens de pacientes, siga regulamentações locais de privacidade (LGPD/GDPR).

## Troubleshooting comum

- TS server acusa tipos faltando (`Cannot find type definition`): rode `npm ci` e instale `@types/*` necessários. Reinicie o TS server no VS Code.
- Favicon não atualiza: verifique `public/logoPH.png`, reinicie dev server e faça hard refresh (Ctrl+F5).
- Build falha por "use client" warnings: mensagens informativas — verifique compatibilidade de pacotes ou atualize bundler/packs.

## Contribuição

- Fork → branch com nome `feature/<descrição>` → PR com descrição clara.
- Siga guia de estilo (ESLint/Prettier) e adicione testes para mudanças críticas.

## Próximos passos de engenharia sugeridos

1. Substituir persistência local por backend e storage de arquivos.
2. Implementar autenticação segura e autorização baseada em papéis.
3. Adicionar testes unitários e e2e e integrar CI/CD.

---

Se desejar, eu posso gerar um backend mock com `json-server` ou um exemplo mínimo em Express para demonstrar integração (endpoints para `submissions` e `uploads`). Diga qual opção prefere e eu preparo os artefatos e instruções.
