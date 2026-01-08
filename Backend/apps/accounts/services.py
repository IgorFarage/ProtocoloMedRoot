
import os
import requests
import json
import time
import logging
from typing import Optional, Dict, List, Any

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
            if answers_json_string: fields_to_save["UF_CRM_1767644484"] = answers_json_string
            if payment_data:
                if payment_data.get('id'): fields_to_save["UF_CRM_1767806427"] = str(payment_data.get('id'))
                if payment_data.get('date_created'): fields_to_save["UF_CRM_1767806112"] = str(payment_data.get('date_created'))
                if payment_data.get('status'):
                    status_map = {"approved": "Aprovado", "in_process": "Em análise", "pending": "Pendente", "rejected": "Recusado"}
                    raw = str(payment_data.get('status'))
                    fields_to_save["UF_CRM_1767806168"] = status_map.get(raw, raw)

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
        if cpf: fields["UF_CRM_CONTACT_1767453262601"] = cpf
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
            target_ids = [16, 18, 20, 22, 24, 32]
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

    @staticmethod
    def get_client_protocol(user: Any) -> Dict:
        base_url = BitrixService._get_base_url()
        if not base_url: return None
        if not getattr(user, 'id_bitrix', None): return {"error": "Usuário não vinculado ao Bitrix"}
        try:
            resp = requests.get(f"{base_url}crm.deal.list.json", params={
                "filter[CONTACT_ID]": user.id_bitrix, "order[ID]": "DESC", "select[]": ["ID", "STAGE_ID", "TITLE"]}, timeout=5)
            deals = resp.json().get('result', [])
            if not deals: return {"status": "no_deal", "message": "Nenhum protocolo encontrado."}
            deal_id = deals[0].get("ID")
            rows = requests.get(f"{base_url}crm.deal.productrows.get.json", params={"id": deal_id}, timeout=5).json().get('result', [])
            products = [{"name": r.get("PRODUCT_NAME"), "price": float(r.get("PRICE", 0)), "quantity": int(r.get("QUANTITY", 1))} for r in rows]
            return {"deal_id": deal_id, "stage": deals[0].get("STAGE_ID"), "products": products}
        except Exception: return {"error": "Erro CRM"}

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
            payload = { "filter": { "SECTION_ID": [16, 18, 20, 22, 24] }, "select": ["ID", "NAME", "PRICE", "DESCRIPTION", "SECTION_ID"] }
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
                final_products.append({"id": p["ID"], "name": p["NAME"], "price": price, "sub": "Protocolo Personalizado", "img": BitrixService._fetch_best_image(base_url, p["ID"])})

        return {"redFlag": False, "title": "Seu Protocolo Exclusivo", "description": "Baseado na sua triagem.", "products": final_products, "total_price": round(total, 2)}

    @staticmethod
    def get_plan_details(plan_slug):
        base_url = BitrixService._get_base_url()
        if not base_url: return None
        PLAN_IDS = {'standard': 262, 'plus': 264}
        bitrix_id = PLAN_IDS.get(plan_slug)
        if not bitrix_id: return None
        try:
            prod = requests.get(f"{base_url}crm.product.get.json?id={bitrix_id}").json().get("result", {})
            return {"id": str(prod.get("ID")), "name": prod.get("NAME"), "price": float(prod.get("PRICE") or 0)}
        except: return None