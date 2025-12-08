# Contributing — ProtocoloMED

Obrigado por contribuir! Este documento descreve o fluxo de trabalho esperado para contribuir com o frontend.

## Fluxo de trabalho

1. Fork o repositório (se aplicável) e crie uma branch baseada em `master`:

```
git checkout -b feat/minha-nova-funcionalidade
```

2. Siga as convenções de commit (Conventional Commits):

- `feat:` para novas funcionalidades
- `fix:` para correções de bugs
- `docs:` para mudanças em documentação
- `chore:` para tarefas sem alteração de código de produção

Exemplo: `git commit -m "feat: adicionar botão de exportação"`

3. Abra um Pull Request contra `master` com descrição clara e checklist.

## Revisão de código

- Inclua descrições claras do que o PR resolve.
- Vincule issues quando relevante.
- Adicione screenshots ou passos para testar quando o PR altera UI.

## Requisitos antes do merge

- Lint/format passing
- Testes adicionados para funcionalidades críticas
- Aprovação de pelo menos um revisor (ou as regras do time)

## Estilo de código

- Mantenha a base em TypeScript estrito quando possível.
- Use Prettier e ESLint conforme regras do projeto.

## Segurança

- Não incluir credenciais em commits.

## Perguntas

Se estiver em dúvida sobre arquitetura ou abordagem, abra uma issue para discutir antes de iniciar o trabalho grande.
