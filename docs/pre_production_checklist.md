# 🚀 Pre-Production Checklist (Go-Live)
Esta checklist dita os passos que tomaremos antes de declarar o sistema apto para os primeiros Testes em ambiente produtivo ou Beta (Homologação).

> **Alinhamento do Tech Lead:** Nós devemos executar e marcar os pontos como "[x]" apenas depois de ativamente auditarmos a aplicação e o servidor.

## 1. Segurança e Configuração Base (`settings.py` / `.env`)
- [ ] Garantir que `DEBUG = False` (Crítico contra vazamento de código/arquitetura em error pages).
- [ ] Validar `ALLOWED_HOSTS` do Backend (Não usar `*`, colocar domínio oficial).
- [ ] Validar `CORS_ALLOWED_ORIGINS` (Permitir requests pré-flight apenas do front-end Vercel/S3).
- [ ] Validar Env Vars Sensíveis (Averiguar se `ASAAS_API_KEY`, `BITRIX...`, chaves do `VideoSDK` estão no cofre de injeção da hospedagem - Railway/Render/AWS).
- [ ] Validar Rotação / Geração de nova chave criptográfica `SECRET_KEY` para o Django (Não usar a de Dev).

## 2. Integridade e Limpeza de Banco de Dados (PostgreSQL/Supabase)
- [ ] Confirmar Aplicação das Migrações de Limpeza. (Validação de exclusão das tabelas legadas do MP e Daily).
- [ ] Validação de Backup Job ativo no Database provider.

## 3. Homologação Funcional e Fluxos
- [ ] **Fluxo de Onboarding:** Fazer 1 cadastro mockado de Paciente (confirmar que contato Bitrix gerou corretamente).
- [ ] **Fluxo de Onboarding Médico:** Médico cadastra CPF, agenda horários padrão.
- [ ] **Fluxo Financeiro (Asaas Sandbox/Prod):** Gerar fatura, simular pagamento PAGO, checar se Webhook pingou o backend e se o Status de Banco foi atualizado atomicamente para `APPROVED`.
- [ ] **Fluxo de Telemedicina:** Entrar em call Médico x Paciente no VideoSDK (testar unmount/fechamento das câmeras e travas de JWT).

## 4. Performance & Build Frontend
- [ ] Rodar npm build local (Garantir que Vite ou TSC compile sem warnings mortais bloqueantes).
- [ ] Validar peso de imagem de Container Backend (Docker, se pertinente) ou otimização de `gunicorn`.
- [ ] Confirmar se Static Files do Django (`collectstatic`, app Admin) estão rolando bem com `WhiteNoise` ou S3.
