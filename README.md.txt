# ProtocoloMedRoot

> **Plataforma de Telemedicina e Tratamentos Capilares Personalizados Integrada ao Bitrix24.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-blue)]()

---

## Sobre o Projeto

O **ProtocoloMedRoot** é uma solução robusta de saúde digital focada na triagem, diagnóstico e prescrição automatizada de tratamentos para queda capilar (alopecia). O sistema orquestra uma jornada completa do paciente, desde a anamnese até a aquisição do tratamento.

### Fluxo de Arquitetura e Negócio
1.  **Anamnese Digital:** O paciente responde a um questionário detalhado (Quiz) no Frontend.
2.  **Algoritmo de Decisão:** O Backend processa as respostas e gera um protocolo personalizado (ex: Minoxidil Oral vs Tópico, Finasterida) baseado em contraindicações e perfil biológico.
3.  **Sincronização CRM (Bitrix24):**
    * Um Lead é criado automaticamente no CRM.
    * As respostas são mapeadas para campos customizados (`UF_CRM_...`).
    * O Lead é convertido em Contato/Negócio para gestão do funil de vendas.
4.  **Área do Médico:** Médicos parceiros podem acessar prontuários, validar prescrições e realizar teleconsultas.
5.  **Checkout e Venda:** O sistema integra o catálogo de produtos do Bitrix para calcular preços e processar assinaturas.

---

## Tecnologias Utilizadas

### Backend
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Django](https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white)
![DjangoREST](https://img.shields.io/badge/DJANGO-REST-ff1709?style=for-the-badge&logo=django&logoColor=white&color=ff1709&labelColor=gray)
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

### Frontend
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TanStack Query](https://img.shields.io/badge/-TanStack%20Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white)
![Shadcn/UI](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)

---

## Pré-requisitos

Antes de começar, certifique-se de ter instalado em sua máquina:

* **Python 3.10+**
* **Node.js 18+** (Recomendado uso do NPM ou Bun)
* **PostgreSQL** (Banco de dados relacional)
* **Conta Bitrix24** (com permissões para criar Webhooks Inbound)

---

## Instalação e Configuração

### 1. Clonar o Repositório

```bash
git clone [https://github.com/seu-usuario/ProtocoloMedRoot.git](https://github.com/seu-usuario/ProtocoloMedRoot.git)
cd ProtocoloMedRoot

```

### 2. Configuração do Backend (Django)

Navegue até a pasta do servidor e configure o ambiente virtual:

```bash
cd Backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente (Windows)
venv\Scripts\activate
# Ativar ambiente (Linux/Mac)
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

```

Crie um arquivo `.env` na raiz da pasta `Backend` (use o modelo abaixo) e execute as migrações:

```bash
# Executar migrações do banco de dados
python manage.py migrate

# (Opcional) Criar superusuário para acessar o admin
python manage.py createsuperuser

```

### 3. Configuração do Frontend (React)

Em um novo terminal, navegue até a pasta do cliente:

```bash
cd Frontend

# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev

```

---

## Variáveis de Ambiente (.env)

O Backend requer as seguintes variáveis configuradas no arquivo `Backend/.env` para funcionar corretamente.

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `SECRET_KEY` | Chave criptográfica do Django. | `django-insecure-xxxxx...` |
| `DEBUG` | Define o modo de debug (True/False). **False em Produção.** | `True` |
| `ALLOWED_HOSTS` | Hosts permitidos separados por vírgula. | `localhost,127.0.0.1` |
| `DB_NAME` | Nome do banco de dados PostgreSQL. | `protocolomed_db` |
| `DB_USER` | Usuário do banco de dados. | `postgres` |
| `DB_PASSWORD` | Senha do banco de dados. | `admin` |
| `DB_HOST` | Host do banco (geralmente localhost). | `localhost` |
| `DB_PORT` | Porta do PostgreSQL. | `5432` |
| `BITRIX_WEBHOOK_URL` | URL do Webhook de entrada do Bitrix24. | `https://b24-xxxx.bitrix24.com.br/rest/1/xxxx/` |

> **Nota:** O `BITRIX_WEBHOOK_URL` é essencial para que o `BitrixService` consiga criar leads e buscar produtos.

---

## Arquitetura e Integração Bitrix

O núcleo da inteligência de negócio reside na classe `BitrixService` (`Backend/apps/accounts/services.py`).

### Principais Funcionalidades:

1. **Mapeamento de Respostas (`_map_answers_to_bitrix`):**
Traduz o JSON vindo do React para os IDs de campos personalizados do Bitrix (ex: `UF_CRM_1766075085`).
2. **Motor de Protocolo (`generate_protocol`):**
Implementa a lógica médica:
* Verifica gênero, alergias e condições de saúde.
* Bloqueia medicamentos (ex: Finasterida bloqueada para mulheres ou alérgicos).
* Seleciona produtos do catálogo do Bitrix via API (`crm.product.list`).


3. **Pipeline de Vendas (`create_lead` & `process_subscription`):**
* Cria um Lead.
* Monitora a conversão automática para Contato/Negócio.
* Atualiza valores de oportunidade e endereços de entrega.



---

## Avisos Importantes (Configuração Bitrix)

Este projeto possui **Hardcoded IDs** que são específicos da instância Bitrix24 utilizada durante o desenvolvimento. Para implantar em um novo ambiente Bitrix, você precisará refatorar ou ajustar os seguintes pontos no arquivo `Backend/apps/accounts/services.py`:

* **IDs de Campos Personalizados:** Os campos `UF_CRM_xxxx` não existirão em uma nova conta Bitrix. Eles precisam ser criados no CRM e os IDs atualizados no código.
* **IDs de Categoria de Produto:** O código busca produtos nas categorias `16, 18, 20, 22`. Verifique os IDs das seções no seu catálogo Bitrix.
* **Webhooks:** Certifique-se de que o Webhook criado tenha permissões de escopo para **CRM** e **Catálogo Comercial**.

---

## Scripts Úteis

```bash
# Rodar o servidor Django
python manage.py runserver

# Rodar o servidor Vite (Frontend)
npm run dev

# Resetar Banco de Dados (Cuidado: apaga tudo!)
# (Requer script customizado reset_db.py se disponível)
python reset_db.py

```

---

## Contribuindo

Contribuições são bem-vindas! Siga os passos:

1. Faça um Fork do projeto.
2. Crie uma Branch para sua Feature (`git checkout -b feature/NovaFeature`).
3. Faça o Commit (`git commit -m 'Add: Nova Feature'`).
4. Faça o Push (`git push origin feature/NovaFeature`).
5. Abra um Pull Request.

---

**Desenvolvido pela Equipe ProtocoloMed.**

```

```