import json
from django.core.management.base import BaseCommand
from django.core.serializers.json import DjangoJSONEncoder
from apps.accounts.services import BitrixService

class Command(BaseCommand):
    help = 'Inspeciona dados do usuário DIRETAMENTE no Bitrix via API'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Email do usuário para busca')

    def handle(self, *args, **options):
        email = options.get('email')
        self.stdout.write(f"🔍 Buscando {email} no Bitrix...")

        data = {
            "email_buscado": email,
            "bitrix_id": None,
            "contact_data": {},
            "deals": []
        }

        # 1. Busca ID
        try:
            bitrix_id = BitrixService._find_bitrix_id_by_email(email)
            if not bitrix_id:
                self.stdout.write(self.style.ERROR('❌ Usuário não encontrado no Bitrix (Lead ou Contato).'))
                return
            
            data["bitrix_id"] = bitrix_id
            self.stdout.write(self.style.SUCCESS(f"✅ Encontrado ID: {bitrix_id}"))

            # 2. Dados do Contato
            contact_resp = BitrixService._safe_request('GET', 'crm.contact.get.json', params={"id": bitrix_id})
            if contact_resp and 'result' in contact_resp:
                c = contact_resp['result']
                data["contact_data"] = {
                    "NAME": c.get("NAME"),
                    "LAST_NAME": c.get("LAST_NAME"),
                    "PHONE": c.get("PHONE"),
                    "EMAIL": c.get("EMAIL"),
                    "ADDRESS": c.get("ADDRESS"),
                    "ADDRESS_CITY": c.get("ADDRESS_CITY"),
                    "UF_CRM_... (CPF)": c.get("UF_CRM_CONTACT_1767453262601") # Exemplo de campo custom
                }
            
            # 3. Deals (Ganhos, Perdidos, Em andamento)
            deals_resp = BitrixService._safe_request('GET', 'crm.deal.list.json', params={
                "filter[CONTACT_ID]": bitrix_id,
                "order[ID]": "DESC",
                "select[]": ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "DATE_CREATE", "CLOSED"]
            })

            if deals_resp and 'result' in deals_resp:
                for d in deals_resp['result']:
                    deal_obj = {
                        "id": d.get("ID"),
                        "title": d.get("TITLE"),
                        "stage": d.get("STAGE_ID"),
                        "value": d.get("OPPORTUNITY"),
                        "created": d.get("DATE_CREATE"),
                        "is_closed": d.get("CLOSED"),
                        "products": []
                    }
                    
                    # 4. Produtos do Deal
                    rows_resp = BitrixService._safe_request('GET', 'crm.deal.productrows.get.json', params={"id": d.get("ID")})
                    if rows_resp and 'result' in rows_resp:
                        for r in rows_resp['result']:
                            deal_obj["products"].append({
                                "product_id": r.get("PRODUCT_ID"),
                                "name": r.get("PRODUCT_NAME"),
                                "price": r.get("PRICE"),
                                "quantity": r.get("QUANTITY")
                            })
                    
                    data["deals"].append(deal_obj)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Erro na execução: {e}"))
            import traceback
            traceback.print_exc()

        self.stdout.write(json.dumps(data, indent=4, cls=DjangoJSONEncoder))
