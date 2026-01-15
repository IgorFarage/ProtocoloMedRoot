
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.financial.models import Transaction
from apps.accounts.services import BitrixService
from apps.accounts.models import User
import logging
import json

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Sincroniza transações pendentes ou falhas com o Bitrix'

    def handle(self, *args, **options):
        if not BitrixService:
            self.stdout.write(self.style.ERROR("BitrixService não disponível."))
            return

        # Busca transações pendentes ou falhas que não estouraram o limite de tentativas
        transactions = Transaction.objects.filter(
            bitrix_sync_status__in=['pending', 'failed'],
            bitrix_sync_attempts__lt=10,
            status=Transaction.Status.APPROVED # Apenas transações aprovadas
        ).order_by('created_at')

        count = transactions.count()
        self.stdout.write(f"Encontradas {count} transações para processar.")

        for transaction in transactions:
            self.stdout.write(f"Processando Transaction {transaction.id} ({transaction.user.email})...")
            
            transaction.bitrix_sync_attempts += 1
            transaction.last_sync_attempt = timezone.now()
            transaction.save() # Commit attempt count immediately

            try:
                # 1. Recuperar contexto do metadata
                meta = transaction.mp_metadata if isinstance(transaction.mp_metadata, dict) else {}
                original_products = meta.get("original_products", [])
                questionnaire_data = meta.get("questionnaire_snapshot", {})
                payment_response = meta.get("payment_response", {})

                # 2. Reconstruir DTOs
                
                # Se não tiver produtos no metadata (legado ou bug), tenta inferir pelo plano
                if not original_products:
                    # Fallback básico: apenas o plano
                    original_products = [] 
                    # Se tiver bitrix logic para pegar detalhes do plano, o views.py faz isso.
                    # Mas aqui precisamos ser robustos.
                    # O prepare_deal_payment espera lista de dicts.
                
                # Payment Info para o Bitrix
                payment_info_bitrix = {
                    "id": payment_response.get('id') or transaction.mercado_pago_id,
                    "date_created": payment_response.get('date_created') or str(transaction.created_at),
                    "status": payment_response.get('status') or 'approved'
                }

                # 3. Lógica de Sincronização (Duplicada/Adaptada do Views mas isolada)
                # Precisamos garantir que o usuário tenha ID Bitrix
                user = transaction.user
                
                # Se perdeu o ID Bitrix, tenta recuperar ou criar
                if not user.id_bitrix:
                    # Endereço? Se não tiver no meta, tenta do user profile se existisse, mas aqui é difícil.
                    # Tenta create_lead com o que tem
                    lead_id = BitrixService.create_lead(user, questionnaire_data, None)
                    if lead_id:
                        user.id_bitrix = str(lead_id)
                        user.save()
                
                # Prepara produtos finais (sem duplicar plano se já estiver na lista)
                # A lógica do views.py filtrava IDs de planos. Aqui vamos confiar no que foi salvo ou refazer o filtro.
                from apps.accounts.config import BitrixConfig
                all_plan_ids = BitrixConfig.PLAN_IDS.values()
                
                filtered_products = [
                    p for p in original_products 
                    if int(p.get('id', 0)) not in all_plan_ids
                ]
                final_products = list(filtered_products)
                
                # Adiciona o plano atual da transação
                if hasattr(BitrixService, 'get_plan_details'):
                   plan_item = BitrixService.get_plan_details(transaction.plan_type)
                   if plan_item: final_products.append(plan_item)

                # Chamada ao Serviço
                deal_id = BitrixService.prepare_deal_payment(
                    user,
                    final_products,
                    f"ProtocoloMed - {transaction.plan_type}",
                    float(transaction.amount),
                    questionnaire_data,
                    payment_data=payment_info_bitrix
                )

                if deal_id:
                    transaction.bitrix_deal_id = str(deal_id)
                    transaction.bitrix_sync_status = 'synced'
                    self.stdout.write(self.style.SUCCESS(f"✅ Sucesso: Deal {deal_id}"))
                else:
                    transaction.bitrix_sync_status = 'failed'
                    self.stdout.write(self.style.WARNING(f"⚠️ Falha: prepare_deal_payment retornou None"))

            except Exception as e:
                transaction.bitrix_sync_status = 'failed'
                self.stdout.write(self.style.ERROR(f"❌ Erro Crítico: {e}"))
            
            transaction.save()

