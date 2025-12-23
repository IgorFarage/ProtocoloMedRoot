import os
import requests
import json
import time

class BitrixService:
    
    # =========================================================================
    # 1. MAPEAMENTO E CRIAÇÃO DE LEADS (Lógica Original Preservada)
    # =========================================================================

    @staticmethod
    def _map_answers_to_bitrix(answers):
        """
        Traduz o JSON de respostas do Front para os campos UF_CRM do Bitrix.
        """
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

                # Regra Multi (Lista)
                elif field_type == 'multi':
                    if isinstance(user_answer, str):
                        items = [x.strip() for x in user_answer.split(',') if x.strip()]
                        bitrix_payload[field_code] = items
                    else:
                        bitrix_payload[field_code] = user_answer

                # Regra String (Padrão)
                else:
                    bitrix_payload[field_code] = user_answer
        
        return bitrix_payload

    @staticmethod
    def create_lead(user, answers):
        """
        1. Cria Lead -> 2. Aguarda Conversão -> 3. Atualiza CONTATO -> 4. Atualiza NEGÓCIO
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

    # =========================================================================
    # 2. ASSINATURA E PROTOCOLO DO CLIENTE (Lógica Original Preservada)
    # =========================================================================

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

    @staticmethod
    def get_client_protocol(user):
        """
        Busca o último negócio e retorna os itens da ABA DE PRODUTOS.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'

        if not user.id_bitrix:
            return {"error": "Usuário não vinculado ao Bitrix"}

        try:
            # 1. Busca Negócio (Deal)
            response = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix,
                "order[ID]": "DESC",
                "select[]": ["ID", "STAGE_ID", "TITLE"] 
            })
            deals = response.json().get('result', [])
            
            if not deals:
                return {"status": "no_deal", "message": "Nenhum protocolo encontrado."}

            latest_deal = deals[0]
            deal_id = latest_deal.get("ID")

            # 2. Busca os Produtos do Negócio (Product Rows)
            rows_response = requests.get(f"{base_url}crm.deal.productrows.get.json", params={"id": deal_id})
            product_rows = rows_response.json().get('result', [])

            # 3. Formata para o Front
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
        """
        Recebe lista de objetos com preço e adiciona no Negócio do Bitrix.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return False
        if not base_url.endswith('/'): base_url += '/'

        if not user.id_bitrix:
            return False

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
    # 3. LOJA / CATÁLOGO (Atualizado para não dar Erro 500)
    # =========================================================================

    @staticmethod
    def _fetch_best_image(base_url, product_id):
        """
        BUSCA HÍBRIDA: Tenta Galeria -> Tenta Capa (Detail) -> Tenta Preview
        """
        # 1. TENTATIVA: Galeria (catalog.productImage.list)
        try:
            img_res = requests.get(f"{base_url}catalog.productImage.list.json", params={"productId": product_id}, timeout=3)
            img_data = img_res.json()
            if "result" in img_data:
                res_obj = img_data["result"]
                if "productImages" in res_obj and len(res_obj["productImages"]) > 0:
                    first = res_obj["productImages"][0]
                    # Retorna URL pública direta
                    return first.get("detailUrl") or first.get("downloadUrl")
        except: pass

        # 2. TENTATIVA: Imagem de Capa/Preview (crm.product.get)
        # Se falhou a galeria, buscamos o produto individualmente para pegar a capa
        try:
            prod_res = requests.get(f"{base_url}crm.product.get.json", params={"id": product_id}, timeout=3)
            prod_data = prod_res.json()
            
            if "result" in prod_data:
                prod = prod_data["result"]
                
                # Prioridade: DETAIL_PICTURE (Imagem maior)
                detail = prod.get("DETAIL_PICTURE")
                if isinstance(detail, dict):
                    return detail.get("showUrl") or detail.get("downloadUrl")
                
                # Fallback: PREVIEW_PICTURE (Thumbnail)
                preview = prod.get("PREVIEW_PICTURE")
                if isinstance(preview, dict):
                    return preview.get("showUrl") or preview.get("downloadUrl")
        except: pass
        
        return None

    @staticmethod
    def get_product_catalog():
        """
        Lista produtos da loja garantindo a busca da imagem correta.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return []
        if not base_url.endswith('/'): base_url += '/'
        
        try:
            # IDs das categorias da loja
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
                    # Chama a função híbrida acima para garantir a imagem
                    img_url = BitrixService._fetch_best_image(base_url, p["ID"])

                    catalog.append({
                        "id": p.get("ID"),
                        "name": p.get("NAME"),
                        "price": float(p.get("PRICE") or 0),
                        "description": p.get("DESCRIPTION", ""),
                        "image_url": img_url, # Frontend usa isso. Se vier URL, mostra Bitrix. Se None, mostra local.
                        "category_id": p.get("SECTION_ID")
                    })
            return catalog
        except Exception as e:
            print(f"❌ Erro catálogo: {e}")
            return []

    # =========================================================================
    # 4. GERAÇÃO DE PROTOCOLO (Versão FINAL com Correção "Tópico")
    # =========================================================================

    @staticmethod
    def generate_protocol(answers):
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'

        # 1. Definição de Matchers
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

        # 2. Busca Catálogo no Bitrix
        catalog_cache = []
        try:
            target_ids = [16, 18, 20, 22, 24]
            payload = { "filter": { "SECTION_ID": target_ids }, "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] }
            resp = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=5)
            if "result" in resp.json(): catalog_cache = resp.json()["result"]
        except: return {"error": "Erro CRM"}

        # Função auxiliar de busca
        def find_product(role_key):
            keywords = [k.lower() for k in MATCHERS.get(role_key, [])]
            
            # Prioridade Tópico na Pasta 20
            if "topico" in role_key:
                for p in catalog_cache:
                    if str(p.get('SECTION_ID')) == '20' and all(k in p.get("NAME", "").lower() for k in keywords):
                        return p
            
            # Busca Geral
            for p in catalog_cache:
                name = p.get("NAME", "").lower()
                if all(k in name for k in keywords):
                    if "oral" in role_key and ("tópico" in name or "topico" in name): continue 
                    if "topico" in role_key and ("cápsula" in name or "capsula" in name): continue 
                    return p
            return None

        # 3. Lógica de Seleção (Baseada nas respostas)
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
        
        # Seleção Oral
        oral = None
        if gender == "masculino":
            if not block_horm: oral = "finasterida_oral"
            elif not block_minox_or: oral = "minoxidil_oral"
            else: oral = "saw_palmetto_oral"
        else:
            oral = "minoxidil_oral" if not block_minox_or else "saw_palmetto_oral"
        if oral: selected.append(oral)

        # Seleção Tópica
        topical = None
        if not block_minox_top: topical = "minoxidil_topico"
        if (not topical or block_minox_top) and gender == "masculino" and not block_horm:
            if not topical: topical = "finasterida_topica"
        if topical: selected.append(topical)
        
        selected.extend(["shampoo", "biotina"])

        # 4. Montagem Final e CÁLCULO DE PREÇO
        final_products = []
        total_accumulator = 0.0 # <--- Variável para somar o total

        for role in selected:
            p = find_product(role)
            if p:
                # Busca Imagem Híbrida
                img_url = BitrixService._fetch_best_image(base_url, p["ID"])
                
                # Preço
                price = float(p.get("PRICE") or 0)
                total_accumulator += price # <--- Somando

                final_products.append({
                    "id": p["ID"], 
                    "name": p["NAME"], 
                    "price": price,
                    "sub": "Protocolo Personalizado", 
                    "img": img_url
                })

        return {
            "redFlag": False,
            "title": "Seu Protocolo Exclusivo",
            "description": "Baseado na sua triagem, estes são os produtos ideais.",
            "products": final_products,
            "total_price": round(total_accumulator, 2) # <--- OBRIGATÓRIO PARA O FRONT NÃO DAR ERRO
        }

    @staticmethod
    def get_product_image_content(product_id):
        """
        [Helper/Debug] Mantido caso precise debugar download de imagens brutas.
        """
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
                    if raw_detail.get("downloadUrl"):
                        return BitrixService._download_from_url(raw_detail["downloadUrl"])
                    file_id = raw_detail.get("id")
                elif raw_detail: 
                    file_id = raw_detail

            if not file_id: return None, None

            download_payload = {
                "fields": {
                    "productId": product_id,
                    "fileId": file_id,
                    "fieldName": field_code 
                }
            }
            
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
        """
        Busca detalhes (Nome e Preço) de um produto/serviço específico pelo ID.
        Usado para pegar o valor atualizado da Taxa do Plano (262 ou 264).
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'

        try:
            # Seleciona apenas o necessário para ser rápido
            payload = {
                "filter": { "ID": product_id },
                "select": ["ID", "NAME", "PRICE"] 
            }
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