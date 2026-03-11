# Manifesto: As 5 Leis Imutáveis da Arquitetura ⚖️

Qualquer código ou alteração submetida ao repositório do ProtocoloMed deve, compulsoriamente, aderir às **5 Leis da Arquitetura**, definidas pela liderança técnica (Nível God Mode/Tech Lead). 
Qualquer violação detectada em Code Review ou Auditoria resultará na obrigatoriedade de refatoração imediata.

---

### 1. A Lei da Separação de Responsabilidades (SoC)
**"Vistas magras, Serviços Gordinhos" (Skinny Views, Fat Services).**
*   É terminantemente **PROIBIDO** misturar regras de negócio pesadas (comunicação com Bitrix, manipulação complexa do VideoSDK, lógicas de pagamento do Asaas) dentro de Rotas, Controllers ou Views.
*   Padrão Obrigatório: Todo app (e.g., `medical`, `financial`, `accounts`) deve ter seu arquivo/módulo `services.py` contendo a lógica central que pode ser reusada em testes, shells ou views independentes.

> ❌ **CRIME (The God View):** Realizar `requests.post` para o Asaas direto dentro do `checkout_view(request)`.
> ✅ **PERFEIÇÃO (The Service Layer):** A view apenas chama `AsaasPaymentService.process_checkout(user, plan_id)`, onde a lógica complexa vive.

### 2. A Lei da Reutilização e Padronização
**"Design Systems são criados para serem seguidos."**
*   É **PROIBIDO** reinventar a roda ou inserir estilos CSS manuais customizados aleatórios (vanilla inline style) quando houver utilitários equivalentes no `TailwindCSS` do projeto.
*   Todo componente novo do front-end DEVE reaproveitar a hierarquia atômica da pasta `src/components/` em vez de criar variações independentes de `<button>` ou modais. Se precisar de um botão verde, adicione a variante no componente base, não crie um `GreenButton.tsx` do zero.
*   Padrões Back-End estabelecidos (*Design Patterns*) não podem ser abandonados numa feature nova. Siga as convenções do DRF, Nossos serializers e classes Abstratas.

### 3. A Lei da Tipagem e Documentação
**"O compilador não perdoa, e a equipe também não."**
*   É **PROIBIDO** o uso de tipagem dinâmica fraca (`any` no React/TS) em novos módulos. Prefira `unknown` e faça *Type Narrowing* se a API for incerta.
*   TypeScript: Interfaces rigorosas são mandatórias mapeando precisamente o payload do DRF (`IUser`, `IAppointment`).
*   Python: Type Hinting é mandatório em novas funções cruzadas (`def sync_patient(user: User) -> bool:`).
*   **Docstrings de Negócio:** Funções que tocam em dinheiro ou saúde *devem* explicar o *por quê* da lógica, não apenas *o quê* (Ex: `"""Workaround: O VideoSDK retorna nulo se..."""`).

### 4. A Lei da Integridade e Segurança (SRE)
**"A transação de banco de dados é nossa última linha de defesa financeira."**
*   Operações Críticas que alteram saldo, planos ou tocam em > 1 model ao mesmo tempo DEVEM usar Transações Atômicas e *Row Locking* no PostgreSQL (`@transaction.atomic` junto com `.select_for_update()`) para evitar dupla compensação de Webhooks em paralelo.
*   É uma infração técnica gravíssima expor chaves (`SECRET_KEY`, `ASAAS_API_KEY`) no Frontend. O Vite só pode enxergar chaves púbicas seguras (`VITE_VIDEOSDK_PUBLIC`).
*   Logs nunca podem cuspir payloads completos contendo Senhas, Cartões ou Informações Sensíveis Médicas (HIPAA/LGPD).

### 5. A Lei do Planejamento (Plan Before Code)
**"Meça duas vezes, corte uma."**
*   Tarefas complexas não podem gerar Push/Pull Requests massivos sem documentação arquitetural.
*   Toda nova Epopeia (Epic/Feature grande) DEVE ser antecedida de um Blueprint (Plano de Ação Tático) alinhando as mudanças em Modelos, Serviços, Contratos de API (JSONs). Tocar código antes do Blueprint estar aprovado é uma violação ao Workflow Oficial.
