# Guia de Instalação - EDUCA+ Curionópolis

## Instalação Rápida (Desenvolvimento)

### 1. Instalar Dependências do Sistema

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install python3.10 python3.10-venv python3-pip postgresql postgresql-contrib nodejs npm
```

#### macOS
```bash
brew install python@3.10 postgresql node
```

#### Windows
- Instale Python 3.10+ de https://www.python.org/downloads/
- Instale PostgreSQL de https://www.postgresql.org/download/windows/
- Instale Node.js de https://nodejs.org/

### 2. Configurar Banco de Dados

```bash
# Inicie o PostgreSQL
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# Crie o banco de dados
sudo -u postgres psql
CREATE DATABASE educacurionopolis;
CREATE USER educauser WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE educacurionopolis TO educauser;
\q
```

### 3. Configurar Backend

```bash
cd EducaCurionopolis/backend

# Criar e ativar ambiente virtual
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Edite com suas configurações

# Executar migrações (criar tabelas)
# As tabelas são criadas automaticamente na inicialização
```

### 4. Criar Usuário Inicial (Gestão Municipal)

Após iniciar o backend pela primeira vez, você pode criar um usuário administrador via API ou script Python:

```python
# create_admin.py
from app.database import SessionLocal
from app.models import Usuario, PerfilUsuario
from app.auth import get_password_hash

db = SessionLocal()

admin = Usuario(
    cpf="000.000.000-00",
    nome_completo="Administrador Sistema",
    email="admin@curionopolis.pa.gov.br",
    perfil=PerfilUsuario.GESTAO_MUNICIPAL,
    senha_hash=get_password_hash("senha_inicial_123")
)

db.add(admin)
db.commit()
print("Usuário administrador criado com sucesso!")
db.close()
```

Execute:
```bash
python create_admin.py
```

### 5. Iniciar Backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Acesse a documentação da API em: http://localhost:8000/docs

### 6. Configurar e Iniciar Frontend

```bash
cd EducaCurionopolis/frontend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse o frontend em: http://localhost:3000

### 7. Primeiro Login

Use as credenciais do usuário administrador criado:
- Email: admin@curionopolis.pa.gov.br
- Senha: senha_inicial_123

**IMPORTANTE**: Altere a senha após o primeiro login!

## Instalação em Produção

### 1. Backend (Servidor Linux)

```bash
# Instalar dependências
sudo apt update
sudo apt install python3.10 python3.10-venv nginx supervisor postgresql

# Criar usuário do sistema
sudo useradd -m -s /bin/bash educaapp

# Clonar repositório
sudo -u educaapp git clone <repo> /home/educaapp/app
cd /home/educaapp/app/backend

# Configurar ambiente virtual
sudo -u educaapp python3 -m venv venv
sudo -u educaapp venv/bin/pip install -r requirements.txt

# Configurar variáveis de ambiente
sudo -u educaapp cp .env.example .env
sudo nano /home/educaapp/app/backend/.env
```

#### Configurar Supervisor

```bash
sudo nano /etc/supervisor/conf.d/educaapp.conf
```

```ini
[program:educaapp]
directory=/home/educaapp/app/backend
command=/home/educaapp/app/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
user=educaapp
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/educaapp.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start educaapp
```

#### Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/educaapp
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /home/educaapp/app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/educaapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Frontend (Build para Produção)

```bash
cd /home/educaapp/app/frontend
npm install
npm run build
```

Os arquivos estáticos serão gerados em `dist/` e servidos pelo Nginx.

### 3. SSL/HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

## Troubleshooting

### Backend não inicia
- Verifique se o PostgreSQL está rodando: `sudo service postgresql status`
- Verifique as credenciais no arquivo `.env`
- Verifique os logs: `tail -f /var/log/educaapp.log`

### Frontend não conecta à API
- Verifique a variável `VITE_API_URL` no `.env`
- Verifique CORS no backend (`main.py`)
- Abra o console do navegador para ver erros

### Erro de permissão no banco
```bash
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE educacurionopolis TO educauser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO educauser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO educauser;
```

### Porta já em uso
```bash
# Encontrar processo usando a porta
lsof -i :8000
# Matar processo
kill -9 <PID>
```

## Backup

### Backup do Banco de Dados

```bash
# Backup
pg_dump -U educauser educacurionopolis > backup_$(date +%Y%m%d).sql

# Restaurar
psql -U educauser educacurionopolis < backup_20240101.sql
```

### Backup Automático (Cron)

```bash
crontab -e
```

```cron
# Backup diário às 2h da manhã
0 2 * * * pg_dump -U educauser educacurionopolis > /backups/educa_$(date +\%Y\%m\%d).sql
```

## Manutenção

### Atualizar Sistema

```bash
cd /home/educaapp/app
git pull origin main

# Atualizar backend
cd backend
venv/bin/pip install -r requirements.txt
sudo supervisorctl restart educaapp

# Atualizar frontend
cd ../frontend
npm install
npm run build
```

### Logs

```bash
# Backend logs
tail -f /var/log/educaapp.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```
