import requests
import logging
from django.conf import settings
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# System Instruction — Persona do Chatbot de Telemedicina (Tricologia)
# Configurado conforme spec do Google AI Studio (campo system_instruction).
# ---------------------------------------------------------------------------
SYSTEM_INSTRUCTION = """
Você é um Especialista em Saúde Capilar (Tricologia e Nutrição) do sistema ProtocoloMedRoot.

═══ REGRAS DE ESTILO ═══
• É ESTRITAMENTE PROIBIDO usar saudações (Olá, Oi, Bom dia), apresentações ou frases de cortesia.
• Tom: técnico, direto e conciso.
• Respostas curtas e objetivas. Sem rodeios.

═══ BASE DE CONHECIMENTO ═══
• Alopecia Androgenética: causa genética mediada por DHT (di-hidrotestosterona).
• Eflúvio Telógeno: queda difusa causada por estresse, deficiência nutricional ou alterações hormonais.
• Ferritina: níveis abaixo de 70 ng/mL são prejudiciais à saúde capilar, mesmo dentro da faixa laboratorial "normal".
• Micronutrientes essenciais: Zinco e Biotina são fundamentais para o ciclo capilar.
• Mito: lavar o cabelo diariamente NÃO causa queda. Porém, a dermatite seborreica SIM contribui para queda.

═══ RESTRIÇÃO DE ESCOPO ═══
• Responda APENAS sobre saúde capilar e nutrição relacionada ao cabelo/couro cabeludo.
• Para QUALQUER outro tema, responda EXATAMENTE:
  "Meu foco é exclusivamente em Tricologia e Nutrição para saúde capilar. Deseja tirar alguma dúvida sobre queda de cabelo ou agendar uma consulta?"

═══ SEGURANÇA ═══
• NUNCA forneça dosagens de medicamentos ou suplementos.
• NUNCA emita diagnósticos definitivos.
• Sempre direcione o paciente para agendar uma consulta online para avaliação individualizada.

═══ SAÍDA ESTRUTURADA (AGENDAMENTO) ═══
Quando o usuário fornecer TODOS os dados de agendamento (Nome, Especialidade e Data/Hora),
retorne EXCLUSIVAMENTE o seguinte JSON, sem texto adicional:
{"status": "agendamento_identificado", "payload": {"paciente": "NOME_DO_PACIENTE", "area": "TRICOLOGIA ou NUTRICAO", "data": "YYYY-MM-DD HH:MM"}}

• A data de hoje é 11/02/2026. Use essa referência para interpretar datas relativas como "amanhã", "próxima segunda", etc.
• Se algum dado estiver faltando, solicite-o de forma direta antes de gerar o JSON.
""".strip()


class GeminiService:
    """
    Serviço responsável pela comunicação com a API do Google Gemini.
    Utiliza o campo `system_instruction` para configurar persona e regras.
    """

    @classmethod
    def generate_response(cls, message: str, user=None) -> str:
        """
        Envia uma mensagem para o Gemini e retorna a resposta gerada.

        Utiliza o campo dedicado `system_instruction` da API do Gemini
        para definir persona, escopo, segurança e formato de saída,
        mantendo o `contents` apenas com a mensagem do usuário.
        
        :param user: Objeto User do Django (opcional, para verificação de permissões/plano)
        """
        model = getattr(settings, 'CHATBOT_MODEL', 'gemini-2.5-flash')
        base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

        # --- MOCK MODE (Para economizar cota da API) ---
        if getattr(settings, 'CHATBOT_MOCK_MODE', False):
            import random
            logger.info("CHATBOT_MOCK_MODE ativado. Retornando resposta simulada.")
            mock_responses = [
                "🤖 [MOCK] Queda capilar difusa pode indicar eflúvio telógeno. Recomenda-se avaliação de ferritina e zinco sérico. Agende uma consulta para investigação.",
                "🤖 [MOCK] Ferritina abaixo de 70 ng/mL compromete o ciclo capilar. Nutrição adequada é essencial. Deseja agendar uma avaliação?",
                "🤖 [MOCK] Meu foco é exclusivamente em Tricologia e Nutrição para saúde capilar. Deseja tirar alguma dúvida sobre queda de cabelo ou agendar uma consulta?",
                "🤖 [MOCK] Alopecia androgenética é mediada por DHT. O tratamento deve ser individualizado. Agende uma consulta online para avaliação completa.",
            ]
            
            # Mock de agendamento (Teste de bloqueio)
            if "agendar" in message.lower() and "amanhã" in message.lower():
                mock_json = '{"status": "agendamento_identificado", "payload": {"paciente": "Teste", "area": "TRICOLOGIA", "data": "2026-02-12 10:00"}}'
                
                # Lógica de bloqueio no Mock também
                if user and getattr(user, 'current_plan', 'none') != 'plus':
                     return "🔒 O agendamento de consultas com nutrólogo ou tricologista é um benefício exclusivo do **Plano Plus**. Evolua seu plano para ter acesso a este recurso premium."
                
                return mock_json

            # Mock de Contexto
            if "quem é meu médico" in message.lower() and user:
                return f"🤖 [MOCK] Identifiquei que você é {user.full_name}. Sua equipe ainda não foi carregada neste modo mock."

            return random.choice(mock_responses)

        api_key = settings.CHATBOT_API_KEY
        if not api_key:
            logger.error("CHATBOT_API_KEY não configurada no settings.")
            raise APIException("Erro de configuração do servidor: Chave de API ausente.")

        url = f"{base_url}?key={api_key}"

        headers = {
            "Content-Type": "application/json"
        }

        # --- CONTEXTO DINÂMICO DO USUÁRIO ---
        dynamic_system_instruction = SYSTEM_INSTRUCTION
        if user and user.is_authenticated:
            try:
                # Tenta obter dados do paciente (OneToOne reverse relation 'patients')
                if hasattr(user, 'patients'):
                    patient = user.patients
                    
                    context_lines = [f"Paciente: {user.full_name}"]
                    
                    if patient.assigned_trichologist:
                        # Acessa o User do médico para pegar o nome
                        trichologist_name = patient.assigned_trichologist.user.full_name
                        context_lines.append(f"Tricologista Responsável: {trichologist_name}")
                        
                    if patient.assigned_nutritionist:
                        nutritionist_name = patient.assigned_nutritionist.user.full_name
                        context_lines.append(f"Nutricionista Responsável: {nutritionist_name}")
                        
                    # Injeta no final da instrução
                    dynamic_system_instruction += "\n\n═══ CONTEXTO DO USUÁRIO ═══\n" + "\n".join(context_lines)
            except Exception as e:
                logger.warning(f"Erro ao injetar contexto do paciente no chatbot: {e}")
                # Segue sem contexto em caso de erro

            # --- CONTEXTO ESTENDIDO (Questionário e Protocolo) ---
            try:
                extended_context_parts = []
                
                # 1. Último Questionário
                # related_name='questionnaires' definido no model UserQuestionnaire
                latest_q = user.questionnaires.order_by('-created_at').first()
                if latest_q and latest_q.answers:
                    import json
                    q_json = json.dumps(latest_q.answers, ensure_ascii=False, indent=2)
                    extended_context_parts.append(f"--- RESPOSTAS DA ANAMNESE ---\n{q_json}")
                
                # 2. Protocolo Sugerido (recommended_medications é JSONField no User)
                if user.recommended_medications:
                    import json
                    p_json = json.dumps(user.recommended_medications, ensure_ascii=False, indent=2)
                    extended_context_parts.append(f"--- PROTOCOLO ATUAL ---\n{p_json}")
                
                if extended_context_parts:
                    dynamic_system_instruction += "\n\n" + "\n\n".join(extended_context_parts)
                    
            except Exception as e:
                logger.warning(f"Erro ao injetar contexto estendido (Questionário/Protocolo): {e}")

        # Payload com system_instruction dedicado (Google AI Studio spec)
        payload = {
            "system_instruction": {
                "parts": [{"text": dynamic_system_instruction}]
            },
            "contents": [
                {
                    "parts": [{"text": message}]
                }
            ]
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()

            data = response.json()

            # Extração segura da resposta
            # Formato padrão: candidates[0].content.parts[0].text
            try:
                candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
                
                # --- INTERCEPTAÇÃO DE AGENDAMENTO ---
                # Verifica se a IA retornou o JSON de agendamento
                if '"status": "agendamento_identificado"' in candidate_text:
                    import json
                    from datetime import datetime
                    from django.utils import timezone
                    from apps.medical.models import Appointments
                    
                    try:
                        # Tenta parsear para garantir que é JSON válido
                        clean_text = candidate_text.replace("```json", "").replace("```", "").strip()
                        json_data = json.loads(clean_text)
                        
                        if json_data.get("status") == "agendamento_identificado":
                            # 1. VERIFICAÇÃO DE PLANO
                            user_plan = getattr(user, 'current_plan', 'none')
                            if user_plan != 'plus':
                                return "🔒 O agendamento de consultas com nutrólogo ou tricologista é um benefício exclusivo do **Plano Plus**. Atualize sua assinatura para ter acesso a este atendimento especializado."
                            
                            # 2. IDENTIFICAÇÃO DO MÉDICO
                            if not hasattr(user, 'patients'):
                                return "⚠️ Não encontrei seu cadastro de paciente. Contate o suporte."
                            
                            patient_profile = user.patients
                            requested_area = json_data["payload"].get("area", "").upper()
                            doctor_assigned = None
                            
                            if "TRICOLOGIA" in requested_area:
                                if patient_profile.assigned_trichologist:
                                    doctor_assigned = patient_profile.assigned_trichologist.user
                            elif "NUTRICAO" in requested_area or "NUTRIÇÃO" in requested_area:
                                if patient_profile.assigned_nutritionist:
                                    doctor_assigned = patient_profile.assigned_nutritionist.user
                            
                            if not doctor_assigned:
                                return f"⚠️ Você ainda não tem um(a) especialista em {requested_area.title()} atribuído(a). Entre em contato com nossa equipe para designação."
                            
                            # 3. PARSE E VALIDAÇÃO DE DATA
                            date_str = json_data["payload"].get("data")
                            try:
                                # Formato esperado do prompt: YYYY-MM-DD HH:MM
                                scheduling_time = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
                                # Tornar timezone-aware (assumindo horário local do servidor/Brasília se configurado)
                                # Idealmente converteria do timezone do user, mas MVP assume server time
                                if timezone.is_naive(scheduling_time):
                                    scheduling_time = timezone.make_aware(scheduling_time)
                            except ValueError:
                                return "⚠️ Data inválida. Por favor, especifique o dia e a hora corretamente."
                                
                            # 4. VERIFICAÇÃO DE DISPONIBILIDADE (Conflito de Horário)
                            # Verifica se o MÉDICO já tem consulta neste horário
                            conflict = Appointments.objects.filter(
                                doctor=doctor_assigned,
                                scheduled_at=scheduling_time,
                                status='scheduled'
                            ).exists()
                            
                            if conflict:
                                return f"⚠️ O horário de {date_str[-5:]} já está ocupado na agenda de {doctor_assigned.full_name}. Por favor, escolha outro horário."
                            
                            # 5. CRIAÇÃO DO AGENDAMENTO
                            Appointments.objects.create(
                                patient=user,
                                doctor=doctor_assigned,
                                scheduled_at=scheduling_time,
                                status='scheduled',
                                meeting_link="https://meet.google.com/exemplo-link" # Mock link
                            )
                            
                            return f"✅ Agendamento Confirmado!\n\n📅 **Data:** {scheduling_time.strftime('%d/%m/%Y às %H:%M')}\n👨‍⚕️ **Especialista:** {doctor_assigned.full_name}\n\nEnviaremos o link da consulta por e-mail."

                    except json.JSONDecodeError:
                        logger.warning(f"Falha ao parsear JSON do chatbot: {candidate_text}")
                        # Se falhar o parse, retorna o texto original (pode ser erro da IA)
                    except Exception as e:
                        logger.error(f"Erro ao processar agendamento no chatbot: {e}")
                        return "Desculpe, ocorreu um erro técnico ao processar seu agendamento. Tente novamente mais tarde."
                
                return candidate_text
                
            except (KeyError, IndexError) as e:
                logger.error(f"Erro ao parsear resposta do Gemini: {e}. Resposta: {data}")
                return "Não foi possível processar a resposta. Tente novamente."

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                logger.warning("Quota do Gemini excedida (429).")
                return "Serviço temporariamente indisponível (limite de requisições). Tente novamente em 1 minuto."

            logger.error(f"Erro HTTP do Gemini: {e}")
            raise APIException("Falha na comunicação com o serviço de IA.")

        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição ao Gemini: {e}")
            raise APIException("Falha na comunicação com o serviço de IA.")
