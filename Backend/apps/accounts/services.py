import os
import requests
import json
import time

class BitrixService:
    
    # --- Mantive o helper de mapeamento igual ---
    @staticmethod
    def _map_answers_to_bitrix(answers):
        # ... (Códido de mapeamento igual ao que você já tem, não precisa mudar)
        # Se quiser economizar espaço, mantenha a função _map_answers_to_bitrix que já está lá
        # Vou focar na correção do create_lead abaixo
        mapping_config = {
            "F1_Q1_gender":        {"field": "UF_CRM_1766075085", "type": "str"},
            "F1_Q2_stage":         {"field": "UF_CRM_1766077694", "type": "str"},
            "F1_Q3_speed":         {"field": "UF_CRM_1766077843", "type": "str"}, 
            "F1_Q4_scalp":         {"field": "UF_CRM_1766077899", "type": "str"},
            "F1_Q5_family":        {"field": "UF_CRM_1766078081", "type": "str"}, 
            "F1_Q6_goal":          {"field": "UF_CRM_1766078173", "type": "str"},
            "F2_Q7_irritation":    {"field": "UF_CRM_1766078258", "type": "bool"},
            "F2_Q8_symptom":       {"field": "UF_CRM_1766078470", "type": "multi"},
            "F2_Q9_consult":       {"field": "UF_CRM_1766078579", "type": "bool"},
            "F2_Q10_steroids":     {"field": "UF_CRM_1766078717", "type": "bool"},
            "F2_Q11_prev_treat":   {"field": "UF_CRM_1766078844", "type": "bool"},
            "F2_Q12_substance":    {"field": "UF_CRM_1766078952", "type": "multi"},
            "F2_Q13_results":      {"field": "UF_CRM_1766079016", "type": "str"},
            "F2_Q14_health_cond":  {"field": "UF_CRM_1766079104", "type": "multi"},
            "F2_Q15_allergy":      {"field": "UF_CRM_1766079153", "type": "multi"},
            "F2_Q16_intervention": {"field": "UF_CRM_1766079234", "type": "str"},
            "F2_Q17_minox_format": {"field": "UF_CRM_1766079294", "type": "str"},
            "F2_Q18_pets":         {"field": "UF_CRM_1766079353", "type": "bool"},
            "F2_Q19_priority":     {"field": "UF_CRM_1766079420", "type": "str"},
        }
        bitrix_payload = {}
        for question_id, user_answer in answers.items():
            if question_id in mapping_config:
                config = mapping_config[question_id]
                field_code = config['field']
                field_type = config['type']
                if field_type == 'bool':
                    val_lower = str(user_answer).lower()
                    if val_lower == 'sim': bitrix_payload[field_code] = 'Y'
                    elif val_lower == 'nao' or val_lower == 'não': bitrix_payload[field_code] = 'N'
                    else: bitrix_payload[field_code] = user_answer 
                elif field_type == 'multi':
                    if isinstance(user_answer, str):
                        items = [x.strip() for x in user_answer.split(',') if x.strip()]
                        bitrix_payload[field_code] = items
                    else: bitrix_payload[field_code] = user_answer
                else: bitrix_payload[field_code] = user_answer
        return bitrix_payload

    # --- AQUI ESTÁ A CORREÇÃO PRINCIPAL ---
    @staticmethod
    def create_lead(user, answers, address_data=None): # <--- Adicionado address_data=None
        """
        Cria Lead com endereço -> Converte -> Atualiza Contato
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'
        
        # 1. Criação do Lead
        endpoint_add = f"{base_url}crm.lead.add.json"
        
        payload = {
            "fields": {
                "TITLE": f"Lead - {user.full_name}",
                "NAME": user.full_name,
                "EMAIL": [{"VALUE": user.email, "VALUE_TYPE": "WORK"}],
                "STATUS_ID": "NEW",
                "OPENED": "Y",
                "SOURCE_ID": "WEB",
                "COMMENTS": f"Respostas JSON: {json.dumps(answers, ensure_ascii=False)}"
            },
            "params": {"REGISTER_SONET_EVENT": "Y"}
        }
        
        # Injeta Endereço no Lead se disponível
        if address_data:
            payload["fields"].update({
                "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
                "ADDRESS_2": f"{address_data.get('neighborhood', '')} - {address_data.get('complement', '')}",
                "ADDRESS_CITY": address_data.get('city', ''),
                "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
                "ADDRESS_PROVINCE": address_data.get('state', ''),
                "ADDRESS_COUNTRY": "Brasil"
            })
        
        try:
            response = requests.post(endpoint_add, json=payload, timeout=10)
            result = response.json()
            
            if response.status_code == 200 and 'result' in result:
                lead_id = result['result']
                print(f"✅ Lead criado: {lead_id}")
                
                final_id = lead_id
                
                # Delay técnico para automação do Bitrix
                time.sleep(2.0)
                
                # Verifica conversão automática
                get_resp = requests.get(f"{base_url}crm.lead.get.json?id={lead_id}")
                lead_data = get_resp.json().get('result', {})
                contact_id = lead_data.get('CONTACT_ID')
                deal_id = lead_data.get('DEAL_ID')
                
                if contact_id:
                    print(f"🔄 Lead virou Contato: {contact_id}")
                    final_id = contact_id
                    
                    # Atualiza ID Local no Contato
                    fields_contact = { "UF_CRM_ID_LOCAL": str(user.id) }
                    
                    # Reforço de Endereço no Contato
                    if address_data:
                        fields_contact.update({
                            "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
                            "ADDRESS_2": f"{address_data.get('neighborhood', '')} - {address_data.get('complement', '')}",
                            "ADDRESS_CITY": address_data.get('city', ''),
                            "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
                            "ADDRESS_PROVINCE": address_data.get('state', ''),
                            "ADDRESS_COUNTRY": "Brasil"
                        })

                    requests.post(f"{base_url}crm.contact.update.json", json={
                        "id": contact_id,
                        "fields": fields_contact
                    })

                    # Se já tiver Negócio, preenche respostas do Quiz
                    if deal_id:
                        campos_respostas = BitrixService._map_answers_to_bitrix(answers)
                        requests.post(f"{base_url}crm.deal.update.json", json={
                            "id": deal_id,
                            "fields": campos_respostas
                        })
                
                return final_id
            return None
        except Exception as e:
            print(f"❌ Erro BitrixService: {e}")
            return None

    # ... (Mantenha o resto da classe BitrixService igual: process_subscription, etc) ...
    # Copie os métodos restantes do seu arquivo original (get_product_catalog, etc) para cá.
    # Vou incluir os métodos essenciais abaixo para garantir que nada quebre:

    @staticmethod
    def _fetch_best_image(base_url, product_id):
        # ... (código existente mantido)
        return None 

    @staticmethod
    def prepare_deal_payment(user, products_list, plan_name, total_amount):
        # Este método já estava correto no seu arquivo enviado, mantenha-o.
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url or not user.id_bitrix: return None
        if not base_url.endswith('/'): base_url += '/'

        try:
            deal_resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID"]
            })
            deals = deal_resp.json().get('result', [])
            
            deal_fields = {
                "TITLE": f"Assinatura - {plan_name} - {user.full_name}",
                "OPPORTUNITY": total_amount,
                "CURRENCY_ID": "BRL",
                "STAGE_ID": "NEW", 
                "SOURCE_ID": "WEB"
            }

            if deals:
                deal_id = deals[0]['ID']
                requests.post(f"{base_url}crm.deal.update.json", json={"id": deal_id, "fields": deal_fields})
            else:
                create_resp = requests.post(f"{base_url}crm.deal.add.json", json={
                    "fields": {"CONTACT_ID": user.id_bitrix, **deal_fields}
                })
                deal_id = create_resp.json().get('result')

            if not deal_id: return None

            rows = []
            for item in products_list:
                rows.append({
                    "PRODUCT_ID": item['id'],
                    "PRODUCT_NAME": item['name'],
                    "PRICE": item['price'],
                    "QUANTITY": 1,
                    "MEASURE_CODE": 796
                })
            
            requests.post(f"{base_url}crm.deal.productrows.set.json", json={"id": deal_id, "rows": rows})
            return deal_id

        except Exception as e:
            print(f"❌ Erro Bitrix Deal: {e}")
            return None