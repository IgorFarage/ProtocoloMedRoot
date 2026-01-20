
import json
import logging
from django.core.management.base import BaseCommand
from apps.accounts.models import User, UserQuestionnaire
from apps.financial.models import Transaction
from apps.accounts.services import BitrixService
from apps.accounts.config import BitrixConfig

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Repara Deals no Bitrix regenerando produtos a partir do Questionário Local'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email do usuário para reparo')
        parser.add_argument('--deal_id', type=str, help='ID do Deal no Bitrix para reparo')
        parser.add_argument('--pending', action='store_true', help='Repara TODAS as transações pendentes de sync')
        parser.add_argument('--dry-run', action='store_true', help='Simula sem enviar ao Bitrix')

    def handle(self, *args, **options):
        email_arg = options.get('email')
        deal_id_arg = options.get('deal_id')
        pending_mode = options.get('pending')
        dry_run = options.get('dry_run')

        if pending_mode:
            self.stdout.write("🚀 Iniciando Auto-Repair em Massa (--pending)...")
            # Busca todas as transações aprovadas que não estão "synced"
            transactions = Transaction.objects.filter(
                status=Transaction.Status.APPROVED
            ).exclude(bitrix_sync_status='synced')
            
            count = transactions.count()
            self.stdout.write(f"📊 Encontradas {count} transações pendentes.")
            
            if count == 0:
                self.stdout.write(self.style.SUCCESS("✅ Nenhuma transação pendente."))
                return

            for i, t in enumerate(transactions):
                self.stdout.write(f"\n[{i+1}/{count}] Processando {t.user.email}...")
                self.repair_user(t.user, dry_run=dry_run)
            
            self.stdout.write(self.style.SUCCESS(f"\n🏁 Auto-Repair finalizado."))
            return

        if not email_arg and not deal_id_arg:
            self.stdout.write(self.style.ERROR("❌ Forneça --email, --deal_id ou --pending"))
            return

        # Modo Individual
        user = None
        if email_arg:
            try: user = User.objects.get(email=email_arg)
            except User.DoesNotExist: pass
        elif deal_id_arg:
            t = Transaction.objects.filter(bitrix_deal_id=deal_id_arg).first()
            if t: user = t.user
        
        if not user:
             self.stdout.write(self.style.ERROR("❌ Usuário não encontrado."))
             return

        self.repair_user(user, dry_run=dry_run)


    def repair_user(self, user, dry_run=False):
        try:
            self.stdout.write(f"🔧 Reparando Usuário: {user.email} (Bitrix ID: {user.id_bitrix})")

            # 1. Recuperar Respostas (Fonte da Verdade)
            questionnaire = UserQuestionnaire.objects.filter(user=user).order_by('-created_at').first()
            if not questionnaire:
                self.stdout.write(self.style.ERROR("   ❌ Questionário não encontrado. Pulei."))
                return
            
            answers = questionnaire.answers

            # 2. Regenerar Protocolo
            protocol = BitrixService.generate_protocol(answers)
            if not protocol or 'products' not in protocol:
                self.stdout.write(self.style.ERROR("   ❌ Falha ao gerar protocolo."))
                return

            products_generated = protocol['products']
            
            # Adicionar Plano (Se o user tiver transaction aprovada com plano)
            last_trans = Transaction.objects.filter(user=user, status=Transaction.Status.APPROVED).order_by('-created_at').first()
            
            plan_slug = user.current_plan
            if last_trans: 
                 plan_slug = last_trans.plan_type
            
            # Buscar info do plano se não for 'none'
            if plan_slug and plan_slug != 'none':
                plan_details = BitrixService.get_plan_details(plan_slug)
                if plan_details:
                    products_generated.append(plan_details)

            # Recalcular Total
            final_total = sum(float(p['price']) for p in products_generated)
            
            self.stdout.write(f"   💰 Total Calculado: R$ {final_total}")

            if dry_run:
                self.stdout.write(self.style.WARNING("   🚧 [DRY RUN] Simulação OK."))
                return

            # 3. Executar Update no Bitrix
            deal_id_updated = BitrixService.prepare_deal_payment(
                user=user,
                products_list=products_generated,
                plan_title=f"ProtocoloMed - {plan_slug}",
                total_amount=final_total,
                answers=answers,
                payment_data={"status": "approved"} if last_trans else None 
            )

            if deal_id_updated:
                self.stdout.write(self.style.SUCCESS(f"   ✅ Deal {deal_id_updated} atualizado."))
                
                # Atualizar transação local se necessário
                if last_trans and last_trans.bitrix_deal_id != str(deal_id_updated):
                    last_trans.bitrix_deal_id = str(deal_id_updated)
                    last_trans.bitrix_sync_status = 'synced' # Importante para não pegar no prox loop
                    last_trans.save()
                    self.stdout.write("   🔗 Sync Local Atualizado.")
            else:
                self.stdout.write(self.style.ERROR("   ❌ Falha no BitrixService."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ Erro Crítico: {e}"))
            import traceback
            traceback.print_exc()
