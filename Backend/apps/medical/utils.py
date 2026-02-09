
# Mapeamento de Perguntas do Questionário (Sincronizado com Frontend data.ts)

QUESTION_MAP = {
    "F1_Q1_gender": "Gênero",
    "F1_Q2_stage": "Estágio da Calvície",
    "F1_Q3_speed": "Velocidade da Perda",
    "F1_Q4_scalp": "Tipo de Cabelo/Couro",
    "F1_Q5_family": "Histórico Familiar",
    "F1_Q6_goal": "Objetivo do Tratamento",
    "F2_Q7_irritation": "Irritação no Couro Cabeludo?",
    "F2_Q8_symptom": "Sintomas",
    "F2_Q9_consult": "Consultou Médico Recentemente?",
    "F2_Q10_anabolics": "Uso de Anabolizantes?",
    "F2_Q11_prev_treat": "Tratamento Anterior?",
    "F2_Q12_substance": "Substâncias Usadas",
    "F2_Q13_results": "Resultados Anteriores",
    "F2_Q14_health_cond": "Condições de Saúde",
    "F2_Q15_allergy": "Alergias",
    "F2_Q16_intervention": "Preferência de Intensidade",
    "F2_Q18_pets": "Possui Pets?",
    "F2_Q17_minox_format": "Preferência Minoxidil",
    "F2_Q19_priority": "Prioridade na Rotina"
}

def get_readable_question(key):
    return QUESTION_MAP.get(key, key)
