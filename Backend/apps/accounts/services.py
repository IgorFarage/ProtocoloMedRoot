
import os
import requests
import json
import time
import logging
from typing import Optional, Dict, List, Any
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
        base_url = BitrixService._get_base_url()
        if not base_url: return None
        
        endpoint_add = f"{base_url}crm.lead.add.json"
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
            try:
                contact_check = requests.get(f"{base_url}crm.contact.list.json", params={
                    "filter[EMAIL]": user.email, "select[]": ["ID"]}, timeout=5)
                contact_check.raise_for_status()
                contacts = contact_check.json().get('result', [])
                if contacts:
                    return contacts[0]['ID']
            except requests.RequestException: pass

            try:
                lead_check = requests.get(f"{base_url}crm.lead.list.json", params={
                    "filter[EMAIL]": user.email, "filter[STATUS_ID]": "NEW", "select[]": ["ID"]}, timeout=5)
                lead_check.raise_for_status()
                leads = lead_check.json().get('result', [])
                if leads:
                    return leads[0]['ID']
            except requests.RequestException: pass

            logger.info(f"📤 Criando NOVO Lead no Bitrix para {user.email}...")
            response = requests.post(endpoint_add, json=payload, timeout=10)
            response.raise_for_status()
            result = response.json()
            
            if 'result' in result:
                lead_id = result['result']
                time.sleep(1.0) 
                try:
                    check = requests.get(f"{base_url}crm.lead.get.json?id={lead_id}", timeout=5)
                    contact_id = check.json().get('result', {}).get('CONTACT_ID')
                    if contact_id: return contact_id
                except: pass
                return lead_id
            return None
        except Exception as e:
            logger.exception(f"❌ Exceção create_lead: {e}")
            return None

    @staticmethod
    def prepare_deal_payment(user: Any, products_list: List[Dict], plan_title: str, total_amount: float, answers: Optional[Dict] = None, payment_data: Optional[Dict] = None) -> Optional[str]:
        base_url = BitrixService._get_base_url()
        if not base_url or not getattr(user, 'id_bitrix', None): return None

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
                lead_check = requests.get(f"{base_url}crm.lead.get.json?id={user.id_bitrix}", timeout=5)
                lead_data = lead_check.json().get('result')
                if lead_data and lead_data.get('CONTACT_ID'):
                    contact_id_to_use = str(lead_data.get('CONTACT_ID'))
                    user.id_bitrix = contact_id_to_use
                    user.save()
            except Exception: pass

            deal_resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": contact_id_to_use, "filter[CLOSED]": "N", "order[ID]": "DESC", "select[]": ["ID"]}, timeout=5)
            deals = deal_resp.json().get('result', [])
            if deals: deal_id = deals[0]['ID']
            
            if not deal_id:
                deal_resp_lead = requests.get(f"{base_url}crm.deal.list.json", params={
                    "filter[LEAD_ID]": user.id_bitrix, "filter[CLOSED]": "N", "order[ID]": "DESC", "select[]": ["ID"]}, timeout=5)
                deals_lead = deal_resp_lead.json().get('result', [])
                if deals_lead: deal_id = deals_lead[0]['ID']

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
                resp = requests.post(f"{base_url}crm.deal.add.json", json={"fields": fields_to_save}, timeout=10)
                if 'result' in resp.json(): deal_id = resp.json()['result']
            else:
                requests.post(f"{base_url}crm.deal.update.json", json={"id": deal_id, "fields": fields_to_save}, timeout=10)

            if deal_id and products_list:
                rows = [{"PRODUCT_ID": p.get('id', 0), "PRODUCT_NAME": p.get('name'), "PRICE": float(p.get('price', 0)), "QUANTITY": 1} for p in products_list]
                requests.post(f"{base_url}crm.deal.productrows.set.json", json={"id": deal_id, "rows": rows}, timeout=10)
            
            return deal_id
        except Exception as e:
            logger.exception(f"❌ Erro prepare_deal_payment: {e}")
            return None

    @staticmethod
    def update_contact_data(user_bitrix_id: str, cpf: Optional[str] = None, phone: Optional[str] = None) -> bool:
        base_url = BitrixService._get_base_url()
        if not base_url or not user_bitrix_id: return False
        fields = {}
        if cpf: fields[BitrixConfig.DEAL_FIELDS["CPF"]] = cpf
        if phone: fields["PHONE"] = [{"VALUE": phone, "VALUE_TYPE": "WORK"}]
        if not fields: return False
        try:
            requests.post(f"{base_url}crm.contact.update.json", json={"id": user_bitrix_id, "fields": fields}, timeout=5)
            return True
        except Exception: return False

    @staticmethod
    def update_contact_address(user_bitrix_id: str, address_data: Dict) -> bool:
        base_url = BitrixService._get_base_url()
        if not base_url or not user_bitrix_id or not address_data: return False
        fields = {
            "ADDRESS": f"{address_data.get('street', '')}, {address_data.get('number', '')}",
            "ADDRESS_2": f"{address_data.get('neighborhood', '')} - {address_data.get('complement', '')}",
            "ADDRESS_CITY": address_data.get('city', ''),
            "ADDRESS_POSTAL_CODE": address_data.get('cep', ''),
            "ADDRESS_PROVINCE": address_data.get('state', ''),
            "ADDRESS_COUNTRY": "Brasil"
        }
        try:
            requests.post(f"{base_url}crm.contact.update.json", json={"id": user_bitrix_id, "fields": fields}, timeout=5)
            logger.info(f"✅ Endereço do Contato {user_bitrix_id} atualizado.")
            return True
        except Exception as e:
            logger.exception(f"❌ Erro update_contact_address: {e}")
            return False

    @staticmethod
    def get_product_catalog() -> List[Dict]:
        base_url = BitrixService._get_base_url()
        if not base_url: return []
        try:
            target_ids = BitrixConfig.SECTION_IDS
            payload = { "filter": { "SECTION_ID": target_ids }, "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] }
            response = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=10)
            catalog = []
            if "result" in response.json():
                for p in response.json()["result"]:
                    catalog.append({
                        "id": p.get("ID"),
                        "name": p.get("NAME"),
                        "price": float(p.get("PRICE") or 0),
                        "description": p.get("DESCRIPTION", ""),
                        "image_url": BitrixService._fetch_best_image(base_url, p["ID"]),
                        "category_id": p.get("SECTION_ID")
                    })
            return catalog
        except Exception: return []

    # Cache simples em memória para evitar N+1 calls (ID -> {desc, img, timestamp})
    _PRODUCT_CACHE = {}

    @staticmethod
    def _get_cached_product_info(base_url: str, p_id: Any) -> Dict:
        # Verifica cache
        cached = BitrixService._PRODUCT_CACHE.get(p_id)
        if cached:
            return cached

        # Se não tiver no cache, busca
        desc = ""
        img_url = None
        
        try:
            # 1. Busca Detalhes (Descrição)
            p_info = requests.get(f"{base_url}crm.product.get.json", params={"id": p_id}, timeout=3).json().get("result", {})
            desc = p_info.get("DESCRIPTION", "")
        except: pass

        # 2. Busca Imagem
        img_url = BitrixService._fetch_best_image(base_url, p_id)
        
        # Salva no cache
        data = {"description": desc, "img": img_url}
        BitrixService._PRODUCT_CACHE[p_id] = data
        return data

    @staticmethod
    def _find_bitrix_id_by_email(email: str) -> Optional[str]:
        base_url = BitrixService._get_base_url()
        if not base_url: return None
        try:
            # 1. Search Contact
            contact_check = requests.get(f"{base_url}crm.contact.list.json", params={
                "filter[EMAIL]": email, "select[]": ["ID"]}, timeout=5)
            contacts = contact_check.json().get('result', [])
            if contacts: return contacts[0]['ID']

            # 2. Search Lead (if no contact)
            lead_check = requests.get(f"{base_url}crm.lead.list.json", params={
                "filter[EMAIL]": email, "select[]": ["ID"]}, timeout=5)
            leads = lead_check.json().get('result', [])
            if leads: return leads[0]['ID']
        except: pass
        return None

    @staticmethod
    def get_client_protocol(user: Any) -> Dict:
        base_url = BitrixService._get_base_url()
        if not base_url: return None

        # Self-Healing: Se não tem ID local, tenta buscar no Bitrix pelo email
        if not getattr(user, 'id_bitrix', None):
            found_id = BitrixService._find_bitrix_id_by_email(user.email)
            if found_id:
                user.id_bitrix = str(found_id)
                user.save()
                logger.info(f"🔧 Self-Healing: ID Bitrix recuperado para {user.email}: {found_id}")
            else:
                return {"error": "Usuário não vinculado ao Bitrix (Lead não encontrado)"}

        try:
            resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID", "STAGE_ID", "TITLE", "OPPORTUNITY"]}, timeout=5)
            deals = resp.json().get('result', [])
            if not deals: 
                # Tenta buscar pelo LEAD_ID caso o contato falhe
                resp_lead = requests.get(f"{base_url}crm.deal.list.json", params={
                    "filter[LEAD_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID", "STAGE_ID", "TITLE", "OPPORTUNITY"]}, timeout=5)
                deals = resp_lead.json().get('result', [])

            if not deals: return {"status": "no_deal", "message": "Nenhum protocolo encontrado."}
            
            deal = deals[0]
            deal_id = deal.get("ID")
            total_value = float(deal.get("OPPORTUNITY", 0))

            rows = requests.get(f"{base_url}crm.deal.productrows.get.json", params={"id": deal_id}, timeout=5).json().get('result', [])
            
            enrich_products = []
            for r in rows:
                p_id = r.get("PRODUCT_ID")
                product_info = {"description": "", "img": None}
                
                if p_id:
                    product_info = BitrixService._get_cached_product_info(base_url, p_id)

                enrich_products.append({
                    "id": p_id,
                    "name": r.get("PRODUCT_NAME"), 
                    "price": float(r.get("PRICE", 0)), 
                    "quantity": int(r.get("QUANTITY", 1)),
                    "description": product_info["description"],
                    "img": product_info["img"],
                    "sub": "Protocolo Personalizado" # Placeholder, ou mapear se possível
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
    def _fetch_best_image(base_url: str, product_id: Any) -> Optional[str]:
        try:
            img_res = requests.get(f"{base_url}catalog.productImage.list.json", params={"productId": product_id}, timeout=3)
            res = img_res.json().get("result", {})
            if res.get("productImages"): return res["productImages"][0].get("detailUrl")
        except: pass
        try:
            prod = requests.get(f"{base_url}crm.product.get.json", params={"id": product_id}, timeout=3).json().get("result", {})
            det = prod.get("DETAIL_PICTURE")
            if isinstance(det, dict): return det.get("showUrl")
            pre = prod.get("PREVIEW_PICTURE")
            if isinstance(pre, dict): return pre.get("showUrl")
        except: pass
        return None

    @staticmethod
    def generate_protocol(answers: Dict[str, Any]) -> Dict[str, Any]:
        base_url = BitrixService._get_base_url()
        if not base_url: return {"error": "Configuration Error"}
        MATCHERS = {
            "dutasterida_oral": ["Dutasterida"], "finasterida_oral": ["Finasterida"],
            "minoxidil_oral": ["Minoxidil", "2.5"], "saw_palmetto_oral": ["Saw"], 
            "minoxidil_topico": ["Minoxidil", "Tópico"], "finasterida_topica": ["Finasterida", "Tópico"], 
            "shampoo": ["Shampoo"], "biotina": ["Biotina"]
        }
        catalog_cache = []
        try:
            payload = { "filter": { "SECTION_ID": BitrixConfig.SECTION_IDS }, "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] }
            catalog_cache = requests.post(f"{base_url}crm.product.list.json", json=payload, timeout=5).json().get("result", [])
        except: return {"error": "Erro CRM Communication"}

        def find_product(role_key):
            keywords = [k.lower() for k in MATCHERS.get(role_key, [])]
            for p in catalog_cache:
                name = p.get("NAME", "").lower()
                if "topico" in role_key and str(p.get('SECTION_ID')) != '20': continue
                if all(k in name for k in keywords):
                    if "oral" in role_key and "topico" in name: continue
                    return p
            return None

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
                price = float(p.get("PRICE") or 0)
                total += price
                final_products.append({
                    "id": p["ID"], 
                    "name": p["NAME"], 
                    "price": price, 
                    "sub": "Protocolo Personalizado", 
                    "img": BitrixService._fetch_best_image(base_url, p["ID"]),
                    "description": p.get("DESCRIPTION", "")
                })

        return {"redFlag": False, "title": "Seu Protocolo Exclusivo", "description": "Baseado na sua triagem.", "products": final_products, "total_price": round(total, 2)}

    @staticmethod
    def get_plan_details(plan_slug):
        base_url = BitrixService._get_base_url()
        if not base_url: return None
        bitrix_id = BitrixConfig.PLAN_IDS.get(plan_slug)
        if not bitrix_id: return None
        try:
            prod = requests.get(f"{base_url}crm.product.get.json?id={bitrix_id}").json().get("result", {})
            return {"id": str(prod.get("ID")), "name": prod.get("NAME"), "price": float(prod.get("PRICE") or 0)}
        except: return None

    @staticmethod
    def check_and_update_user_plan(user: Any) -> str:
        """
        Verifica os produtos no Negócio (Deal) do usuário no Bitrix
        e atualiza o user.current_plan localmente.
        Retorna o plano detectado ('standard', 'plus' ou 'none').
        """
        base_url = BitrixService._get_base_url()
        if not base_url or not getattr(user, 'id_bitrix', None):
            return 'none'
        
        try:
            # 1. Encontrar o Deal do usuário
            resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix, 
                "order[ID]": "DESC", 
                "select[]": ["ID"]
            }, timeout=5)
            deals = resp.json().get('result', [])
            
            if not deals:
                return 'none'
            
            deal_id = deals[0].get("ID")
            
            # 2. Obter os produtos do Deal
            rows_resp = requests.get(f"{base_url}crm.deal.productrows.get.json", params={"id": deal_id}, timeout=5)
            rows = rows_resp.json().get('result', [])
            
            # [REF] Usando Config
            # Inicialização Necessária!
            has_plus = False
            has_standard = False
            
            plan_ids = BitrixConfig.PLAN_IDS
            id_standard = plan_ids.get('standard')
            id_plus = plan_ids.get('plus')

            for r in rows:
                p_id = int(r.get("PRODUCT_ID", 0))
                if p_id == id_plus:
                    has_plus = True
                elif p_id == id_standard:
                    has_standard = True
            
            new_plan = 'none'
            if has_plus:
                new_plan = 'plus'
            elif has_standard:
                new_plan = 'standard'
            
            # 3. Atualizar usuário se mudou
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
        """
        Busca dados detalhados do Contato no Bitrix (Telefone, Endereço).
        """
        base_url = BitrixService._get_base_url()
        contact_id = getattr(user, 'id_bitrix', None)
        
        if not base_url or not contact_id:
            return {}

        try:
            # Selecionar campos específicos para evitar payload gigante
            # PHONE, ADDRESS, ADDRESS_2, ADDRESS_CITY, ADDRESS_POSTAL_CODE, ADDRESS_PROVINCE
            resp = requests.get(f"{base_url}crm.contact.get.json", params={
                "id": contact_id
            }, timeout=5)
            
            data = resp.json().get('result', {})
            
            # Formatar Telefone
            phone = ""
            if "PHONE" in data and isinstance(data["PHONE"], list) and len(data["PHONE"]) > 0:
                phone = data["PHONE"][0].get("VALUE", "")

            # Formatar Endereço
            # Bitrix Fields: ADDRESS (Rua, Num), ADDRESS_2 (Bairro, Compl), ADDRESS_CITY, ADDRESS_PROVINCE, ADDRESS_POSTAL_CODE, ADDRESS_COUNTRY
            address = {
                "street": data.get("ADDRESS", ""), # O Bitrix muitas vezes junta tudo aqui se não for bem separado
                "city": data.get("ADDRESS_CITY", ""),
                "state": data.get("ADDRESS_PROVINCE", ""),
                "zip": data.get("ADDRESS_POSTAL_CODE", ""),
                "neighborhood": data.get("ADDRESS_2", ""),
                "country": data.get("ADDRESS_COUNTRY", "Brasil")
            }

            return {
                "phone": phone,
                "address": address
            }

        except Exception as e:
            logger.error(f"❌ Erro ao buscar dados do contato {contact_id}: {e}")
            return {}