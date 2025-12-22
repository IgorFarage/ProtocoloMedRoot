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

    # @staticmethod
    # def get_product_catalog():
    #     """
    #     Versão RAIO-X: Imprime o JSON cru do primeiro produto para descobrirmos
    #     onde está a imagem ou confirmar que ela não existe.
    #     """
    #     base_url = os.getenv('BITRIX_WEBHOOK_URL')
    #     if not base_url: return []
    #     if not base_url.endswith('/'): base_url += '/'
        
    #     try:
    #         target_ids = [16, 18, 20, 22, 24]
            
    #         # TIRAMOS O SELECT PARA VIR TUDO (Padrão)
    #         payload = {
    #             "filter": { 
    #                 "SECTION_ID": target_ids 
    #             },
    #             # Limite de 1 para não poluir o terminal
    #             # mas pegamos a lista toda depois se precisar
    #         }
            
    #         # Usando crm.product.list
    #         response = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=10)
    #         data = response.json()
            
    #         if "result" in data:
    #             products_raw = data["result"]
                
    #             if len(products_raw) > 0:
    #                 print("\n🔍 --- RAIO-X DO PRIMEIRO PRODUTO ---")
    #                 p_demo = products_raw[0]
    #                 # Imprime chaves e valores para analisarmos
    #                 for key, val in p_demo.items():
    #                     # Trunca valores muito longos para leitura fácil
    #                     val_str = str(val)
    #                     if len(val_str) > 100: val_str = val_str[:100] + "..."
    #                     print(f"   👉 {key}: {val_str}")
    #                 print("--------------------------------------\n")
                
    #             # ... (resto do código para montar o catálogo normal) ...
    #             catalog = []
    #             for p in products_raw:
    #                 img_val = p.get("DETAIL_PICTURE") or p.get("PREVIEW_PICTURE")
    #                 img_id = None
    #                 if isinstance(img_val, dict): img_id = img_val.get("id")
    #                 elif img_val: img_id = img_val
                    
    #                 catalog.append({
    #                     "id": p.get("ID"),
    #                     "name": p.get("NAME"),
    #                     "price": float(p.get("PRICE") or 0),
    #                     "description": p.get("DESCRIPTION", ""),
    #                     "image_id": img_id, 
    #                 })
    #             return catalog
            
    #         return []

    #     except Exception as e:
    #         print(f"❌ Erro: {e}")
    #         return []

    @staticmethod
    def get_product_catalog():
        """
        1. Lista produtos.
        2. Busca a imagem na Galeria (catalog.productImage.list).
        3. Retorna a URL direta (CDN) para o Frontend.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return []
        if not base_url.endswith('/'): base_url += '/'
        
        try:
            target_ids = [16, 18, 20, 22, 24]
            
            # 1. Busca lista básica de produtos
            payload = {
                "filter": { "SECTION_ID": target_ids },
                "select": ["ID", "NAME", "PRICE", "DESCRIPTION"] 
            }
            
            response = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=10)
            data = response.json()
            
            catalog = []

            if "result" in data:
                products_raw = data["result"]
                print(f"📦 Processando {len(products_raw)} produtos...")

                for p in products_raw:
                    p_id = p.get("ID")
                    img_url = None
                    
                    # 2. Para cada produto, busca a imagem na galeria
                    try:
                        img_res = requests.get(f"{base_url}catalog.productImage.list.json", params={"productId": p_id})
                        img_data = img_res.json()
                        
                        if "result" in img_data:
                            # O Bitrix retorna: result: { productImages: [...] }
                            result_obj = img_data["result"]
                            
                            # Verifica se tem a chave productImages e se a lista não está vazia
                            if "productImages" in result_obj and len(result_obj["productImages"]) > 0:
                                first_img = result_obj["productImages"][0]
                                # A 'detailUrl' é o link público do CDN (mais rápido)
                                img_url = first_img.get("detailUrl")
                                # Se não tiver detailUrl, tenta downloadUrl
                                if not img_url:
                                    img_url = first_img.get("downloadUrl")
                                    
                    except Exception as e:
                        print(f"   ⚠️ Erro ao buscar imagem para produto {p_id}: {e}")

                    # Adiciona ao catálogo final
                    catalog.append({
                        "id": p.get("ID"),
                        "name": p.get("NAME"),
                        "price": float(p.get("PRICE") or 0),
                        "description": p.get("DESCRIPTION", ""),
                        "image_url": img_url, # Nova chave com a URL direta
                        "image_id": None      # Não precisamos mais do ID para proxy
                    })
                
                return catalog
            
            return []

        except Exception as e:
            print(f"❌ Erro crítico no catálogo: {e}")
            return []

    @staticmethod
    def get_product_image_content(product_id):
        """
        Versão de Diagnóstico para baixar imagem.
        Tenta: catalog.product.download com DETAIL_PICTURE
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None, None
        if not base_url.endswith('/'): base_url += '/'

        try:
            print(f"\n🖼️ [DEBUG] Buscando imagem Produto ID: {product_id}")
            
            # 1. Pega informações do produto para achar o ID do arquivo
            # Usando crm.product.get que é mais estável para pegar IDs de campo
            info_response = requests.get(f"{base_url}crm.product.get.json", params={"id": product_id})
            info_data = info_response.json()
            
            file_id = None
            field_code = "DETAIL_PICTURE" # Tenta Maiúsculo primeiro (Padrão CRM)

            if "result" in info_data:
                product = info_data["result"]
                
                # Debug do campo raw
                raw_detail = product.get("DETAIL_PICTURE")
                raw_preview = product.get("PREVIEW_PICTURE")
                print(f"   ↳ Raw DETAIL_PICTURE: {raw_detail}")
                
                # Tenta pegar ID do DETAIL_PICTURE
                if isinstance(raw_detail, dict):
                    # Às vezes vem: {'id': '123', 'showUrl': '...'}
                    file_id = raw_detail.get("id")
                    # Se já tiver URL pública (downloadUrl ou showUrl), USAMOS ELA DIRETO!
                    if raw_detail.get("downloadUrl"):
                        print(f"   ✅ URL de download encontrada direto no CRM!")
                        return BitrixService._download_from_url(raw_detail["downloadUrl"])
                    if raw_detail.get("showUrl"):
                        return BitrixService._download_from_url(raw_detail["showUrl"])
                        
                elif raw_detail: 
                    file_id = raw_detail # É o ID direto (int ou str)

                # Se falhar, tenta PREVIEW
                if not file_id:
                    field_code = "PREVIEW_PICTURE"
                    if isinstance(raw_preview, dict):
                        file_id = raw_preview.get("id")
                    elif raw_preview:
                        file_id = raw_preview

            if not file_id:
                print("   ❌ Produto sem imagem (Nenhum ID encontrado).")
                return None, None

            print(f"   📎 File ID: {file_id} | Field: {field_code}. Tentando catalog.product.download...")

            # 2. Tenta baixar via catalog.product.download
            download_payload = {
                "fields": {
                    "productId": product_id,
                    "fileId": file_id,
                    "fieldName": field_code 
                }
            }
            
            download_response = requests.post(f"{base_url}catalog.product.download", json=download_payload)
            content_type = download_response.headers.get('Content-Type', '')

            print(f"   📡 Status Download: {download_response.status_code} | Type: {content_type}")

            # Se retornou JSON, pode ser erro ou URL
            if 'application/json' in content_type:
                try:
                    resp_json = download_response.json()
                    if "result" in resp_json:
                        res = resp_json["result"]
                        if isinstance(res, dict) and "downloadUrl" in res:
                            print(f"   🔗 Redirecionando para: {res['downloadUrl']}")
                            return BitrixService._download_from_url(res['downloadUrl'])
                except:
                    pass
            
            if download_response.status_code == 200 and 'image' in content_type:
                return download_response.content, content_type
            
            print(f"   ❌ Falha no download. Conteúdo (primeiros 100 chars): {download_response.text[:100]}")
            return None, None

        except Exception as e:
            print(f"❌ Erro crítico imagem: {e}")
            return None, None

    @staticmethod
    def _download_from_url(url):
        """Helper para baixar de uma URL e retornar content/type"""
        try:
            r = requests.get(url)
            if r.status_code == 200:
                return r.content, r.headers.get('Content-Type', 'image/jpeg')
        except:
            pass
        return None, None

    @staticmethod
    def generate_protocol(answers):
        """
        Versão ESCALÁVEL (Sem IDs fixos):
        1. Busca produtos no Bitrix.
        2. Encontra os itens corretos procurando palavras-chave no NOME.
        3. Aplica a lógica médica.
        """
        base_url = os.getenv('BITRIX_WEBHOOK_URL')
        if not base_url: return None
        if not base_url.endswith('/'): base_url += '/'

        # --- CONFIGURAÇÃO INTELIGENTE (MATCHERS) ---
        # O sistema buscará produtos que tenham TODAS as palavras da lista no nome.
        # Ex: "minoxidil_oral" busca produto com "Minoxidil" E "Cápsula" no nome (case insensitive)
        MATCHERS = {
            "minoxidil_oral":     ["Minoxidil", "Cápsula"],
            "finasterida_oral":   ["Finasterida", "Cápsula"],
            "dutasterida_oral":   ["Dutasterida", "Cápsula"],
            "saw_palmetto_oral":  ["Saw", "Palmetto", "Cápsula"], # Ou apenas "Saw Palmetto" se for o único
            "biotina":            ["Biotina"],
            
            "minoxidil_topico":   ["Minoxidil", "Spray"], # Ou "Loção" dependendo do seu cadastro
            "finasterida_topica": ["Finasterida", "Spray"],
            "shampoo":            ["Shampoo"]
        }
        # ---------------------------------------------------------

        # --- 1. BUSCA CATÁLOGO COMPLETO DO BITRIX ---
        # Buscamos todos os produtos das categorias relevantes para filtrar na memória (mais rápido que N requests)
        catalog_cache = []
        try:
            # IDs das categorias que usamos no site (Ajuste se criar novas categorias)
            target_section_ids = [16, 18, 20, 22, 24] 
            
            payload = {
                "filter": { "SECTION_ID": target_section_ids },
                "select": ["ID", "NAME", "PRICE", "DESCRIPTION"]
            }
            response = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=10)
            if "result" in response.json():
                catalog_cache = response.json()["result"]
        except Exception as e:
            print(f"Erro ao baixar catálogo: {e}")
            return {"error": "Erro de comunicação com CRM"}

        # Função Helper para encontrar produto no cache
        def find_product_by_keywords(role_key):
            keywords = MATCHERS.get(role_key, [])
            if not keywords: return None
            
            for product in catalog_cache:
                name = product.get("NAME", "").lower()
                # Verifica se TODAS as palavras-chave estão no nome
                if all(k.lower() in name for k in keywords):
                    return product
            return None

        # --- 2. LÓGICA DE DECISÃO (MÉDICA) ---
        # Leitura das Respostas
        gender = answers.get("F1_Q1_gender")
        health_cond = answers.get("F2_Q14_health_cond", [])
        if isinstance(health_cond, str): health_cond = health_cond.split(',')
        
        allergies = answers.get("F2_Q15_allergy", [])
        if isinstance(allergies, str): allergies = allergies.split(',')
        
        has_pets = answers.get("F2_Q18_pets") == "sim"
        scalp_issues = answers.get("F2_Q8_symptom", [])
        if isinstance(scalp_issues, str): scalp_issues = scalp_issues.split(',')

        intervention = answers.get("F2_Q16_intervention")
        priority = answers.get("F2_Q19_priority")
        minox_pref = answers.get("F2_Q17_minox_format")

        # Red Flag
        if "depressao" in health_cond:
            return {
                "redFlag": True,
                "title": "Atenção Médica Necessária",
                "description": "Devido ao histórico de depressão/ansiedade, o uso de bloqueadores hormonais requer liberação psiquiátrica direta."
            }

        # Definição de Bloqueios
        block_hormonal = (gender == "feminino" or "cancer" in health_cond or 
                          "hepatica" in health_cond or "finasterida" in allergies or 
                          "dutasterida" in allergies)

        block_minox_oral = ("cardiaca" in health_cond or "renal" in health_cond or 
                            "hepatica" in health_cond or "ginecomastia" in health_cond or 
                            "minoxidil" in allergies)

        block_minox_topical = (has_pets or "psoriase" in scalp_issues or 
                               "cardiaca" in health_cond or "ginecomastia" in health_cond or 
                               "minoxidil" in allergies)

        block_saw = (gender == "feminino" or "cancer" in health_cond or "saw_palmetto" in allergies)

        # Seleção dos Produtos (Pelas Chaves Lógicas)
        selected_roles = []

        # Fixos
        selected_roles.append("shampoo")
        selected_roles.append("biotina")

        # Decisão Cápsula
        capsule_role = None
        if gender == "feminino":
            if not block_minox_oral: capsule_role = "minoxidil_oral"
        else:
            # Homens
            if (intervention == "dutasterida" or priority == "efetividade") and not block_hormonal:
                capsule_role = "dutasterida_oral"
            elif not block_hormonal and "finasterida" not in allergies:
                capsule_role = "finasterida_oral"
            elif not block_minox_oral:
                capsule_role = "minoxidil_oral"
            elif not block_saw:
                capsule_role = "saw_palmetto_oral"
        
        if capsule_role: selected_roles.append(capsule_role)

        # Decisão Tópico
        topical_role = None
        if not block_minox_topical:
            if minox_pref != "comprimido":
                topical_role = "minoxidil_topico"
        
        if not topical_role and gender == "masculino" and not block_hormonal:
            topical_role = "finasterida_topica"
            
        if topical_role: selected_roles.append(topical_role)

        # --- 3. MONTAGEM FINAL DO PROTOCOLO ---
        final_products = []
        
        for role in selected_roles:
            product_found = find_product_by_keywords(role)
            
            if product_found:
                p_id = product_found.get("ID")
                img_url = None
                
                # Busca Imagem na Galeria (Se existir)
                try:
                    img_res = requests.get(f"{base_url}catalog.productImage.list.json", params={"productId": p_id})
                    img_data = img_res.json()
                    if "result" in img_data:
                        res_obj = img_data["result"]
                        if "productImages" in res_obj and len(res_obj["productImages"]) > 0:
                            img_url = res_obj["productImages"][0].get("detailUrl")
                except:
                    pass

                final_products.append({
                    "id": p_id,
                    "name": product_found.get("NAME"),
                    "price": float(product_found.get("PRICE") or 0),
                    "sub": "Recomendado para seu perfil", 
                    "img": img_url
                })
            else:
                # Log opcional: Produto não encontrado no estoque com esse nome
                print(f"⚠️ Aviso: Produto com papel '{role}' não encontrado no Bitrix.")

        if not final_products:
             return {
                "redFlag": False,
                "title": "Em Análise",
                "description": "Nenhum produto compatível encontrado no estoque atual. Entraremos em contato.",
                "products": []
            }

        return {
            "redFlag": False,
            "title": "Seu protocolo exclusivo",
            "description": "Com base na sua triagem, estes são os medicamentos reais disponíveis no nosso estoque para você.",
            "products": final_products
        }