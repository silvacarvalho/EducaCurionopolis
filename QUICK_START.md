# 🚀 Guia Rápido - EDUCA+ Curionópolis

## Passo 1: Configurar Banco de Dados

```bash
# Crie o banco de dados PostgreSQL
sudo -u postgres psql
CREATE DATABASE educacurionopolis;
\q
```

## Passo 2: Configurar Backend

```bash
cd backend

# Criar ambiente virtual
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar .env
cp .env.example .env
nano .env  # Edite DATABASE_URL e SECRET_KEY
```

## Passo 3: Criar Primeiro Usuário Admin

Você tem **3 opções** para criar o primeiro administrador:

### 🎯 Opção 1: Script Python Interativo (Recomendado)

```bash
# Execute o script (certifique-se de estar no diretório backend)
python create_admin.py
```

O script irá perguntar:
- CPF
- Nome completo
- Email
- Telefone (opcional)
- Senha (com confirmação)

**Vantagens:**
- ✅ Interativo e fácil
- ✅ Validações completas
- ✅ Confirmação de senha
- ✅ Mensagens claras

---

### 🌐 Opção 2: Endpoint API de Setup

**a) Verificar se setup é necessário:**

```bash
curl http://localhost:8000/api/v1/setup/status
```

Resposta:
```json
{
  "setup_needed": true,
  "admin_exists": false,
  "total_users": 0,
  "message": "Necessário criar primeiro usuário administrador"
}
```

**b) Criar primeiro admin via API:**

```bash
curl -X POST "http://localhost:8000/api/v1/setup/first-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "000.000.000-00",
    "nome_completo": "Administrador Sistema",
    "email": "admin@curionopolis.pa.gov.br",
    "telefone": "(94) 99999-9999",
    "senha": "Admin@2024",
    "perfil": "gestao_municipal"
  }'
```

**Ou use Postman/Insomnia/Thunder Client:**
- Method: `POST`
- URL: `http://localhost:8000/api/v1/setup/first-admin`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "cpf": "000.000.000-00",
  "nome_completo": "Administrador Sistema",
  "email": "admin@curionopolis.pa.gov.br",
  "telefone": "(94) 99999-9999",
  "senha": "Admin@2024",
  "perfil": "gestao_municipal"
}
```

**Vantagens:**
- ✅ Pode ser usado remotamente
- ✅ Útil para automação/scripts
- ✅ Disponível na documentação Swagger

**⚠️ Importante:** Este endpoint **só funciona uma vez**, quando não há nenhum usuário admin no sistema!

---

### 💻 Opção 3: Diretamente no Banco de Dados

**a) Gerar hash da senha:**

```python
# Execute no Python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("sua_senha_aqui"))
```

**b) Inserir no banco:**

```sql
INSERT INTO usuarios (cpf, nome_completo, email, telefone, senha_hash, perfil, ativo, created_at)
VALUES (
    '000.000.000-00',
    'Administrador Sistema',
    'admin@curionopolis.pa.gov.br',
    '(94) 99999-9999',
    '$2b$12$...',  -- Cole o hash gerado
    'gestao_municipal',
    true,
    NOW()
);
```

---

## Passo 4: Iniciar Backend

```bash
# Certifique-se de estar no diretório backend com venv ativado
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Acesse:
- **API**: http://localhost:8000
- **Documentação**: http://localhost:8000/docs
- **Setup Status**: http://localhost:8000/api/v1/setup/status

## Passo 5: Iniciar Frontend

Em outro terminal:

```bash
cd frontend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env

# Iniciar
npm run dev
```

Acesse: http://localhost:3000

## Passo 6: Fazer Login

1. Acesse http://localhost:3000/login
2. Use o email e senha que você criou no Passo 3
3. Você será redirecionado para o Dashboard

## 📋 Credenciais de Exemplo

Se você usou a Opção 2 (API) com o exemplo acima:

- **Email:** admin@curionopolis.pa.gov.br
- **Senha:** Admin@2024

⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

## 🔍 Verificar se o Admin Foi Criado

### Via API (Setup Status):
```bash
curl http://localhost:8000/api/v1/setup/status
```

### Via Banco de Dados:
```bash
psql -U postgres educacurionopolis
SELECT id, nome_completo, email, perfil FROM usuarios WHERE perfil = 'gestao_municipal';
```

### Via API (após login):
```bash
# 1. Fazer login
curl -X POST "http://localhost:8000/api/v1/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@curionopolis.pa.gov.br",
    "senha": "Admin@2024"
  }'

# Copie o access_token da resposta

# 2. Ver dados do usuário
curl "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🎯 Próximos Passos

Após criar o admin e fazer login, você pode:

1. **Cadastrar Escolas**
   - Menu: Escolas → Criar nova escola
   - Endpoint: `POST /api/v1/escolas`

2. **Cadastrar Diretores**
   - Primeiro criar usuário com perfil "diretor_coordenador"
   - Depois vincular à escola

3. **Cadastrar Professores**
   - Menu: Professores → Criar novo professor
   - Endpoint: `POST /api/v1/professores`

4. **Criar Turmas e Alunos**
   - Menu: Turmas → Criar turma
   - Menu: Alunos → Cadastrar aluno

5. **Explorar Relatórios**
   - Menu: Relatórios
   - Visualize os gráficos drill-down interativos

## 🐛 Resolução de Problemas

### Erro: "Já existe um usuário administrador"

Se você receber este erro no endpoint de setup:

```json
{
  "detail": "Um usuário administrador já existe no sistema..."
}
```

Isso significa que já existe um admin. Para criar novos admins:

1. Faça login com o admin existente
2. Use o endpoint normal: `POST /api/v1/usuarios`

### Banco de dados não conecta

Verifique:
- PostgreSQL está rodando: `sudo service postgresql status`
- Credenciais no `.env` estão corretas
- Banco existe: `psql -U postgres -l | grep educacurionopolis`

### Frontend não conecta ao backend

Verifique:
- Backend está rodando na porta 8000
- `VITE_API_URL` no `.env` está correto
- CORS configurado no `main.py` permite o frontend

## 📚 Documentação Completa

- **README.md**: Visão geral do sistema
- **INSTALL.md**: Instalação detalhada para produção
- **API Docs**: http://localhost:8000/docs

## 💬 Suporte

Para dúvidas ou problemas:
- Email: educacao@curionopolis.pa.gov.br
- Documentação API: http://localhost:8000/docs
