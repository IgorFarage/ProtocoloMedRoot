import os
import requests
import json
import time

class BitrixService:
    
    @staticmethod
    def _map_answers_to_bitrix(answers):
        """
        Traduz o JSON de respostas do Front para os campos UF_CRM do Bitrix.
        """
        # Mapa de Configuração (ID da Questão -> ID Bitrix e Tipo)
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
                
                # Regra Y/N (Sim/Não)
                if field_type == 'bool':
                    val_lower = str(user_answer).lower()
                    if val_lower == 'sim':
                        bitrix_payload[field_code] = 'Y'
                    elif val_lower == 'nao' or val_lower == 'não':
                        bitrix_payload[field_code] = 'N'
                    else:
                        bitrix_payload[field_code] = user_answer 

                # Regra Especial removida para Q3, agora tratada como STR abaixo

                # Regra Multi (Lista)
                elif field_type == 'multi':
                    if isinstance(user_answer, str):
                        items = [x.strip() for x in user_answer.split(',') if x.strip()]
                        bitrix_payload[field_code] = items
                    else:
                        bitrix_payload[field_code] = user_answer

                # Regra String (Padrão) - Q3 e Q5 caem aqui agora
                else:
                    bitrix_payload[field_code] = user_answer
        
        return bitrix_payload

    @staticmethod
    def create_lead(user, answers):
        """
        1. Cria Lead
        2. Aguarda Conversão
        3. Atualiza CONTATO (com ID Local)
        4. Busca e Atualiza NEGÓCIO (com Respostas Mapeadas)
        5. Retorna ID do CONTATO para o banco
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url:
            print("ERRO: BITRIX_WEBHOOK_URL não encontrada no .env")
            return None
        if not base_url.endswith('/'): base_url += '/'
        
        # --- 1. CRIAÇÃO DO LEAD ---
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
        
        try:
            response = requests.post(endpoint_add, json=payload, timeout=10)
            result = response.json()
            
            if response.status_code == 200 and 'result' in result:
                lead_id = result['result']
                print(f"✅ [1/4] Lead criado com ID: {lead_id}")
                
                # --- 2. VERIFICAÇÃO DE CONVERSÃO ---
                final_id_para_banco = lead_id 
                
                try:
                    time.sleep(2.0) 
                    
                    get_resp = requests.get(f"{base_url}crm.lead.get.json?id={lead_id}")
                    lead_data = get_resp.json().get('result', {})
                    
                    contact_id = lead_data.get('CONTACT_ID')
                    deal_id = lead_data.get('DEAL_ID')
                    
                    # --- 3. ATUALIZAÇÃO DO CONTATO (ID Local) ---
                    if contact_id:
                        print(f"🔄 [2/4] Lead virou CONTATO {contact_id}")
                        final_id_para_banco = contact_id
                        
                        requests.post(f"{base_url}crm.contact.update.json", json={
                            "id": contact_id,
                            "fields": { "UF_CRM_ID_LOCAL": str(user.id) }
                        })
                        print(f"🤝 [3/4] ID Local vinculado ao Contato {contact_id}")
                        
                        # --- 4. ATUALIZAÇÃO DO NEGÓCIO (Respostas Mapeadas) ---
                        if not deal_id:
                            print("🔎 Buscando Negócio via Contato...")
                            deal_resp = requests.get(f"{base_url}crm.deal.list.json", params={
                                "filter[CONTACT_ID]": contact_id,
                                "order[ID]": "DESC",
                                "select[]": ["ID"]
                            })
                            deals = deal_resp.json().get('result', [])
                            if deals: deal_id = deals[0]['ID']
                        
                        if deal_id:
                            print(f"💰 [4/4] Atualizando Negócio {deal_id} com Respostas Detalhadas...")
                            
                            # Prepara os campos mapeados
                            campos_respostas = BitrixService._map_answers_to_bitrix(answers)

                            requests.post(f"{base_url}crm.deal.update.json", json={
                                "id": deal_id,
                                "fields": campos_respostas
                            })
                            print(f"✅ Respostas mapeadas enviadas com sucesso para o Negócio {deal_id}")
                        else:
                            print("⚠️ Aviso: Negócio não encontrado para salvar as respostas.")

                    else:
                        print("ℹ️ Lead não gerou contato. Mantendo como Lead.")

                except Exception as e:
                    print(f"⚠️ Erro no processo de conversão: {e}")
                
                return final_id_para_banco
            
            return None
        except Exception as e:
            print(f"❌ Erro crítico: {str(e)}")
            return None

    @staticmethod
    def process_subscription(user, address_data, cart_items, total_price):
        """
        Atualiza Endereço no Contato e Valor no Negócio.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return False
        if not base_url.endswith('/'): base_url += '/'

        if not user.id_bitrix:
            print(f"⚠️ Usuário {user.email} sem id_bitrix.")
            return False

        lista_produtos = "\n".join([f"- {item['name']} (R$ {item['price']})" for item in cart_items])
        comentarios = f"🛒 PEDIDO ASSINATURA\nItens:\n{lista_produtos}\nTotal: R$ {total_price}"

        dados_endereco = {
            "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
            "ADDRESS_2": f"{address_data.get('neighborhood', '')} - {address_data.get('complement', '')}",
            "ADDRESS_CITY": address_data.get('city', ''),
            "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
            "ADDRESS_PROVINCE": address_data.get('state', ''),
            "ADDRESS_COUNTRY": "Brasil"
        }
        
        dados_financeiros = {
            "OPPORTUNITY": total_price,
            "CURRENCY_ID": "BRL",
            "COMMENTS": comentarios
        }

        try:
            # Assumimos que é Contato
            print(f"🔍 Processando assinatura para Contato ID: {user.id_bitrix}")
            
            # 1. Atualiza Endereço
            requests.post(f"{base_url}crm.contact.update.json", json={
                "id": user.id_bitrix,
                "fields": dados_endereco
            })
            
            # 2. Busca e Atualiza Negócio
            deal_resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix,
                "order[ID]": "DESC",
                "select[]": ["ID"]
            })
            deals = deal_resp.json().get('result', [])
            
            if deals:
                requests.post(f"{base_url}crm.deal.update.json", json={
                    "id": deals[0]['ID'],
                    "fields": dados_financeiros
                })
            else:
                # Cria negócio se não houver
                requests.post(f"{base_url}crm.deal.add.json", json={
                    "fields": {
                        "TITLE": f"Assinatura - {user.full_name}",
                        "CONTACT_ID": user.id_bitrix,
                        **dados_financeiros
                    }
                })
            
            return True

        except Exception as e:
            print(f"❌ Erro no process_subscription: {e}")
            return False

    @staticmethod
    def diagnostico_completo(email_usuario):
        pass