import os

class BitrixConfig:
    """
    Centralizes all Bitrix-specific constants and IDs.
    Ideally, values should be loaded from environment variables in production.
    """
    
    # Base URL
    WEBHOOK_URL = os.getenv('BITRIX_WEBHOOK_URL', '')

    # Custom Field Mapping (User Answers -> Bitrix Field ID)
    # Format: {'QuestionKey': 'BitrixFieldID'}
    KEY_MAP = {
        "F1_Q1_gender": "Q1_Genero",
        "F1_Q2_stage": "Q2_Estagio",
        "F1_Q3_speed": "Q3_Velocodade_Queda",
        "F1_Q4_scalp": "Q4_Couro_Cabeludo",
        "F1_Q5_family": "Q5_Historico_Familiar",
        "F1_Q6_goal": "Q6_Objetivo",
        "F2_Q7_irritation": "Q7_Irritação_Pele",
        "F2_Q8_symptom": "Q8_Sintoma",
        "F2_Q9_consult": "Q9_Consulta_Anterior",
        "F2_Q10_steroids": "Q10_Esteroides",
        "F2_Q11_prev_treat": "Q11_Tratamento_Prévio",
        "F2_Q12_substance": "Q12_Subistancia_Previa",
        "F2_Q13_results": "Q13_Resultados_Previa",
        "F2_Q14_health_cond": "Q14_Condição_Saúde",
        "F2_Q15_allergy": "Q15_Alergia",
        "F2_Q16_intervention": "Q16_Nivel_Intervenção",
        "F2_Q17_minox_format": "Q17_Minox_Formato",
        "F2_Q18_pets": "Q18_Possui_Pet",
        "F2_Q19_priority": "Q19_Rotina_Diaria"
    }

    # Deal Custom Fields (Hardcoded IDs from the original Service)
    DEAL_FIELDS = {
        "ANSWERS_JSON": "UF_CRM_1767644484",
        "PAYMENT_ID": "UF_CRM_1767806427",
        "PAYMENT_DATE": "UF_CRM_1767806112",
        "PAYMENT_STATUS": "UF_CRM_1767806168",
        "CPF": "UF_CRM_CONTACT_1767453262601"
    }

    # Plan Product IDs in Bitrix
    PLAN_IDS = {
        'standard': 262,
        'plus': 264
    }

    # Product Categories (Section IDs)
    SECTION_IDS = [16, 18, 20, 22, 24, 32]

    @staticmethod
    def get_map(key):
        return BitrixConfig.KEY_MAP.get(key)
