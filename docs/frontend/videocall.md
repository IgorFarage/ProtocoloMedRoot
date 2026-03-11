# Telemedicina Frontend: Fluxo VideoSDK

Substituímos o iframe legadão da *Daily.co* puro por uma integração nativa do **VideoSDK.live**, permitindo customização extensa da sala de telemedicina embedded (dentro de nosso layout e nosso domínio, sem popup fecho).

Esta seção serve como referência para os arquivos chave dentro do `src/pages/VideoConsultation/`.

## 1. Arquitetura Desacoplada de Segurança (Tokens)
Para manter o faturamento atrelado ao uso da rede WebRTC, o Front-end **nunca** se comunica diretamente com os servidores da VideoSDK para pedir permissão ou criar salas (A *Secret Key* da API nunca deve existir no VITE).

**O Fluxo Perfeito:**
1. A View do paciente ou médico bate na nossa API: `GET /api/medical/appointments/{ID}/telemedicine/join/`.
2. O Backend valida se o agendamento já foi pago (`Transaction=APPROVED`), se está na hora correta e quem é o remetente. 
3. O Backend retorna um *Token JWT* gerado na nuvem (que expira em horas) marcando a Role apropriada (Médico = `is_owner`, Paciente = `guest`). Ele também retorna a String oficial da sala (`meeting_link`).
4. Só com essas duas chaves em mãos, o React inicializa a engine visual de Câmera/Microfone.

## 2. Renderização Componentizada e Providers

O React precisa englobar toda a página de navegação dentro de um Context API específico do Fabricante.
Nós dividimos isso em Containers Limpos (ver código abaixo):

```tsx
import { MeetingProvider } from "@videosdk.live/react-sdk";

// Componente Pai Responsável Exclusivamente pela Engine
export function TelemedicineRoomContainer({ meetingId, participantName, securityToken }) {
   return (
     <MeetingProvider
        config={{
            meetingId: meetingId,
            name: participantName,
            micEnabled: true,
            webcamEnabled: true,
        }}
        token={securityToken} // Token temporário assinado pelo Backend
     >
         {/* O Corpo da UI da Sala (Grid Customizada) */}
         <VideoGridWrapper /> 
     </MeetingProvider>
   )
}
```

## Painel Clínico Lateral (Side-Panel da Visão Médica)
Uma feature central da página `VideoConsultation` é que, SE o usuário logado for Médico e não paciente, nós dividimos a grid do Monitor (Flex/Grid) ao meio na tela Web.

```
+------------------+-----------------------------+
| WEB-CAM Paciente | Aba de Diagnóstico Clínico  |
| WEB-CAM Médico   | Anotação (Prontuário/Atest) |
+------------------+-----------------------------+
```
Isso é feito via Renderização Condicional simples atrelada aos dados vindos inicialmente na Page pelo hook `useClientData` interceptados na aba de `is_doctor` vs `is_patient`.

### Comportamento Nativo Mobile (Responsivo)
O Tailwind lida com Theming. Mas o React lida com *UX Context*:
Para telas muito pequenas (Smartphones), a aba de Prontuário precisa colapsar por trás da Grid de Video ou usar um modelo Swipeable (Modal inferior) para priorizar o campo da câmera web sem encolher o vídeo até sumir. 

## 4. Segurança do Fechamento (`onMeetingLeave`)
Ao clicar no botão customizado de desligar, nós temos dupla responsabilidade: Libertar os recursos do browser e bloquear a sala de abusos.

1. **Camada Client (VideoSDK):** Chamamos `meeting.leave()` atrelado ao Hook `useMeeting()`.
2. **Camada de Lógica de Negócio (Axios):** Imediatamente, disparamos um callback assíncrono para nossa **API PROTOCOLOMED** informando: "Sessão concluída, altere o status do Appointment no BD para Realizado". (Para travar novos acessos futuros).
3. **Redirecionamento:** Navegamos o usuário para a Home.

*O Padrão Ouro de Implementação no React:*
```tsx
const { leave } = useMeeting();
const navigate = useNavigate();

const handleEndConsultation = async () => {
    // 1 - Libera Webcam/Mic a nível OS
    leave(); 
    
    // 2 - Mata a sala no bd central (Coloca a tranca na porta)
    try {
        await api.post(`/api/medical/appointments/${appointmentId}/close/`);
    } catch(err) {
        console.error("Falha ao registrar encerramento:", err);
    }
    
    // 3 - Tira da rota ativa
    navigate('/dashboard'); 
}
```
