
import os
import requests
import json
import time
import logging
from typing import Optional, Dict, List, Any
from django.core.cache import cache
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from .config import BitrixConfig

logger = logging.getLogger(__name__)

class BitrixService:
    @staticmethod
    def _get_base_url() -> str:
        base_url = os.getenv('BITRIX_WEBHOOK_URL', '')
        if not base_url:
            logger.error("BITRIX_WEBHOOK_URL not configured.")
            return ""
        if not base_url.endswith('/'):
            base_url += '/'
        return base_url

    # =========================================================================
    # THE SHIELD (Safe Request Wrapper)
    # =========================================================================
    
    @staticmethod
    @retry(
        stop=stop_after_attempt(3), 
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((requests.exceptions.RequestException, requests.exceptions.Timeout))
    )
    def _safe_request(method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """
        Executa requisições ao Bitrix com Retries Automáticos (Tenacity) e Tratamento de Erro.
        """
        base_url = BitrixService._get_base_url()
        if not base_url:
            return None
            
        url = f"{base_url}{endpoint}"
        
        try:
            response = requests.request(method, url, timeout=10, **kwargs)
            
            # Rate Limiting Handling (429) is handled by Tenacity if we raise exception
            if response.status_code == 429:
                logger.warning(f"⚠️ Bitrix Rate Limit (429) em {endpoint}. Retrying...")
                response.raise_for_status() # Trigger retry
                
            response.raise_for_status()
            
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Erro Bitrix ({endpoint}): {str(e)}")
            raise e # Allow Tenacity to retry
        except Exception as e:
            logger.exception(f"❌ Erro Crítico Bitrix ({endpoint}): {e}")
            return None

    # =========================================================================
    # 1. MAPEAMENTOS (Configuração)
    # =========================================================================

    @staticmethod
    def _map_answers_to_bitrix(answers: Dict[str, Any]) -> Dict[str, str]:
        from .config import BitrixConfig
        
        json_data = {}
        for user_key, user_value in answers.items():
            new_key = BitrixConfig.KEY_MAP.get(user_key)
            if new_key:
                if isinstance(user_value, list):
                    json_data[new_key] = ", ".join(user_value)
                elif isinstance(user_value, bool) or str(user_value).lower() in ['true', 'false']:
                    json_data[new_key] = "Sim" if str(user_value).lower() == 'true' else "Não"
                else:
                    json_data[new_key] = str(user_value)
        return json_data
        
    @staticmethod
    def _get_bitrix_field_map() -> Dict[str, str]:
       return {}

    @staticmethod
    def _get_json_key_map() -> Dict[str, str]:
         return {"F1_Q1_gender": "Q1_Genero"}

    # =========================================================================
    # 2. CRIAÇÃO DE LEADS E NEGÓCIOS
    # =========================================================================

    @staticmethod
    def create_lead(user: Any, answers: Optional[Dict] = None, address_data: Optional[Dict] = None) -> Optional[str]:
        # Configurar Payload
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
            logger.info(f"Checking existence in Bitrix for {user.email}...")
            
            # Check Contact
            try:
                contact_check = BitrixService._safe_request('GET', 'crm.contact.list.json', params={
                    "filter[EMAIL]": user.email, "select[]": ["ID"]
                })
                if contact_check and contact_check.get('result'):
                    return contact_check['result'][0]['ID']
            except: pass

            # Check Lead
            try:
                lead_check = BitrixService._safe_request('GET', 'crm.lead.list.json', params={
                    "filter[EMAIL]": user.email, "filter[STATUS_ID]": "NEW", "select[]": ["ID"]
                })
                if lead_check and lead_check.get('result'):
                    return lead_check['result'][0]['ID']
            except: pass

            logger.info(f"📤 Criando NOVO Lead no Bitrix para {user.email}...")
            result = BitrixService._safe_request('POST', 'crm.lead.add.json', json=payload)
            
            if result and 'result' in result:
                lead_id = result['result']
                # Tenta verificar se converteu em contato automaticamente (Delay pequeno)
                time.sleep(1.0) 
                try:
                    check = BitrixService._safe_request('GET', 'crm.lead.get.json', params={'id': lead_id})
                    if check:
                        contact_id = check.get('result', {}).get('CONTACT_ID')
                        if contact_id: return contact_id
                except: pass
                return lead_id
            return None
        except Exception as e:
            logger.exception(f"❌ Exceção create_lead: {e}")
            return None

    @staticmethod
    def prepare_deal_payment(user: Any, products_list: List[Dict], plan_title: str, total_amount: float, answers: Optional[Dict] = None, payment_data: Optional[Dict] = None) -> Optional[str]:
        if not getattr(user, 'id_bitrix', None): return None

        answers_json_string = None
        if answers:
            mapped_data = BitrixService._map_answers_to_bitrix(answers)
            if mapped_data:
                answers_json_string = json.dumps(mapped_data, ensure_ascii=False)

        try:
            deal_id = None
            contact_id_to_use = user.id_bitrix

            # Self-Healing
            try:
                lead_check = BitrixService._safe_request('GET', 'crm.lead.get.json', params={"id": user.id_bitrix})
                if lead_check:
                    lead_data = lead_check.get('result')
                    if lead_data and lead_data.get('CONTACT_ID'):
                        contact_id_to_use = str(lead_data.get('CONTACT_ID'))
                        user.id_bitrix = contact_id_to_use
                        user.save()
            except Exception: pass

            # Encontrar Deal existente aberto
            deal_resp = BitrixService._safe_request('GET', 'crm.deal.list.json', params={
                "filter[CONTACT_ID]": contact_id_to_use, "filter[CLOSED]": "N", "order[ID]": "DESC", "select[]": ["ID"]
            })
            if deal_resp and deal_resp.get('result'):
                 deal_id = deal_resp['result'][0]['ID']
            
            if not deal_id:
                deal_resp_lead = BitrixService._safe_request('GET', 'crm.deal.list.json', params={
                    "filter[LEAD_ID]": user.id_bitrix, "filter[CLOSED]": "N", "order[ID]": "DESC", "select[]": ["ID"]
                })
                if deal_resp_lead and deal_resp_lead.get('result'):
                    deal_id = deal_resp_lead['result'][0]['ID']

            fields_to_save = {
                "TITLE": plan_title,
                "OPPORTUNITY": float(total_amount),
                "CURRENCY_ID": "BRL"
            }
            if answers_json_string: fields_to_save[BitrixConfig.DEAL_FIELDS["ANSWERS_JSON"]] = answers_json_string
            if payment_data:
                if payment_data.get('id'): fields_to_save[BitrixConfig.DEAL_FIELDS["PAYMENT_ID"]] = str(payment_data.get('id'))
                if payment_data.get('date_created'): fields_to_save[BitrixConfig.DEAL_FIELDS["PAYMENT_DATE"]] = str(payment_data.get('date_created'))
                if payment_data.get('status'):
                    status_map = {"approved": "Aprovado", "in_process": "Em análise", "pending": "Pendente", "rejected": "Recusado"}
                    raw = str(payment_data.get('status'))
                    fields_to_save[BitrixConfig.DEAL_FIELDS["PAYMENT_STATUS"]] = status_map.get(raw, raw)

            if not deal_id:
                fields_to_save["CONTACT_ID"] = contact_id_to_use
                resp = BitrixService._safe_request('POST', 'crm.deal.add.json', json={"fields": fields_to_save})
                if resp and 'result' in resp: deal_id = resp['result']
            else:
                BitrixService._safe_request('POST', 'crm.deal.update.json', json={"id": deal_id, "fields": fields_to_save})

            if deal_id and products_list:
                rows = [{"PRODUCT_ID": p.get('id', 0), "PRODUCT_NAME": p.get('name'), "PRICE": float(p.get('price', 0)), "QUANTITY": 1} for p in products_list]
                BitrixService._safe_request('POST', 'crm.deal.productrows.set.json', json={"id": deal_id, "rows": rows})
            
            return deal_id
        except Exception as e:
            logger.exception(f"❌ Erro prepare_deal_payment: {e}")
            return None

    @staticmethod
    def update_contact_data(user_bitrix_id: str, cpf: Optional[str] = None, phone: Optional[str] = None) -> bool:
        if not user_bitrix_id: return False
        fields = {}
        if cpf: fields[BitrixConfig.DEAL_FIELDS["CPF"]] = cpf
        if phone: fields["PHONE"] = [{"VALUE": phone, "VALUE_TYPE": "WORK"}]
        if not fields: return False
        try:
            BitrixService._safe_request('POST', 'crm.contact.update.json', json={"id": user_bitrix_id, "fields": fields})
            return True
        except Exception: return False

    @staticmethod
    def update_contact_address(user_bitrix_id: str, address_data: Dict) -> bool:
        if not user_bitrix_id or not address_data: return False
        fields = {
            "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
            "ADDRESS_2": f"{address_data.get('neighborhood', '')} - {address_data.get('complement', '')}",
            "ADDRESS_CITY": address_data.get('city', ''),
            "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
            "ADDRESS_PROVINCE": address_data.get('state', ''),
            "ADDRESS_COUNTRY": "Brasil"
        }
        try:
            BitrixService._safe_request('POST', 'crm.contact.update.json', json={"id": user_bitrix_id, "fields": fields})
            logger.info(f"✅ Endereço do Contato {user_bitrix_id} atualizado.")
            return True
        except Exception as e:
            logger.exception(f"❌ Erro update_contact_address: {e}")
            return False

    @staticmethod
    def get_product_catalog() -> List[Dict]:
        """
        Retorna o catálogo de produtos com Cache para evitar 429.
        """
        cache_key = "bitrix_product_catalog"
        cached_catalog = cache.get(cache_key)
        if cached_catalog:
            return cached_catalog

        try:
            target_ids = BitrixConfig.SECTION_IDS
            target_ids = BitrixConfig.SECTION_IDS
            payload = { "filter": { "SECTION_ID": target_ids }, "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] }
            response = BitrixService._safe_request('POST', 'crm.product.list.json', json=payload)
            
            catalog = []
            if response and "result" in response:
                for p in response["result"]:
                    catalog.append({
                        "id": p.get("ID"),
                        "name": p.get("NAME"),
                        "price": float(p.get("PRICE") or 0),
                        "description": p.get("DESCRIPTION", ""),
                        "image_url": BitrixService._fetch_best_image(p["ID"]),
                        "category_id": p.get("SECTION_ID")
                    })
            
            # Salva no Cache por 1 hora
            cache.set(cache_key, catalog, 3600)
            return catalog
        except Exception: return []

    @staticmethod
    def _fetch_best_image(product_id: Any) -> Optional[str]:
        # Tenta cache específico por imagem de produto (longa duração)
        cache_key = f"bitrix_product_image_{product_id}"
        cached_img = cache.get(cache_key)
        if cached_img: return cached_img

        try:
            # 1. ProductImage List
            img_res = BitrixService._safe_request('GET', 'catalog.productImage.list.json', params={"productId": product_id})
            if img_res and "result" in img_res:
                res = img_res["result"]
                if res.get("productImages"):
                    url = res["productImages"][0].get("detailUrl")
                    if url:
                        cache.set(cache_key, url, 86400) # 24h
                        return url
            
            # 2. Detail/Preview Picture
            prod = BitrixService._safe_request('GET', 'crm.product.get.json', params={"id": product_id})
            if prod and "result" in prod:
                res = prod["result"]
                url = None
                det = res.get("DETAIL_PICTURE")
                if isinstance(det, dict): url = det.get("showUrl")
                if not url:
                    pre = res.get("PREVIEW_PICTURE")
                    if isinstance(pre, dict): url = pre.get("showUrl")
                
                if url:
                    cache.set(cache_key, url, 86400)
                    return url
        except: pass
        img_placeholder = "https://via.placeholder.com/150" # Fallback
        cache.set(cache_key, img_placeholder, 3600)
        return img_placeholder

    @staticmethod
    def generate_protocol(answers: Dict[str, Any]) -> Dict[str, Any]:
        MATCHERS = {
            "dutasterida_oral": ["Dutasterida"], "finasterida_oral": ["Finasterida"],
            "minoxidil_oral": ["Minoxidil", "2.5"], "saw_palmetto_oral": ["Saw"], 
            "minoxidil_topico": ["Minoxidil", "Tópico"], "finasterida_topica": ["Finasterida", "Tópico"], 
            "shampoo": ["Shampoo"], "biotina": ["Biotina"]
        }
        
        # Usa o método com cache
        catalog_cache = BitrixService.get_product_catalog()
        if not catalog_cache: return {"error": "Erro CRM Communication"}

        def find_product(role_key):
            keywords = [k.lower() for k in MATCHERS.get(role_key, [])]
            for p in catalog_cache:
                name = p.get("name", "").lower()
                # Adaptação para usar o dicionário limpo do catalog_cache
                cat_id = str(p.get("category_id"))
                if "topico" in role_key and cat_id != '20': continue
                if all(k in name for k in keywords):
                    if "oral" in role_key and "topico" in name: continue
                    return p
            return None

        # Lógica de Recomendação (Mantida)
        gender = answers.get("F1_Q1_gender", "masculino")
        health = answers.get("F2_Q14_health_cond", "").lower()
        alrg = answers.get("F2_Q15_allergy", "").lower()
        pets = answers.get("F2_Q18_pets") == "sim"
        
        block_horm = (gender == "feminino" or "cancer" in health or "hepatica" in health or "finasterida" in alrg)
        block_minox_or = ("cardiaca" in health or "renal" in health or "minoxidil" in alrg)
        block_minox_top = (pets or "psoriase" in answers.get("F2_Q8_symptom", "").lower() or "cardiaca" in health)

        selected = []
        oral = "minoxidil_oral" if gender == "feminino" else ("finasterida_oral" if not block_horm else ("minoxidil_oral" if not block_minox_or else "saw_palmetto_oral"))
        if oral and not (oral == "minoxidil_oral" and block_minox_or): selected.append(oral)

        topical = "minoxidil_topico" if not block_minox_top else None
        if not topical and gender == "masculino" and not block_horm: topical = "finasterida_topica"
        if topical: selected.append(topical)
        
        selected.extend(["shampoo", "biotina"])
        final_products = []
        total = 0.0

        for role in selected:
            p = find_product(role)
            if p:
                price = p["price"]
                total += price
                final_products.append({
                    "id": p["id"], 
                    "name": p["name"], 
                    "price": price, 
                    "sub": "Protocolo Personalizado", 
                    "img": p["image_url"],
                    "description": p["description"]
                })

        return {"redFlag": False, "title": "Seu Protocolo Exclusivo", "description": "Baseado na sua triagem.", "products": final_products, "total_price": round(total, 2)}

    @staticmethod
    def get_plan_details(plan_slug):
        bitrix_id = BitrixConfig.PLAN_IDS.get(plan_slug)
        if not bitrix_id: return None
        
        # Cache para detalhes do plano
        cache_key = f"bitrix_plan_details_{plan_slug}"
        cached = cache.get(cache_key)
        if cached: return cached

        try:
            prod = BitrixService._safe_request('GET', 'crm.product.get.json', params={"id": bitrix_id})
            if prod and 'result' in prod:
                p = prod['result']
                data = {"id": str(p.get("ID")), "name": p.get("NAME"), "price": float(p.get("PRICE") or 0)}
                cache.set(cache_key, data, 3600)
                return data
        except: pass
        return None

    @staticmethod
    def check_and_update_user_plan(user: Any) -> str:
        if not getattr(user, 'id_bitrix', None): return 'none'
        
        try:
            # Encontrar o Deal
            resp = BitrixService._safe_request('GET', 'crm.deal.list.json', params={
                "filter[CONTACT_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID"]
            })
            if not resp or not resp.get('result'): return 'none'
            
            deal_id = resp['result'][0].get("ID")
            
            # Obter produtos
            rows_resp = BitrixService._safe_request('GET', 'crm.deal.productrows.get.json', params={"id": deal_id})
            if not rows_resp: return user.current_plan
            
            rows = rows_resp.get('result', [])
            
            plan_ids = BitrixConfig.PLAN_IDS
            id_standard = plan_ids.get('standard')
            id_plus = plan_ids.get('plus')
            
            has_plus = any(int(r.get("PRODUCT_ID", 0)) == id_plus for r in rows)
            has_standard = any(int(r.get("PRODUCT_ID", 0)) == id_standard for r in rows)
            
            new_plan = 'plus' if has_plus else ('standard' if has_standard else 'none')
            
            if user.current_plan != new_plan:
                user.current_plan = new_plan
                user.save(update_fields=['current_plan'])
                logger.info(f"✅ Plano do usuário {user.email} atualizado via Bitrix para: {new_plan}")
            
            return new_plan

        except Exception as e:
            logger.error(f"Erro ao sincronizar plano do Bitrix: {e}")
            return user.current_plan

    @staticmethod
    def get_contact_data(user: Any) -> Dict[str, Any]:
        contact_id = getattr(user, 'id_bitrix', None)
        if not contact_id: return {}
        
        cache_key = f"bitrix_contact_details_{contact_id}"
        cached = cache.get(cache_key)
        if cached: return cached

        try:
            resp = BitrixService._safe_request('GET', 'crm.contact.get.json', params={"id": contact_id})
            if not resp: return {}
            
            data = resp.get('result', {})
            
            phone = ""
            if "PHONE" in data and isinstance(data["PHONE"], list) and len(data["PHONE"]) > 0:
                phone = data["PHONE"][0].get("VALUE", "")

            address = {
                "street": data.get("ADDRESS", ""),
                "city": data.get("ADDRESS_CITY", ""),
                "state": data.get("ADDRESS_PROVINCE", ""),
                "zip": data.get("ADDRESS_POSTAL_CODE", ""),
                "neighborhood": data.get("ADDRESS_2", ""),
                "country": data.get("ADDRESS_COUNTRY", "Brasil")
            }
            
            final_data = {"phone": phone, "address": address}
            cache.set(cache_key, final_data, 300) # 5 minutos
            return final_data

        except Exception as e:
            logger.warning(f"⚠️ Erro ao buscar dados do contato {contact_id} (Offline Mode): {e}")
            return {}

    @staticmethod
    def get_client_protocol(user: Any) -> Dict:
        if not getattr(user, 'id_bitrix', None):
            found_id = BitrixService._find_bitrix_id_by_email(user.email)
            if found_id:
                user.id_bitrix = str(found_id)
                user.save()
            else:
                return {"error": "Usuário não vinculado ao Bitrix (Lead não encontrado)"}

        try:
            resp = BitrixService._safe_request('GET', 'crm.deal.list.json', params={
                "filter[CONTACT_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID", "STAGE_ID", "TITLE", "OPPORTUNITY"]
            })
            deals = resp.get('result', []) if resp else []
            if not deals: 
                 resp_lead = BitrixService._safe_request('GET', 'crm.deal.list.json', params={
                    "filter[LEAD_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID", "STAGE_ID", "TITLE", "OPPORTUNITY"]
                 })
                 deals = resp_lead.get('result', []) if resp_lead else []

            if not deals: return {"status": "no_deal", "message": "Nenhum protocolo encontrado."}
            
            deal = deals[0]
            deal_id = deal.get("ID")
            total_value = float(deal.get("OPPORTUNITY", 0))

            rows_res = BitrixService._safe_request('GET', 'crm.deal.productrows.get.json', params={"id": deal_id})
            rows = rows_res.get('result', []) if rows_res else []
            
            enrich_products = []
            for r in rows:
                p_id = r.get("PRODUCT_ID")
                # Usa métodos cacheados
                desc = ""
                img = None
                if p_id:
                    # Tenta pegar info do catálogo ou cache temporário
                    img = BitrixService._fetch_best_image(p_id)
                    # Descrição exigiria outro call se não estiver no catalog cache.
                    # Simplificação para performance: não busca description individualmente se for pesado
                
                enrich_products.append({
                    "id": p_id,
                    "name": r.get("PRODUCT_NAME"), 
                    "price": float(r.get("PRICE", 0)), 
                    "quantity": int(r.get("QUANTITY", 1)),
                    "description": desc,
                    "img": img,
                    "sub": "Protocolo Personalizado"
                })
            
            return {
                "deal_id": deal_id, 
                "stage": deal.get("STAGE_ID"), 
                "title": deal.get("TITLE"),
                "total_value": total_value,
                "products": enrich_products
            }
        except Exception as e: 
            logger.error(f"Erro get_client_protocol: {e}")
            return {"error": "Erro CRM"}

    @staticmethod
    def _find_bitrix_id_by_email(email: str) -> Optional[str]:
        try:
            contact_check = BitrixService._safe_request('GET', 'crm.contact.list.json', params={
                "filter[EMAIL]": email, "select[]": ["ID"]
            })
            if contact_check and contact_check.get('result'): return contact_check['result'][0]['ID']

            lead_check = BitrixService._safe_request('GET', 'crm.lead.list.json', params={
                "filter[EMAIL]": email, "select[]": ["ID"]
            })
            if lead_check and lead_check.get('result'): return lead_check['result'][0]['ID']
        except: pass
        return None

    # =========================================================================
    # 3. WEBHOOKS DE ENTRADA (Reactive Architecture)
    # =========================================================================

    @staticmethod
    def process_incoming_webhook(data: Dict[str, Any]) -> bool:
        """
        Processa eventos recebidos do Bitrix (Ex: ONCRMDEALUPDATE).
        """
        event = data.get('event')
        
        # Log seguro
        logger.info(f"📨 Webhook Bitrix Recebido: {event}")

        if event == 'ONCRMDEALUPDATE':
            return BitrixService._handle_deal_update(data)
            
        # Limpar Cache de Produtos se houver alteração no Catálogo
        if event in ['ONCRMPRODUCTUPDATE', 'ONCRMPRODUCTADD', 'ONCRMPRODUCTDELETE']:
            logger.info(f"♻️ Limpando Cache de Produtos (Trigger: {event})")
            cache.delete("bitrix_product_catalog")
            return True
        
        # Outros eventos: ONCRMCONTACTADD, etc.
        return True

    @staticmethod
    def _handle_deal_update(data: Dict[str, Any]) -> bool:
        """
        Quando um negócio é atualizado, verificamos se o usuário associado precisa de update no plano.
        """
        try:
            deal_id = data.get('data[FIELDS][ID]')
            if not deal_id: return False

            # Buscar o Deal para ver quem é o CONTACT_ID
            deal_info = BitrixService._safe_request('GET', 'crm.deal.get.json', params={"id": deal_id})
            if not deal_info or not deal_info.get('result'): return False
            
            result = deal_info['result']
            contact_id = result.get('CONTACT_ID')
            stage_id = result.get('STAGE_ID') 
            
            if not contact_id:
                logger.warning(f"Webhook Deal {deal_id} sem Contact ID.")
                return False

            # Encontrar usuário Django
            from .models import User
            try:
                user = User.objects.get(id_bitrix=str(contact_id))
                logger.info(f"🔄 Sincronizando Plano para usuário {user.email} (Trigger: Webhook Deal {deal_id})")
                
                # Forçar atualização do plano
                BitrixService.check_and_update_user_plan(user)
                return True
            except User.DoesNotExist:
                logger.warning(f"Webhook: Usuário com id_bitrix {contact_id} não encontrado no Django.")
                return False

        except Exception as e:
            logger.exception(f"❌ Erro _handle_deal_update: {e}")
            return False

    @staticmethod
    def sync_transaction_full(transaction: Any) -> Dict[str, Any]:
        """
        Sincronização COMPLETA: Garante que Contato, Endereço e Deal estejam corretos no Bitrix.
        Usado para recuperação manual ou auto-healing.
        """
        results = {
            "contact_created": False,
            "contact_updated": False,
            "address_updated": False,
            "deal_id": None,
            "errors": []
        }
        
        try:
            user = transaction.user
            meta = transaction.mp_metadata or {}
            
            # 1. Garantir existência do Lead/Contato
            # Tenta usar endereço do metadata se existir, senão pega do User (se formos expandir isso)
            address_data = {}
            if meta.get('shipping_address'):
                address_data = meta.get('shipping_address')
            
            # Se o usuário não tem bitrix_id, cria
            if not getattr(user, 'id_bitrix', None):
                lead_id = BitrixService.create_lead(user, answers=None, address_data=address_data)
                if lead_id:
                    user.id_bitrix = lead_id
                    user.save()
                    results["contact_created"] = True
                else:
                    results["errors"].append("Falha ao criar/encontrar Lead/Contato")
                    return results

            bitrix_id = user.id_bitrix
            
            # 2. Atualizar Dados do Contato (Telefone, CPF)
            payer = meta.get('payer', {})
            phone = payer.get('phone', {}).get('number') # Estrutura do MP geralmente
            if not phone and meta.get('payment_response'):
                 # Tentativa de fallback
                 phone = meta.get('payment_response', {}).get('payer', {}).get('phone', {}).get('number')
                 
            cpf = payer.get('identification', {}).get('number')
            
            if BitrixService.update_contact_data(bitrix_id, cpf=cpf, phone=phone):
                results["contact_updated"] = True
            
            # 3. Atualizar Endereço
            if address_data:
                 if BitrixService.update_contact_address(bitrix_id, address_data):
                     results["address_updated"] = True
            
            # 4. Criar/Atualizar Deal
            deal_id = BitrixService.prepare_deal_payment(
                user,
                meta.get('original_products', []),
                f"ProtocoloMed - {transaction.plan_type}",
                float(transaction.amount),
                meta.get('questionnaire_snapshot', {}),
                meta.get('payment_response', {})
            )
            
            if deal_id:
                results["deal_id"] = deal_id
                
                # Atualizar Transaction se necessário
                if transaction.bitrix_deal_id != str(deal_id):
                    transaction.bitrix_deal_id = str(deal_id)
                    transaction.bitrix_sync_status = 'synced'
                    transaction.save()
            else:
                 results["errors"].append("Falha ao criar Deal")

            return results

        except Exception as e:
            logger.exception(f"❌ Erro sync_transaction_full: {e}")
            results["errors"].append(str(e))
            return results