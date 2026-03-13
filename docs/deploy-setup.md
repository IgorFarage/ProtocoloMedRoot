# Setup de Deploy e Pre-Production Checklist

Este documento define os passos cruciais para configurar o projeto em ambientes locais e prepará-lo para Produção / Homologação de forma segura.

## Checklist Imprescindível de Preparação de Produção (SecOps) 🔒
Revisar esta lista antes de dar Merge do branch `main` na branch de Deploy/Produção.

1. **`DEBUG = False`:** Sob nenhuma hipótese subir o projeto online com flag debug. Usar `DEBUG=True` apenas na máquina física do dev. (Impede vazamento de env vars e config de banco de dados nativa nas crash pages do Django).
2. **`ALLOWED_HOSTS`:** Deve conter estritamente o Domínio do App Front e IP do Load Balancer em Produção. Nada de `ALLOWED_HOSTS = ['*']` na AWS/Digital Ocean.
3. **Senhas Seguras:** `SECRET_KEY` forte guardada apenas no `.env` do servidor (KMS na aws ou Variables do Heroku/Render/Vercel). Nunca commitada no Git.
4. **CORS Obrigatório:** No `settings.py`, assegurar que apenas a URI/URL que roda o frontend React seja permitida (ex: `CORS_ALLOWED_ORIGINS = ['https://app.protocolomedroot.com.br']`).
5. **JAMAIS usar `runserver` em Produção:** O servidor embutido do Django é monothread, lento e inseguro. Em produção, exija ASGI/WSGI providos por Gunicorn ou Uvicorn atrás de um proxy Nginx.

---

## Variáveis de Ambiente Necessárias (`.env`)
Um mapeamento exaustivo de quais segredos o servidor precisa carregar na injeção de dependência na inicialização:

### Globais & Segurança
```env
DEBUG=False
SECRET_KEY=sua_chave_criptografica_aqui
ALLOWED_HOSTS=api.seudominio.com.br,backend_ip.exemplo
FRONTEND_URL=https://app.seudominio.com.br
CORS_ALLOWED_ORIGINS=https://app.seudominio.com.br
```

### Autenticação / JWT (Se variável no escopo de projeto)
```env
JWT_ACCESS_TOKEN_LIFETIME=30 # minutos
```

### Configurações de Banco de Dados (Prod via Docker ou Managed DB)
```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=medroot_db
DB_USER=seu_usuario_bd
DB_PASSWORD=sua_senha_bd
DB_HOST=127.0.0.1 ou rds.url.com
DB_PORT=5432
```

### Integração Asaas (Gateway)
```env
# Em sandbox de teste, Asaas entrega um token; em live é outro token da conta de Prod.
ASAAS_API_KEY=$aact_YOUR_ASAAS_TOKEN 
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3 # Ou URL real sem sandbox
```

### Integração Bitrix24 (CRM)
```env
# URL de entrada dos webhooks gerados de dentro do seu tenant no bitrix24.
BITRIX_WEBHOOK_URL=https://SEU_PORTAL.bitrix24.com.br/rest/1/TOKEN_WEBHOOK/ 
```

### Integração VideoSDK (Telemedicina)
```env
VIDEOSDK_API_KEY=sua_public_key_videosdk
VIDEOSDK_SECRET_KEY=sua_secret_key_videosdk
VIDEOSDK_API_ENDPOINT=https://api.videosdk.live/v2
```

### Disparo de Email (SMTP Transacional - Opcional)
```env
EMAIL_HOST=smtp.exemplo.com  # ou aws ses, mailgun, etc
EMAIL_PORT=587
EMAIL_HOST_USER=sua_apikey
EMAIL_HOST_PASSWORD=sua_senha_aqui
DEFAULT_FROM_EMAIL=contato@seudominio.com.br
```

---

## Setup de Ambiente Local de Desenvolvimento (Backend)
Passo a passo rápido para onboarding de novos Devs no back-end.

1.  **Clone o Repositório:** `git clone [url]` e entre na pasta raiz.
2.  **Crie seu `.env`:** Duplique o `.env.example` e preencha as chaves acima utilizando os acessos Sandbox/Teste das plataformas terceiras.
3.  **Ambiente Virtual (`venv`):**
    ```bash
    python -m venv .venv
    # Windows
    .\.venv\Scripts\activate 
    # Linux/Mac
    source .venv/bin/activate
    ```
4.  **Instalação de Dependências:**
    ```bash
    cd Backend
    pip install -r requirements.txt
    ```
5.  **Configuração de Banco Local Sujo:**
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    python manage.py createsuperuser
    ```
6.  **Rodando LocalHost API:**
    ```bash
    python manage.py runserver 8000
    ```

## 2. Padrão Arquitetural de Produção (VPS / EC2 Exemplo)
Se o deploy não for PaaS (Heroku/Render) nem Docker, mas sim Bare-Metal ou VPS (Ubuntu Server), esta é a topologia exigida para Alta Disponibilidade.

### O Servidor de Aplicação (WSGI Gunicorn)
Não se roda Django com `runserver` em Produção. Utilize o Gunicorn atrelado a um serviço do Sistema Operacional (`systemd`) para garantir *auto-restart* em caso de falha:

```bash
# /etc/systemd/system/gunicorn.service
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/ProtocoloMedRootASAAS/Backend
ExecStart=/home/ubuntu/ProtocoloMedRootASAAS/.venv/bin/gunicorn --workers 3 --bind unix:/run/gunicorn.sock meudominio.wsgi:application
```

### O Proxy Reverso e Servidor de Estáticos (Nginx)
O Django é péssimo servindo imagens (Media) e Javascripts (Statis). O Nginx fica virado para a Web na porta 443 (SSL/HTTPS), intercepta as chamadas, devolve arquivos estáticos em milissegundos, e *repassa* as requisições complexas de API (JSON) pelo Unix Socket para os *Workers* do Gunicorn.

```nginx
# /etc/nginx/sites-available/api.protocolomedroot.com.br
server {
    listen 443 ssl;
    server_name api.protocolomedroot.com.br;

    location = /favicon.ico { access_log off; log_not_found off; }
    
    # Entrega os estáticos do Django FileSystem super rápido
    location /static/ {
        root /home/ubuntu/ProtocoloMedRootASAAS/Backend;
    }

    # Passa o pipeline da Rota Protegida de API para o Python processar
    location / {
        include proxy_params;
        proxy_pass http://unix:/run/gunicorn.sock;
    }
}
```

### Deploy do Frontend (Vite Build)
O React Vite não tem servidor em produção, ele compila (Build) num *Static Bundle* de HTML/JS que é jogado direto num Bucket S3 (AWS) com CloudFront, ou no servidor Nginx:

```bash
# Na pasta Frontend
npm run build
# A pasta /dist resultante é o app inteiro pré-compilado, insira no seu host estático (Vercel, Nginx, S3).
```
