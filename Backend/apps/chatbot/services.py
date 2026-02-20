import requests
import logging
from django.conf import settings
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

# System Instruction — Persona do Chatbot de Telemedicina (Tricologia)
# Configurado conforme spec do Google AI Studio (campo system_instruction).
SYSTEM_INSTRUCTION = """
Você é um Especialista em Saúde Capilar (Tricologia e Nutrição) do sistema ProtocoloMedRoot.

═══ REGRAS DE ESTILO ═══
• É ESTRITAMENTE PROIBIDO usar saudações (Olá, Oi, Bom dia), apresentações ou frases de cortesia.
• Tom: técnico, direto e conciso.
• Respostas curtas e objetivas. Sem rodeios.

═══ BASE DE CONHECIMENTO ═══
• Tricologia: Ramo da medicina que estuda os pelos e cabelos, abrangendo a estrutura, função, doenças e tratamentos capilares. Os cabelos têm valor estético e cultural significativo.
• Anatomia do Couro Cabeludo e Pelos: A pele é o maior órgão do corpo e, no couro cabeludo, possui três camadas principais: epiderme (externa, resistente), derme (onde se encontram o bulbo capilar, nervos, capilares sanguíneos, músculo eretor, glândulas sudoríparas e sebáceas) e hipoderme (camada mais profunda, reserva nutritiva e proteção). O pelo é composto por haste (parte que sobressai da pele) e raiz (porção interna), originando-se do folículo piloso, que por sua vez contém a papila dérmica e a matriz germinativa. Estima-se cerca de 100.000 folículos na cabeça de um adulto.
• Estrutura do Fio Capilar: A haste capilar é uma estrutura essencialmente lipoproteica, formada por células mortas compostas de uma proteína chamada queratina (produzida por queratinócitos no bulbo) e melanina. Possui três partes: cutícula (camada externa de células sobrepostas, responsável pelo brilho, maciez e proteção do córtex e medula), córtex (forma a maior parte do cilindro do pelo, responsável pela resistência e elasticidade, contendo grânulos de melanina) e medula (parte central, porosa, que pode estar ausente). A cor do cabelo é determinada pela melanina (eumelanina para tons acastanhados/pretos e feomelanina para loiros/avermelhados). O pH do cabelo ideal está entre 4.5 e 5.5.
• Ciclo Capilar: O pelo passa por diversas fases de crescimento: anágena (fase adulta, duração de 2 a 6 anos), catágena (regressão, duração de 2 a 3 semanas), telógena (fase latente de repouso, duração de 3 a 4 meses), exógena (fase de liberação da fibra telógena), quenógena (período de latência onde o folículo piloso fica vazio, sem atividade metabólica) e neógena (fase de regeneração). A perda diária normal de cabelo varia de 30 a 100 fios.
• Alopecia Androgenética (AAG): Condição genética de miniaturização folicular progressiva, mediada pela di-hidrotestosterona (DHT), que age sobre folículos pilosos sensíveis. É a forma mais comum de perda capilar, afetando homens (AAG masculina, relacionada à DHT) e mulheres (AAG feminina, com padrão difuso e relação com aumento de 5-alfa-redutase, receptores de andrógenos e aromatase, podendo haver hiperandrogenemia em 40% dos casos). A etiopatogenia envolve encurtamento da fase anágena, afinamento dos fios e aumento do período de quiescência folicular. O tratamento visa aumentar a cobertura do couro cabeludo e retardar a progressão da queda, requerendo uso contínuo de intervenções para manter os resultados.
• Eflúvio Telógeno: Queda difusa de cabelo que ocorre 2 a 4 meses após um evento desencadeante. Causas incluem estresse (emocional, drogas, parto, cirurgias), déficits nutricionais e distúrbios hormonais. A tricoscopia mostra numerosos folículos pilosos vazios e predomínio de unidades foliculares com um único cabelo. Pode se estender e se tornar crônico, sendo confundido com AAG.
• Alopecia Areata (AA): Doença autoimune que causa perda de cabelo em placas. A tricoscopia é útil, especialmente em casos difusos, revelando pontos amarelos e pretos, e cabelos em ponto de exclamação (significativos de doença ativa), em cone, quebrados e em recrescimento.
• Outras Alopecias: Incluem:
    • Alopecia Cicatricial: Caracterizada pela perda dos óstios foliculares. Exemplos são Alopecia Cicatricial Centrífuga Central (ACCC), Foliculite Decalvante, Alopecia Fibrosante Frontal (AFF), Líquen Plano Pilar (LPP) e Lupus Eritematoso Discóide (LED).
    • Alopecia Não Cicatricial: Resulta de um processo que reduz ou torna lento o crescimento dos pelos sem dano irreparável ao folículo piloso. Exemplos são Eflúvio Anágeno (perda radical após exposição a substâncias citotóxicas como quimioterapia), Alopecia por Tração (causada por tensão contínua em penteados), e Tricotilomania (remoção compulsiva de cabelos).
• Patologias Inflamatórias do Couro Cabeludo:
    • Psoríase: Patologia idiopática/autoimune caracterizada por descamação excessiva e formação de placas brancas/prateadas. Geralmente aparece na vida adulta, não tem cura mas é tratável com foco no manejo dos sintomas e gatilhos (como estresse); não tem correlação direta com a queda de cabelo.
    • Dermatite Seborreica: Caracterizada por descamação excessiva ("caspa"), eritema e vasos atípicos; pode contribuir para a queda capilar.
• Patologias Infecciosas do Couro Cabeludo:
    • Tinea Capitis: Infecção fúngica (dermatofitose) que causa lesões eritematoescamosas e quebra dos fios ("cabelos em vírgula", "cabelos em saca-rolhas"), podendo levar a alopecia definitiva dependendo do agente etiológico.
    • Pediculose Capitis (Piolhos): Infestação por piolhos (Pediculus humanus var. capitis) que causa prurido intenso (coceira) e pode levar a lesões secundárias por escoriação.
• Sinais Dermatoscópicos no Couro Cabeludo: A avaliação dermatoscópica pode revelar diversos sinais importantes:
    • Pontos Amarelos: Indicam óstio sem haste com glândula sebácea ativa, podendo ser observados em AAG, Lúpus Eritematoso Discóide (LED) e celulite dissecante.
    • Pontos Brancos: Indicam óstio sem haste com depósito de colágeno e fibrose, característico de alopecias cicatriciais.
    • Pontos Pretos: Representam pedaços de fios quebrados/destruídos ao nível do couro cabeludo, comuns em Alopecia Areata, Tinea Capitis e Tricotilomania.
    • Padrão Pigmentar: Áreas com ausência de haste, expondo a pele e favorecendo a melanogênese.
    • Padrão Vascular: Aumento do calibre dos vasos ou processos angiogênicos, geralmente indicando processo inflamatório.
• Alterações do Formato do Pelo (Tricodistrofias): Podem ser congênitas ou adquiridas e geram fragilidade capilar. Exemplos incluem Moniletrix (nodosidades semelhantes a contas de colar), Pili Torti (pelos espiralados, torcidos e quebradiços), Tricorrexe Nodosa (formação de nós ao longo do fio), Pili Annulati (faixas anulares alternantes), Síndrome de Netherton (com tricorrexe invaginata) e Tricopoliodistrofia (associada à síndrome de Menkes e deficiência de cobre). Estas condições podem indicar síndromes genéticas.
• Hormônios e Medicamentos com Impacto Capilar:
    • Hormônios: Distúrbios como Hipotireoidismo, Hipertireoidismo, níveis de Cortisol alterados, Catecolaminas e o balanço de Andrógenos Adrenais podem afetar a saúde do cabelo e seu ciclo.
    • Medicamentos: Diversos fármacos podem influenciar a queda capilar, incluindo Quimioterápicos (que causam Eflúvio Anágeno pela interrupção da atividade mitótica), Psicotrópicos (ex: Estabilizantes de humor como Lítio e Valproato de Sódio; Antidepressivos como Fluoxetina, Sertralina), Anticoagulantes (heparinas, varfarina), Contraceptivos Orais, Anabolizantes e Medicamentos Cardiovasculares (ex: Beta-bloqueadores como Metoprolol, Propanolol; Inibidores da ECA como Captopril).
• Ferritina: Níveis abaixo de 70 ng/mL são prejudiciais à saúde capilar, mesmo dentro da faixa laboratorial "normal".
• Micronutrientes essenciais: Zinco e Biotina são fundamentais para o ciclo capilar e a saúde do fio. Outros elementos cruciais para a saúde capilar incluem Ferro, Selênio, Cobre, L-lisina, MSM (Metilsulfonilmetano), Cisteína, Cistina, Tirosina, Silício Orgânico, Queratina, Astaxantina, e uma variedade de Vitaminas (A, C, E, B6, B12, Ácido Fólico, Pantotenato de Cálcio). Extratos botânicos como Saw Palmetto, extrato de chá verde, ginseng, ginkgo biloba e clorella também são reconhecidos por seus benefícios. Além disso, probióticos (Lactobacillus, Bifidobacterium) e Ômega 3 são importantes na suplementação para saúde geral e capilar.
• Mito: Lavar o cabelo diariamente NÃO causa queda. Porém, a dermatite seborreica SIM contribui para queda e deve ser abordada.
• Avaliação Capilar: Uma avaliação completa da saúde capilar envolve: histórico (familiar, patológico, social), inspeção inicial (observação de textura, espessura, oleosidade, porosidade, pigmentação, lesões, inflamação, descamação), avaliação de densidade, volume e comprimento dos fios, testes de porosidade e resistência do fio, registro fotográfico para acompanhamento, e exames complementares como laboratoriais (hematológicos, bioquímicos, hormonais, imunológicos), biópsia do couro cabeludo e exames de imagem.
• Opções Terapêuticas: Incluem uma vasta gama de abordagens como microagulhamento capilar (com dermaroller/dermapen), ozonioterapia (banho ou vapor de ozônio), eletroterapia (alta frequência), fotobioestimulação (com Laser de baixa intensidade e LEDs), carboxiterapia capilar (aplicação de CO2), intradermoterapia capilar (injeções de substâncias ativas no couro cabeludo), peelings capilares, e o uso de ativos tópicos (fármacos, geoterapia, fitoterápicos, fatores de crescimento) e nutracêuticos.
• Tratamentos Medicamentosos (Princípios Ativos):
    • Finasterida: Medicamento inibidor da enzima 5-alfa-redutase tipo II, reduzindo a conversão de testosterona em DHT. É amplamente estudada no tratamento de AAG masculina; para mulheres em idade fértil, o uso oral é contraindicado devido ao risco teratogênico, mas o uso tópico tem mostrado resultados promissores.
    • Dutasterida: Inibidor de segunda geração da 5-alfa-redutase, mais potente que a finasterida por inibir as isoenzimas tipo I e II. Reduz os níveis séricos e foliculares de DHT de forma mais acentuada. O uso tópico pode ser uma opção para evitar efeitos sistêmicos.
    • Minoxidil: Potente vasodilatador que atua estimulando o crescimento dos queratinócitos e o crescimento capilar em portadores de AAG, prolongando a fase anágena. Requer uso contínuo e cautela em pacientes cardiopatas ou hipertensos devido ao potencial de efeitos sistêmicos.
• Limitações do Tratamento: É fundamental entender que folículos capilares "mortos" não se recuperam; nenhum agente medicamentoso faz crescer cabelos em áreas totalmente sem folículos. Nesses casos, o transplante capilar é a única solução para preencher espaços vazios. Além disso, o tratamento capilar geralmente deve ser contínuo; a interrupção pode levar à reversão dos resultados obtidos em aproximadamente 4 a 6 meses.
• Reações a Cosméticos: O uso de produtos capilares pode gerar diferentes tipos de reações: irritação (intolerância local com desconforto, ardor, coceira), sensibilização (reação alérgica, que pode ser de efeito imediato ou tardio e aparecer em áreas distintas da aplicação) ou efeito sistêmico (resultante da passagem de ingredientes do produto para a circulação geral).

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
            response = requests.post(url, json=payload, headers=headers, timeout=60)
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
