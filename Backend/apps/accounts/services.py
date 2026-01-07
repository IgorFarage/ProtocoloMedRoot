import os
import requests
import json
import time

class BitrixService:
    
    # =========================================================================
    # 1. MAPEAMENTOS (Configuração)
    # =========================================================================

    @staticmethod
    def _map_answers_to_bitrix(answers):
        """
        Traduz o JSON de respostas do Front para o formato JSON exigido (Q1_Genero...).
        """
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

        json_data = {}

        for user_key, user_value in answers.items():
            new_key = KEY_MAP.get(user_key)
            if new_key:
                # Garante que seja string ou Sim/Não
                if isinstance(user_value, list):
                    json_data[new_key] = ", ".join(user_value)
                elif isinstance(user_value, bool) or str(user_value).lower() in ['true', 'false']:
                    json_data[new_key] = "Sim" if str(user_value).lower() == 'true' else "Não"
                else:
                    json_data[new_key] = str(user_value)
        
        return json_data
        
    @staticmethod
    def _process_answers(answers):
        """
        Processa as respostas e retorna DOIS dicionários:
        1. fields_payload: Para salvar nos campos nativos UF_CRM_...
        2. json_payload: O dicionário formatado para virar JSON.
        """
        field_map = BitrixService._get_bitrix_field_map()
        json_map = BitrixService._get_json_key_map()
        
        fields_payload = {}
        json_payload = {}

        for user_key, user_value in answers.items():
            # Tratamento de valor (Lista -> String, Bool -> Sim/Não)
            final_value = str(user_value)
            if isinstance(user_value, list):
                final_value = ", ".join(user_value)
            elif isinstance(user_value, bool) or str(user_value).lower() in ['true', 'false']:
                final_value = "Sim" if str(user_value).lower() == 'true' else "Não"

            # 1. Popula Campos Individuais (UF_CRM_...)
            bitrix_field = field_map.get(user_key)
            if bitrix_field:
                fields_payload[bitrix_field] = final_value
            
            # 2. Popula Chaves do JSON (Q1_Genero...)
            json_key = json_map.get(user_key)
            if json_key:
                json_payload[json_key] = final_value
                
        return fields_payload, json_payload

    # =========================================================================
    # 2. CRIAÇÃO DE LEADS E NEGÓCIOS
    # =========================================================================

    @staticmethod
    def create_lead(user, answers=None, address_data=None):
        """
        Cria o Lead.
        NOTA: 'answers' é recebido mas NÃO usado aqui, pois os campos foram deletados do Lead.
        As respostas serão salvas no NEGÓCIO posteriormente.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'
        
        endpoint_add = f"{base_url}crm.lead.add.json"
        
        # Payload Básico (Sem campos UF_CRM_ de perguntas)
        payload = {
            "fields": {
                "TITLE": f"Lead - {user.full_name}",
                "NAME": user.full_name,
                "EMAIL": [{"VALUE": user.email, "VALUE_TYPE": "WORK"}],
                "STATUS_ID": "NEW",
                "OPENED": "Y",
                "SOURCE_ID": "WEB",
            },
            "params": {"REGISTER_SONET_EVENT": "Y"}
        }

        # Injeta Endereço
        if address_data:
            payload["fields"].update({
                "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
                "ADDRESS_2": f"{address_data.get('neighborhood', '')} {address_data.get('complement', '')}",
                "ADDRESS_CITY": address_data.get('city', ''),
                "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
                "ADDRESS_PROVINCE": address_data.get('state', ''),
                "ADDRESS_COUNTRY": "Brasil",
                "COMMENTS": f"Endereço de Entrega: {address_data.get('street')}, {address_data.get('number')} - {address_data.get('neighborhood')} - {address_data.get('city')}/{address_data.get('state')}"
            })
        
        try:
            print(f"Checking existence in Bitrix for {user.email}...")
            
            # 1. Busca Contato Existente
            contact_check = requests.get(f"{base_url}crm.contact.list.json", params={
                "filter[EMAIL]": user.email,
                "select[]": ["ID"]
            }, timeout=5)
            contacts = contact_check.json().get('result', [])
            if contacts:
                contact_id = contacts[0]['ID']
                print(f"✅ Contato já existe no Bitrix: {contact_id}")
                return contact_id

            # 2. Busca Lead em Aberto
            lead_check = requests.get(f"{base_url}crm.lead.list.json", params={
                "filter[EMAIL]": user.email,
                "filter[STATUS_ID]": "NEW", # Ou outros status abertos
                "select[]": ["ID"]
            }, timeout=5)
            leads = lead_check.json().get('result', [])
            if leads:
                lead_id = leads[0]['ID']
                print(f"✅ Lead já existe no Bitrix: {lead_id}")
                return lead_id

            # 3. Cria Novo Lead
            print(f"📤 Criando NOVO Lead no Bitrix para {user.email}...")
            response = requests.post(endpoint_add, json=payload, timeout=10)
            result = response.json()
            
            if response.status_code == 200 and 'result' in result:
                lead_id = result['result']
                print(f"✅ Lead criado com ID: {lead_id}")
                
                # Verifica se houve conversão automática para Contato
                time.sleep(1.0) 
                try:
                    check = requests.get(f"{base_url}crm.lead.get.json?id={lead_id}")
                    contact_id = check.json().get('result', {}).get('CONTACT_ID')
                    if contact_id:
                        print(f"🔄 Lead convertido para Contato ID: {contact_id}")
                        return contact_id
                except: pass
                
                return lead_id
            
            print(f"⚠️ Erro ao criar Lead: {result}")
            return None
        except Exception as e:
            print(f"❌ Exceção create_lead: {e}")
            return None

    @staticmethod
    def prepare_deal_payment(user, products_list, plan_title, total_amount, answers=None, payment_data=None):
        """
        Cria/Atualiza Negócio.
        Aqui salvamos o JSON das respostas no campo UF_CRM_1767644484.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url or not user.id_bitrix: return None
        if not base_url.endswith('/'): base_url += '/'

        # 1. Gera o JSON das respostas
        answers_json_string = None
        if answers:
            mapped_data = BitrixService._map_answers_to_bitrix(answers)
            if mapped_data:
                answers_json_string = json.dumps(mapped_data, ensure_ascii=False)
                print(f"📋 JSON de respostas gerado (Tamanho: {len(answers_json_string)} chars)")

        try:
            deal_id = None
            contact_id_to_use = user.id_bitrix

            # 0. Self-Healing: Verifica se o ID é de um Lead convertido em Contato
            try:
                # Tenta buscar como Lead
                lead_check = requests.get(f"{base_url}crm.lead.get.json?id={user.id_bitrix}", timeout=5)
                lead_data = lead_check.json().get('result')
                
                # Se for um Lead e tiver CONTACT_ID, significa que converteu!
                if lead_data and lead_data.get('CONTACT_ID'):
                    real_contact_id = lead_data.get('CONTACT_ID')
                    print(f"🔄 Self-Healing: Lead {user.id_bitrix} convertido para Contato {real_contact_id}. Atualizando...")
                    user.id_bitrix = str(real_contact_id)
                    user.save()
                    contact_id_to_use = str(real_contact_id)
            except Exception as e_healing:
                print(f"⚠️ Erro Self-Healing Bitrix: {e_healing}")

            # 1. Tenta encontrar Negócio ABERTO (não ganho/perdido)
            # Filtra por user ID (seja contact ou lead) + Stages semanticos 'P' (Processing)
            
            # Busca por CONTACT_ID
            deal_resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": contact_id_to_use,
                "filter[CLOSED]": "N", # Apenas negócios em aberto
                "order[ID]": "DESC",
                "select[]": ["ID"]
            })
            deals = deal_resp.json().get('result', [])
            if deals: deal_id = deals[0]['ID']
            
            # Se não achou, e o ID original ainda pode ser Lead (ou se o healing falhou), tenta por Lead ID
            if not deal_id:
                deal_resp_lead = requests.get(f"{base_url}crm.deal.list.json", params={
                    "filter[LEAD_ID]": user.id_bitrix, # Usa o ID original/atual
                    "filter[CLOSED]": "N",
                    "order[ID]": "DESC",
                    "select[]": ["ID"]
                })
                deals_lead = deal_resp_lead.json().get('result', [])
                if deals_lead: deal_id = deals_lead[0]['ID']

            # 3. Prepara campos para salvar (Valor + JSON)
            fields_to_save = {
                "TITLE": plan_title,
                "OPPORTUNITY": total_amount,
                "CURRENCY_ID": "BRL"
            }
            
            # INSERE O JSON SE EXISTIR
            if answers_json_string:
                fields_to_save["UF_CRM_1767644484"] = answers_json_string

            # INSERE DADOS DE PAGAMENTO (Se fornecidos)
            if payment_data:
                # UF_CRM_1767806427 -> ID do Mercado Pago
                if payment_data.get('id'):
                    fields_to_save["UF_CRM_1767806427"] = str(payment_data.get('id'))
                
                # UF_CRM_1767806112 -> Data Criacao (ISO)
                if payment_data.get('date_created'):
                    fields_to_save["UF_CRM_1767806112"] = str(payment_data.get('date_created'))
                
                # UF_CRM_1767806168 -> Status (Traduzido)
                if payment_data.get('status'):
                    status_map = {
                        "approved": "Aprovado",
                        "in_process": "Em análise",
                        "pending": "Pendente",
                        "rejected": "Recusado",
                        "cancelled": "Cancelado",
                        "refunded": "Reembolsado",
                        "charged_back": "Estornado"
                    }
                    raw_status = str(payment_data.get('status'))
                    fields_to_save["UF_CRM_1767806168"] = status_map.get(raw_status, raw_status)

            if not deal_id:
                # Criar Novo Negócio
                fields_to_save["CONTACT_ID"] = contact_id_to_use # Vincula ao ID correto (Lead ou Contact)
                add_resp = requests.post(f"{base_url}crm.deal.add.json", json={"fields": fields_to_save})
                result = add_resp.json()
                if 'result' in result:
                    deal_id = result['result']
                    print(f"✅ Novo Negócio criado: {deal_id}")
            else:
                # Atualizar Negócio Existente
                requests.post(f"{base_url}crm.deal.update.json", json={"id": deal_id, "fields": fields_to_save})
                print(f"✅ Negócio {deal_id} atualizado (Evitou Duplicata).")

            # 4. Insere Produtos
            if deal_id and products_list:
                rows = []
                for p in products_list:
                    rows.append({
                        "PRODUCT_ID": p.get('id', 0),
                        "PRODUCT_NAME": p.get('name'),
                        "PRICE": p.get('price'),
                        "QUANTITY": 1
                    })
                requests.post(f"{base_url}crm.deal.productrows.set.json", json={"id": deal_id, "rows": rows})
            
            return deal_id

        except Exception as e:
            print(f"❌ Erro prepare_deal_payment: {e}")
            return None

    @staticmethod
    def update_contact_data(user_bitrix_id, cpf=None, phone=None):
        """
        Atualiza CPF e Telefone no contato do Bitrix.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url or not user_bitrix_id: return False
        if not base_url.endswith('/'): base_url += '/'

        fields_to_update = {}

        # CPF -> UF_CRM_CONTACT_1767453262601
        if cpf:
            fields_to_update["UF_CRM_CONTACT_1767453262601"] = cpf
        
        # Telefone
        if phone:
            # Formata para padrão +55 se necessário, mas o Bitrix aceita string
            fields_to_update["PHONE"] = [{"VALUE": phone, "VALUE_TYPE": "WORK"}]

        if not fields_to_update: return False

        try:
            requests.post(f"{base_url}crm.contact.update.json", json={
                "id": user_bitrix_id,
                "fields": fields_to_update
            })
            print(f"✅ Contato {user_bitrix_id} atualizado com CPF/Telefone.")
            return True
        except Exception as e:
            print(f"❌ Erro update_contact_data: {e}")
            return False

    @staticmethod
    def update_contact_address(user_bitrix_id, address_data):
        """
        Atualiza apenas os campos de endereço no Contato Bitrix.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url or not user_bitrix_id: return False
        if not base_url.endswith('/'): base_url += '/'

        if not address_data: return False

        fields_to_update = {
            "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
            "ADDRESS_2": f"{address_data.get('neighborhood', '')} - {address_data.get('complement', '')}",
            "ADDRESS_CITY": address_data.get('city', ''),
            "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
            "ADDRESS_PROVINCE": address_data.get('state', ''),
            "ADDRESS_COUNTRY": "Brasil"
        }

        try:
            requests.post(f"{base_url}crm.contact.update.json", json={
                "id": user_bitrix_id,
                "fields": fields_to_update
            })
            print(f"✅ Endereço do Contato {user_bitrix_id} atualizado.")
            return True
        except Exception as e:
            print(f"❌ Erro update_contact_address: {e}")
            return False

    @staticmethod
    def process_subscription(user, address_data, cart_items, total_price):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return False
        if not base_url.endswith('/'): base_url += '/'
        if not user.id_bitrix: return False

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

        try:
            requests.post(f"{base_url}crm.contact.update.json", json={
                "id": user.id_bitrix,
                "fields": dados_endereco
            })
            return True
        except Exception as e:
            print(f"❌ Erro no process_subscription: {e}")
            return False

    @staticmethod
    def get_client_protocol(user):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'
        if not user.id_bitrix: return {"error": "Usuário não vinculado ao Bitrix"}

        try:
            response = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix,
                "order[ID]": "DESC",
                "select[]": ["ID", "STAGE_ID", "TITLE"] 
            })
            deals = response.json().get('result', [])
            
            if not deals: return {"status": "no_deal", "message": "Nenhum protocolo encontrado."}

            latest_deal = deals[0]
            deal_id = latest_deal.get("ID")
            rows_response = requests.get(f"{base_url}crm.deal.productrows.get.json", params={"id": deal_id})
            product_rows = rows_response.json().get('result', [])

            products_formatted = []
            for row in product_rows:
                products_formatted.append({
                    "name": row.get("PRODUCT_NAME"),
                    "price": float(row.get("PRICE", 0)),
                    "quantity": int(row.get("QUANTITY", 1)),
                })

            return {
                "deal_id": deal_id,
                "stage": latest_deal.get("STAGE_ID"),
                "products": products_formatted,
            }
        except Exception as e:
            print(f"❌ Erro ao buscar rows no Bitrix: {e}")
            return {"error": "Erro de conexão com o CRM"}

    @staticmethod
    def update_deal_products(user, product_data_list):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return False
        if not base_url.endswith('/'): base_url += '/'
        if not user.id_bitrix: return False

        try:
            response = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix,
                "order[ID]": "DESC",
                "select[]": ["ID"]
            })
            deals = response.json().get('result', [])
            
            if deals:
                deal_id = deals[0]['ID']
                rows_payload = []
                for item in product_data_list:
                    rows_payload.append({
                        "PRODUCT_NAME": item['name'],
                        "PRICE": str(item['price']),
                        "QUANTITY": 1,
                        "MEASURE_CODE": 796,
                        "MEASURE_NAME": "un"
                    })
                requests.post(f"{base_url}crm.deal.productrows.set.json", json={
                    "id": deal_id,
                    "rows": rows_payload
                })
                return True
            return False
        except Exception as e:
            print(f"❌ Erro ao setar productrows no Bitrix: {e}")
            return False

    # =========================================================================
    # 3. LOJA / CATÁLOGO / IMAGENS
    # =========================================================================

    @staticmethod
    def _fetch_best_image(base_url, product_id):
        try:
            img_res = requests.get(f"{base_url}catalog.productImage.list.json", params={"productId": product_id}, timeout=3)
            img_data = img_res.json()
            if "result" in img_data:
                res_obj = img_data["result"]
                if "productImages" in res_obj and len(res_obj["productImages"]) > 0:
                    first = res_obj["productImages"][0]
                    return first.get("detailUrl") or first.get("downloadUrl")
        except: pass

        try:
            prod_res = requests.get(f"{base_url}crm.product.get.json", params={"id": product_id}, timeout=3)
            prod_data = prod_res.json()
            if "result" in prod_data:
                prod = prod_data["result"]
                detail = prod.get("DETAIL_PICTURE")
                if isinstance(detail, dict):
                    return detail.get("showUrl") or detail.get("downloadUrl")
                preview = prod.get("PREVIEW_PICTURE")
                if isinstance(preview, dict):
                    return preview.get("showUrl") or preview.get("downloadUrl")
        except: pass
        return None

    @staticmethod
    def get_product_catalog():
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return []
        if not base_url.endswith('/'): base_url += '/'
        
        try:
            target_ids = [16, 18, 20, 22, 24, 32]
            payload = {
                "filter": { "SECTION_ID": target_ids },
                "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] 
            }
            response = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=10)
            data = response.json()
            
            catalog = []
            if "result" in data:
                for p in data["result"]:
                    img_url = BitrixService._fetch_best_image(base_url, p["ID"])
                    catalog.append({
                        "id": p.get("ID"),
                        "name": p.get("NAME"),
                        "price": float(p.get("PRICE") or 0),
                        "description": p.get("DESCRIPTION", ""),
                        "image_url": img_url, 
                        "category_id": p.get("SECTION_ID")
                    })
            return catalog
        except Exception as e:
            print(f"❌ Erro catálogo: {e}")
            return []

    # =========================================================================
    # 4. GERAÇÃO DE PROTOCOLO
    # =========================================================================

    @staticmethod
    def generate_protocol(answers):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'

        MATCHERS = {
            "dutasterida_oral":   ["Dutasterida"],
            "finasterida_oral":   ["Finasterida"],
            "minoxidil_oral":     ["Minoxidil", "2.5"],   
            "saw_palmetto_oral":  ["Saw"], 
            "minoxidil_topico":   ["Minoxidil", "Tópico"],    
            "finasterida_topica": ["Finasterida", "Tópico"], 
            "shampoo":            ["Shampoo"],
            "biotina":            ["Biotina"]
        }

        catalog_cache = []
        try:
            target_ids = [16, 18, 20, 22, 24]
            payload = { "filter": { "SECTION_ID": target_ids }, "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] }
            resp = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=5)
            if "result" in resp.json(): catalog_cache = resp.json()["result"]
        except: return {"error": "Erro CRM"}

        def find_product(role_key):
            keywords = [k.lower() for k in MATCHERS.get(role_key, [])]
            if "topico" in role_key:
                for p in catalog_cache:
                    if str(p.get('SECTION_ID')) == '20' and all(k in p.get("NAME", "").lower() for k in keywords):
                        return p
            for p in catalog_cache:
                name = p.get("NAME", "").lower()
                if all(k in name for k in keywords):
                    if "oral" in role_key and ("tópico" in name or "topico" in name): continue 
                    if "topico" in role_key and ("cápsula" in name or "capsula" in name): continue 
                    return p
            return None

        gender = answers.get("F1_Q1_gender", "masculino")
        def clean_list(key): 
            val = answers.get(key, "")
            return val.lower().split(',') if isinstance(val, str) else val

        health = clean_list("F2_Q14_health_cond")
        alrg = clean_list("F2_Q15_allergy")
        pets = answers.get("F2_Q18_pets") == "sim"
        
        block_horm = (gender == "feminino" or "cancer" in health or "hepatica" in health or "finasterida" in alrg)
        block_minox_or = ("cardiaca" in health or "renal" in health or "minoxidil" in alrg)
        block_minox_top = (pets or "psoriase" in clean_list("F2_Q8_symptom") or "cardiaca" in health)

        selected = []
        oral = None
        if gender == "masculino":
            if not block_horm: oral = "finasterida_oral"
            elif not block_minox_or: oral = "minoxidil_oral"
            else: oral = "saw_palmetto_oral"
        else:
            oral = "minoxidil_oral" if not block_minox_or else "saw_palmetto_oral"
        if oral: selected.append(oral)

        topical = None
        if not block_minox_top: topical = "minoxidil_topico"
        if (not topical or block_minox_top) and gender == "masculino" and not block_horm:
            if not topical: topical = "finasterida_topica"
        if topical: selected.append(topical)
        
        selected.extend(["shampoo", "biotina"])

        final_products = []
        total_accumulator = 0.0

        for role in selected:
            p = find_product(role)
            if p:
                img_url = BitrixService._fetch_best_image(base_url, p["ID"])
                price = float(p.get("PRICE") or 0)
                total_accumulator += price
                final_products.append({
                    "id": p["ID"], "name": p["NAME"], "price": price,
                    "sub": "Protocolo Personalizado", "img": img_url
                })

        return {
            "redFlag": False,
            "title": "Seu Protocolo Exclusivo",
            "description": "Baseado na sua triagem, estes são os produtos ideais.",
            "products": final_products,
            "total_price": round(total_accumulator, 2)
        }

    @staticmethod
    def get_product_image_content(product_id):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None, None
        if not base_url.endswith('/'): base_url += '/'

        try:
            info_response = requests.get(f"{base_url}crm.product.get.json", params={"id": product_id})
            info_data = info_response.json()
            file_id = None
            field_code = "DETAIL_PICTURE"

            if "result" in info_data:
                product = info_data["result"]
                raw_detail = product.get("DETAIL_PICTURE")
                if isinstance(raw_detail, dict):
                    if raw_detail.get("downloadUrl"): return BitrixService._download_from_url(raw_detail["downloadUrl"])
                    file_id = raw_detail.get("id")
                elif raw_detail: file_id = raw_detail

            if not file_id: return None, None

            download_payload = { "fields": { "productId": product_id, "fileId": file_id, "fieldName": field_code } }
            download_response = requests.post(f"{base_url}catalog.product.download", json=download_payload)
            content_type = download_response.headers.get('Content-Type', '')

            if download_response.status_code == 200 and 'image' in content_type:
                return download_response.content, content_type
            return None, None
        except Exception as e:
            print(f"❌ Erro imagem: {e}")
            return None, None

    @staticmethod
    def _download_from_url(url):
        try:
            r = requests.get(url)
            if r.status_code == 200:
                return r.content, r.headers.get('Content-Type', 'image/jpeg')
        except: pass
        return None, None

    @staticmethod
    def get_product_detail(product_id):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'
        try:
            payload = { "filter": { "ID": product_id }, "select": ["ID", "NAME", "PRICE"] }
            response = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=5)
            data = response.json()
            if "result" in data and len(data["result"]) > 0:
                item = data["result"][0]
                return {
                    "id": item["ID"],
                    "name": item["NAME"],
                    "price": float(item.get("PRICE") or 0)
                }
            return None
        except Exception as e:
            print(f"❌ Erro ao buscar serviço {product_id}: {e}")
            return None
    
    @staticmethod
    def get_plan_details(plan_slug):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'
        PLAN_IDS = {'standard': 262, 'plus': 264}
        bitrix_id = PLAN_IDS.get(plan_slug)
        if not bitrix_id: return None
        try:
            response = requests.get(f"{base_url}crm.product.get.json?id={bitrix_id}")
            data = response.json()
            if "result" in data:
                product = data["result"]
                return {"id": str(product.get("ID")), "name": product.get("NAME"), "price": float(product.get("PRICE") or 0)}
        except: pass
        return None