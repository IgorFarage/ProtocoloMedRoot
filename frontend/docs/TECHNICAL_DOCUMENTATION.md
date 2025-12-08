# Documentação Técnica — ProtocoloMED (Frontend)

Este documento detalha a arquitetura, decisões técnicas, estrutura de componentes, padrões e instruções avançadas para desenvolvedores que trabalham no frontend.

## 1. Resumo da Arquitetura

- Framework: React (com TypeScript)
- Bundler: Vite
- Estilização: TailwindCSS
- Organização: Component-driven, com pastas para `components`, `pages`, `hooks`, `auth` e `lib`.

A aplicação é uma SPA onde as rotas principais correspondem a páginas em `src/pages/`.

## 2. Estrutura dos Componentes

- `src/components/ui/` — componentes de interface reutilizáveis (botões, inputs, toasts, tabelas, etc.).
- `src/components/home/` — seções específicas da página inicial (Hero, CTA, Benefits, HowItWorks, Results).
- `src/pages/` — componentes que representam páginas/rotas inteiras (Dashboard, Login, Questionnaire, NotFound).
- `src/auth/AuthProvider.tsx` — contexto/provedor de autenticação e gerenciamento de sessão.
- `src/components/ProtectedRoute.tsx` — wrapper para rotas protegidas que verifica autenticação.

## 3. Fluxos importantes

- Autenticação: o `AuthProvider` expõe estado `user` e métodos `login`, `logout`. Os tokens devem ser armazenados de forma segura (preferência: cookies HttpOnly no backend). No frontend, minimize armazenamento de tokens em localStorage.

- Formulários: usar validação no frontend antes de enviar ao backend; preferir bibliotecas como `react-hook-form` para escalabilidade.

## 4. Convenções de Código

- Tipagem: usar `interface`/`type` claramente para props e estados.
- Componentes: separar componentes `presentational` (apenas UI) de `container` (lógica/integração).
- Hooks: lógica reutilizável em `src/hooks/` com nomes que começam por `use`.
- Estilos: classes utilitárias do Tailwind; evitar estilos inline complexos.

## 5. Scripts e Build

- Desenvolvimento: `npm run dev` (dentro de `frontend/`)
- Build produção: `npm run build`
- Preview: `npm run preview`

O build gerado por Vite é otimizado e pronto para servir por um servidor estático (ex.: Netlify, Vercel, Azure Static Web Apps).

## 6. Deploy sugerido

- Plataformas: Vercel, Netlify, AWS S3 + CloudFront, ou Azure Static Web Apps.
- Recomendação: adicionar pipeline CI que executa `npm ci`, `npm run build`, e valida `lint` e testes.

## 7. Testes

- Atualmente não há estrutura explícita de testes no repositório (ex.: Jest/React Testing Library). Recomenda-se adicionar testes unitários para componentes críticos e testes E2E (Cypress) para fluxos principais.

## 8. Boas práticas de segurança

- Nunca commitar `.env` com segredos.
- Limitar exposição de chaves públicas (usar backend para chamadas que exigem segredos).
- Validar todas as entradas do usuário no backend.

## 9. Observações sobre performance

- Utilizar lazy-loading para rotas pesadas (React.lazy + Suspense) para reduzir bundle inicial.
- Analisar bundles com ferramentas como `rollup-plugin-visualizer` ou `source-map-explorer`.

## 10. Checklist antes de PR

- [ ] Código formatado (Prettier)
- [ ] Lint sem erros
- [ ] Tipagens cobrem os novos módulos
- [ ] Testes adicionados/cobertura atualizada (se aplicável)
- [ ] Documentação atualizada (README/docs)

## 11. Próximos passos recomendados

- Adicionar `CONTRIBUTING.md` com fluxo de trabalho claro.
- Incluir integração contínua (GitHub Actions) rodando lint, build e testes.
- Implementar testes unitários básicos e E2E.

---

Para dúvidas sobre um componente específico, abra um issue ou PR com a pergunta e referências ao arquivo em `src/components/...`.
