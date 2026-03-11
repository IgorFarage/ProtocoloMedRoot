# Integração de CRM: Bitrix24

O Bitrix24 atua como a única "Fonte da Verdade" (Source of Truth) comercial e de relacionamento do ProtocoloMed. Nenhuma conversão deve existir no banco de dados local do ProtocoloMed sem seu devido espelho de "Lead/Deal" no Bitrix.

## Estrutura de Comunicação (App `accounts/services.py`)

O maestro desta orquestração é o `BitrixService`. 
A comunicação é **Majoritariamente Síncrona** saindo do ProtocoloMed (POST requests via REST API do Bitrix) mas possui ganchos que podem escalar para Webhooks *Inbound* no futuro.

### Setup de Segurança (O Webhook Inbound do Bitrix)
O ProtocoloMed não usa OAuth2 complexo para lidar com o Bitrix, usamos uma integração privada (Local App/Webhook) que exige a Env Var `BITRIX_WEBHOOK_URL` (Ex: `https://seu-tenant.bitrix24.com.br/rest/1/TOKEN/`). 

> **Regra de Ouro Arquitetural:** Nunca vaze o token do Bitrix em respostas da API Frontend ou em commits. Apenas o Backend (`BitrixService`) pode fazer requisições para a URL do Bitrix.

---

## 1. Mapeamento de Entidades e Dicionário de Dados

A sincronia exige um "De-Para" rigoroso entre o modelo relacional do Django e os UFs (User Fields) do Bitrix24.

### Tabela de Conversão: User/Patient (ProtocoloMed) -> Contact (Bitrix24)
Todo cadastro na plataforma vira um `Contact`. O Retorno devolve um `ID` do CRM salvo em `user.id_bitrix`.

| Campo Django (`accounts.User`) | Campo Bitrix (`crm.contact.add`) | Tipo Bitrix | Obrigatório |
| :--- | :--- | :--- | :--- |
| `first_name` + `last_name` | `NAME` e `LAST_NAME` | String | Sim |
| `email` | `EMAIL[0][VALUE]` | Array/Object | Sim |
| `patients.cpf` | `UF_CRM_CPF` (Custom Field) | String | Não |
| `patients.phone` | `PHONE[0][VALUE]` | Array/Object | Sim |

*Exemplo de Payload de Criação (JSON):*
```json
{
  "fields": {
    "NAME": "João",
    "LAST_NAME": "Silva",
    "EMAIL": [ { "VALUE": "joao@email.com", "VALUE_TYPE": "WORK" } ],
    "PHONE": [ { "VALUE": "+5511999999999", "VALUE_TYPE": "WORK" } ]
  }
}
```

### Tabela de Conversão: Transaction/Plan (ProtocoloMed) -> Deal (Bitrix24)
A intenção de compra aciona a criação de um "Deal".

| Campo Django (`financial.Transaction`) | Campo Bitrix (`crm.deal.add`) | Propósito |
| :--- | :--- | :--- |
| `user.id_bitrix` | `CONTACT_ID` | Vincula a transação ao cliente |
| `plan_type` | `TITLE` | Ex: "Assinatura - Plano Plus" |
| `amount` | `OPPORTUNITY` | Valor financeiro do negócio |
| `asaas_payment_id` | `UF_CRM_ASAAS_ID` (Custom) | Chave primária de conciliação |

---

## 2. O Ciclo de Vida do Deal (Pipeline e Webhooks)

O ecossistema financeiro (Webhooks do Asaas) orbita ao redor do Pipeline Comercial do Bitrix.
Nós definimos Status de Funil (`STAGE_ID`) que o Backend precisa atualizar via API.

1. **`NEW` (Lead Gerado):** Paciente cadastrado, carrinho abandonado ou pendente de link de pagamento.
2. **`PREPARATION` (Checkout Iniciado):** `BitrixService.prepare_deal_payment()` invocada. Associa ID do Gateway ao Deal.
3. **`WON` (Ganho / APPROVED):** Acionado exclusivamente pela view `AsaasWebhookView`. Movimenta a `STAGE_ID` para a fila de "Ganho", configurando automações internas no CRM (ex: enviar email de boas-vindas).
4. **`LOSE` (Perdido / REJECTED):** Em caso de fraude, estorno (chargeback) ou boleto vencido informado pelo gateway.

> **Importante:** A transição para `WON` **nunca** deve ser feita prevendo o pagamento. Apenas a confirmação bancária (Webhook assíncrono) tem autoridade para despachar a Action `crm.deal.update` para a fase Ganhos.

## 3. Comandos de Sincronização e Fallback (Resiliência)

Devido à natureza de rede, se a requisição do Bitrix falhar por TimeOut ou indisponibilidade da API Russa, o banco de dados do ProtocoloMed ficará inconsistente. 

Para resolver passivos de rede, foram criados Management Commands de resiliência:
*   `python manage.py force_bitrix_update`: Força o reenvio de todo histórico e status de um usuário X baseado em seu último pagamento para re-sincronizar o Pipeline do Bitrix a força.
*   `python manage.py sync_bitrix_transactions`: Usado primariamente durante consolidações ou migrações de provedor (como a recente do Mercado Pago) para repassar os IDs originais do Gateway para os campos customizados dentro do CRM.

---

## 4. Troubleshooting e Resolução de Problemas (SRE)

**Problema 1: Latência excessiva no Cadastro (Onboarding lento)**
*   **Causa:** A requisição POST ao servidor russo bloqueia a Thread do gunicorn/Django.
*   **Ação Recomendada (Dívida Técnica):** Embolsar a chamada de `BitrixService.create_contact()` em uma tarefa distribuída (`Celery/Redis`) via `@shared_task`, retornando instantaneamente `201 Created` no front-end.

**Problema 2: Usuário gerou pagamento, mas não tem `id_bitrix` (404 Not Found no CRM)**
*   **Causa:** Falha pontual de rede na fase de Onboarding original, deixando a coluna no BD fantasma.
*   **Resolução Codificada:** O `BitrixService` foi construído com resiliência paramétrica. O método `prepare_deal_payment()` possui um fallback interno: Se `user.id_bitrix` for `None`, ele primeiro dispara a Action `crm.contact.add`, salva localmente, e só então despacha o Deal.
