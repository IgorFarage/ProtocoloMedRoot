# Backend Overview (Django)

## Princípios de Design

O backend do ProtocoloMed foi construído sobre o **Django 5.x** e **Django REST Framework (DRF)**, sendo fortemente guiado pela [**Lei nº 1: Separação de Responsabilidades (SoC)**](../manifesto.md) adotada como o padrão arquitetural de **Fat Services & Skinny Views**. 

O objetivo principal é manter os Controladores (`views.py`) extremamente limpos, focados apenas na recepção do HTTP Request, Validação inicial de permissões (IsAuthenticated) e despachar a lógica complexa (criação de salas de vídeo, chamadas para o CRM Bitrix, webhooks do Asaas) para a camada de Serviços (`services.py`).

### Exemplo Prático: Skinny View vs Fat Service
**O que NÃO Fazer (Fat View - Violação):**
```python
# view.py (Ruim)
def book_appointment(request):
    # Lógica de negócio vazando na view
    user = request.user
    if user.plan == 'premium':
        # request de rede pro VideoSDK aqui
        # request de rede pro Bitrix aqui
        # save no banco
        return Response({'ok': True})
```

**O Padrão Exigido (Skinny View + Fat Service):**
```python
# views.py (Excelente)
class AppointmentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Delegação: A view não sabe COMO a sala é criada.
        appointment = MedicalService.schedule_and_provision(user=request.user, data=serializer.validated_data)
        return Response(AppointmentSerializer(appointment).data, status=201)

# services.py (Fat Service)
class MedicalService:
    @staticmethod
    @transaction.atomic
    def schedule_and_provision(user, data):
        # Lógica pesada de negócio, chamadas de rede externas e regras de Banco vivem aqui.
        room_data = VideoSDKService.create_room()
        return Appointment.objects.create(patient=user, meeting_link=room_data['id'])
```

## Estrutura de Diretórios (`apps/`)

A lógica de negócios é dividida em "apps" temáticos:

### `accounts/` (Identidade e CRM)
*   **Responsabilidade:** Autenticação (Login, Cadastro), Gestão de JWT e Sincronização de Contatos com o Bitrix24.
*   **Modelos Chave:** `User` (AbstractUser customizado), `Patients` (Perfil estendido do paciente), `Doctors` (Perfil estendido do médico).
*   **Serviço Principal:** `BitrixService`. Lida com a criação de contatos (Leads/Clients) no CRM espelhando o banco local.

### `medical/` (Agendamento e Telemedicina)
*   **Responsabilidade:** Calendário de consultas, disponibilidade médica e geração dinâmica de conferências de vídeo.
*   **Modelos Chave:** `Appointments`.
*   **Serviço Principal:** `VideoSDKService`. Abstrai as chamadas da API REST do provedor de video, gerando *Rooms* e *JWT Tokens* On-the-fly para o front-end embarcar o iframe da chamada de vídeo.

### `financial/` (Faturamento)
*   **Responsabilidade:** Cobranças, assinaturas de planos, webhooks de gateway.
*   **Modelos Chave:** `Transaction`, `PaymentType`.
*   **Serviço Principal:** `AsaasService`. Gera links de pagamento (Cobranças/Assinaturas). Quando o status do pagamento muda, este app atualiza o plano do usuário (`accounts.User.current_plan`) e propaga o Sucesso/Falha da transação ("Deal Won/Lost") para o CRM via `BitrixService`.

### `store/` (Catálogo e Assinaturas)
*   **Responsabilidade:** Produtos e vitrine, gestão dos produtos do Protocolo (Planos).
*   **Modelos Chave:** Produtos estáticos que guiam a precificação do app `financial`.

---

## Padronização de Retorno API (The Payload Envelope)

Todo endpoint da API foi projetado para retornar erros e sucessos de forma previsível e estritamente tipada. O Frontend React (`useClientData`/`ReactQuery`) espera estes formatos para não quebrar a UI.

### 1. Chamadas de Sucesso (200 OK / 201 Created)
Para dados únicos ou de paginação padrão, utilizamos os serializers nativos do DRF.
```json
{
  "id": 1,
  "first_name": "João",
  "email": "joao@email.com",
  "id_bitrix": "1025",
  "current_plan": "Protocolo Master"
}
```

### 2. Tratamento de Erros (400 Bad Request / 403 Forbidden)
O Django e o DRF lançam um array de erros caso campos falhem na validação do `serializer.is_valid()`. Quando tratamos exceções manuais nos *Services* (Ex: "Paciente tentou agendar sem saldo"), lançamos `ValidationError` que converte globalmente para:
```json
{
  "detail": "Você não tem consultas disponíveis em seu plano atual.",
  "code": "insufficient_funds" 
}
```

## Gestão de Permissões e Segurança de Rotas (RBAC)

O controle de acesso baseado em roles (RBAC) é administrado por classes customizadas que derivam de `BasePermission` do DRF, geralmente localizadas no core do projeto:

1. **`IsAuthenticated` (Padrão):** O `request.user` deve ter um JWT válido. Maioria dos endpoints (`/medical/appointments/`, `/accounts/profile/`).
2. **`IsAdminUser` (Staff):** Libera dashboards do Backoffice e rotas de limpeza financeira.
3. **`IsDoctor` / `IsPatient` (Domain Specific):**
   * Avaliam flags booleanas no modelo de persistência (e.g. `user.role == 'DOCTOR'`).
   * **Aplicação Crítica:** Na telemedicina, o Frontend *precisa* dessas roles embutidas no token para que o VideoSDK renderize a interface correta (Médico tem botão de expulsar/mutar, paciente não). O backend gera a flag `is_owner: True` no JWT provisório do VideoSDK se a request vier aprovada pelo `IsDoctor`.
