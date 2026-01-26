
from apps.accounts.services import BitrixService, BitrixConfig
from apps.accounts.models import User
import logging

# Config logger
logger = logging.getLogger('apps.accounts.services')
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
logger.addHandler(handler)

email = 'suaagendaprotocolo@gmail.com'
user = User.objects.get(email=email)
print(f'User: {user.email}, BitrixID: {user.id_bitrix}')

# Simulate sync
products = [{'name': 'Debug Product', 'price': 100.0, 'quantity': 1}]
payment_data = {'id': '123456', 'status': 'approved', 'date_created': '2023-10-27T10:00:00'}

print('--- Calling prepare_deal_payment ---')
deal_id = BitrixService.prepare_deal_payment(
    user=user, 
    products_list=products, 
    plan_title='Debug Plan', 
    total_amount=100.0, 
    payment_data=payment_data
)
print(f'--- Result Deal ID: {deal_id} ---')

