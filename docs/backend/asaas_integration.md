# Integração de Pagamentos: Asaas Gateway

O sistema migrou integralmente do Mercado Pago para o Asaas como provedor financeiro. Esta documentação descreve como o Backend interage com a API do Asaas.

## Estrutura de Comunicação (App `financial`)

A comunicação concentra-se no arquivo `AsaasService` em `apps/financial/services.py`, agindo como uma Fachada (Facade Protocol) para a API REST ofical do Asaas.

### Dependência de Autenticação
O `AsaasService` não deve ser inicializado manualmente espalhado pelo código. Sempre chame seus métodos de classe se possível, ou injete dependência usando as variáveis de ambiente baseadas no `.env`:
`ASAAS_API_KEY` e `ASAAS_BASE_URL`.

---

## 1. Gestão de Clientes (Customers)

O Asaas opera sob a premissa de que toda cobrança (*Payment* ou *Subscription*) precisa obrigatoriamente estar vinculada a um `customer_id` gerado no lado deles.

**Fluxo de Interceptação:**
Quando o usuário tenta fechar uma compra no ProtocoloMed, o serviço verifica o banco local:
1. Existe `user.asaas_customer_id`? Se sim, usamos ele.
2. Se não: disparada a chamada `AsaasService.create_customer(user)`. O JSON gerado é:
   ```json
   {
      "name": "Maria Silva",
      "cpfCnpj": "11122233344",
      "email": "maria@email.com",
      "phone": "11999999999"
   }
   ```
   A reposta devolve o ID `cus_00000XyZ`. Injetamos isso na coluna do backend e procedemos com a cobrança em seguida.

> **Tratamento de Exceções:** Se o CPF/CNPJ ou Email estiverem mal formatados ou já bloqueados pelo Compliance do Asaas, um `Http 400 Bad Request` será devolvido, abortando o Checkout e engatilhando um toast explicativo via Frontend.

---

## 2. Tipos de Cobrança

O sistema lida com dois métodos de liberação financeira:
* **Transações Únicas (PIX / Boleto / Cartão Avulso):** Criada via `AsaasService.create_payment()`. Gera uma transação amarrada ao UUID desta fatura específica.
* **Assinaturas (Subscriptions):** Criada via `AsaasService.create_subscription()`. O Asaas se encarrega da recorrência automática (cobrando no cartão mensalmente, por exemplo).

---

## 3. Webhooks: O Core Desacoplado 🎯

O ProtocoloMed **não** fica consultando a API do Asaas a cada X segundos perguntando se um boleto ou Pix caiu. Essa abordagem (*Long Polling*) é cara e suja. Operamos através de uma Rota Inbound Desacoplada: **Os Webhooks.**

Ao emitir uma cobrança, o backend salva uma `Transaction` marcando-a explícita e unicamente como **`PENDING`**.

**O Ciclo de Recepção (End-to-End):**
1. O Asaas envia um `POST` autônomo para nossa View Exposta: `[BASE_URL]/api/financial/webhook/asaas/`.
2. O payload principal recebido é examinado:
   ```json
   {
     "event": "PAYMENT_RECEIVED",
     "payment": {
       "id": "pay_XYZ123",
       "customer": "cus_ABC987",
       "value": 150.00
     }
   }
   ```
3. A camada de Serviço filtra localmente: `Transaction.objects.get(asaas_payment_id="pay_XYZ123")`.
4. Um bloco DB `@transaction.atomic` inicia para travar duplas execuções. O Status muda para **`APPROVED`**.
5. Disparamos a Lógica de Liberação de Produto:
   - Se era recorrente, atualiza `User.current_plan` para ativar features premium no App React.
   - O `BitrixService` é invocado passando o `ID` gerado, empurrando o Card visual do Paciente no CRM para o Estágio `Won` (Pago com Sucesso).

### Segurança do Webhook de Produção
Para evitar invasores locais injetando cURLs de `PAYMENT_RECEIVED` falsos simulando faturas pagas:
- **Middleware de Hash (Asaas-Access-Token):** É mandatório configurar no painel visual do Asaas o `Security Token`. O Frontend interceptador deve validar se a header da API concorda com nossa ENV Variable.
- **Validação Cruzada de Valor:** Como reforço extra em grandes quantias, o webhook da `AsaasWebhookView` checa se o `payload_value == transaction.amount` gravado na geração.

---

## 4. Troubleshooting (Dívida Técnica & Alertas SRE)

**Tolerância a Duplicidade e Concorrência (Idempotência)**
*  O Gateway de homologação e produção do Asaas *pode* e *vai* disparar múltiplas vezes um webhook referenciando a `mesma` transação num intervalo de milissegundos (retries agressivos se a rede piscar). 
*  Sem o bloqueio `select_for_update()` atrelado ao `@transaction.atomic` mencionado na seção #3, duas ou três requisições baterão simultâneas, liberando crédito X3 para o usuário.
*  A `Transaction` precisa validar o check `"if transaction.status == APPROVED": return 200`. Devolvemos OK rápido pro provedor, cancelando a execução, pois o pedido já foi honrado previamente.
