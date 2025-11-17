# CRUD de Diretores e Escolas - GESTÃO MUNICIPAL

## 📋 Visão Geral

Este documento descreve as funcionalidades de CRUD (Create, Read, Update, Delete) implementadas para o gerenciamento de **Diretores** e **Escolas** no sistema EDUCA+ Curionópolis.

Todos os endpoints estão restritos ao perfil **GESTÃO_MUNICIPAL**, garantindo que apenas usuários com este perfil possam gerenciar diretores e escolas.

---

## 🏫 CRUD de Escolas

### Base URL
```
/api/v1/escolas
```

### Endpoints Disponíveis

#### 1. Criar Escola
**POST** `/api/v1/escolas/`

Cria uma nova escola no sistema.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Body:**
```json
{
  "nome": "Escola Municipal João Silva",
  "endereco": "Rua das Flores, 123",
  "telefone": "(94) 98765-4321",
  "email": "contato@escolajoaosilva.edu.br",
  "codigo_inep": "15012345",
  "diretor_id": 5
}
```

**Validações:**
- Nome da escola deve ser único
- Código INEP deve ser único (se fornecido)
- Diretor deve existir e ter perfil `DIRETOR_COORDENADOR`
- Diretor não pode estar gerenciando outra escola

**Resposta (201 Created):**
```json
{
  "id": 1,
  "nome": "Escola Municipal João Silva",
  "endereco": "Rua das Flores, 123",
  "telefone": "(94) 98765-4321",
  "email": "contato@escolajoaosilva.edu.br",
  "codigo_inep": "15012345",
  "diretor_id": 5,
  "ativo": true,
  "created_at": "2024-01-15T10:30:00"
}
```

---

#### 2. Listar Escolas
**GET** `/api/v1/escolas/`

Lista todas as escolas do sistema.

**Requer:** Token JWT (qualquer perfil)

**Query Parameters:**
- `skip` (int, default=0): Número de registros para pular (paginação)
- `limit` (int, default=100): Limite de registros retornados
- `ativo` (bool, opcional): Filtrar por status ativo/inativo

**Comportamento por perfil:**
- **GESTAO_MUNICIPAL**: Vê todas as escolas
- **DIRETOR_COORDENADOR**: Vê apenas sua escola

**Resposta (200 OK):**
```json
[
  {
    "id": 1,
    "nome": "Escola Municipal João Silva",
    "endereco": "Rua das Flores, 123",
    "telefone": "(94) 98765-4321",
    "email": "contato@escolajoaosilva.edu.br",
    "codigo_inep": "15012345",
    "diretor_id": 5,
    "ativo": true,
    "created_at": "2024-01-15T10:30:00"
  }
]
```

---

#### 3. Obter Escola por ID
**GET** `/api/v1/escolas/{escola_id}`

Retorna os detalhes de uma escola específica.

**Requer:** Token JWT (qualquer perfil)

**Resposta (200 OK):**
```json
{
  "id": 1,
  "nome": "Escola Municipal João Silva",
  "endereco": "Rua das Flores, 123",
  "telefone": "(94) 98765-4321",
  "email": "contato@escolajoaosilva.edu.br",
  "codigo_inep": "15012345",
  "diretor_id": 5,
  "ativo": true,
  "created_at": "2024-01-15T10:30:00"
}
```

**Restrições:**
- DIRETOR_COORDENADOR só pode visualizar sua própria escola

---

#### 4. Atualizar Escola
**PUT** `/api/v1/escolas/{escola_id}`

Atualiza os dados de uma escola.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Body (todos os campos são opcionais):**
```json
{
  "nome": "Escola Municipal João Silva - Unidade 2",
  "endereco": "Rua das Flores, 456",
  "telefone": "(94) 98765-9999",
  "email": "novoemail@escolajoaosilva.edu.br",
  "diretor_id": 7,
  "ativo": true
}
```

**Resposta (200 OK):**
```json
{
  "id": 1,
  "nome": "Escola Municipal João Silva - Unidade 2",
  "endereco": "Rua das Flores, 456",
  "telefone": "(94) 98765-9999",
  "email": "novoemail@escolajoaosilva.edu.br",
  "codigo_inep": "15012345",
  "diretor_id": 7,
  "ativo": true,
  "created_at": "2024-01-15T10:30:00"
}
```

---

#### 5. Deletar Escola (Soft Delete)
**DELETE** `/api/v1/escolas/{escola_id}`

Desativa uma escola (não remove do banco de dados, apenas marca como inativa).

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Resposta (204 No Content)**

---

#### 6. Importar Escolas via CSV
**POST** `/api/v1/escolas/import-csv`

Importa múltiplas escolas de uma vez através de arquivo CSV.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Formato do CSV:**
```csv
nome,endereco,telefone,email,codigo_inep,diretor_cpf
Escola A,Rua A 123,(94) 98888-1111,escolaa@edu.br,15011111,123.456.789-00
Escola B,Rua B 456,(94) 98888-2222,escolab@edu.br,15022222,987.654.321-00
```

**Resposta (200 OK):**
```json
{
  "message": "Importação concluída. 2 linhas processadas",
  "results": [
    {
      "row": 1,
      "nome": "Escola A",
      "success": true,
      "escola_id": 10
    },
    {
      "row": 2,
      "nome": "Escola B",
      "success": true,
      "escola_id": 11
    }
  ]
}
```

---

## 👤 CRUD de Diretores

### Base URL
```
/api/v1/diretores
```

### Endpoints Disponíveis

#### 1. Criar Diretor
**POST** `/api/v1/diretores/`

Cria um novo diretor (usuário com perfil DIRETOR_COORDENADOR).

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Body:**
```json
{
  "cpf": "123.456.789-00",
  "nome_completo": "Maria Santos Silva",
  "email": "maria.santos@curionopolis.pa.gov.br",
  "telefone": "(94) 99876-5432",
  "perfil": "diretor_coordenador",
  "senha": "senhaSegura123"
}
```

**Validações:**
- CPF deve ser único
- Email deve ser único
- Perfil deve ser obrigatoriamente `diretor_coordenador`
- Senha deve ter entre 6 e 72 caracteres

**Resposta (201 Created):**
```json
{
  "id": 5,
  "cpf": "123.456.789-00",
  "nome_completo": "Maria Santos Silva",
  "email": "maria.santos@curionopolis.pa.gov.br",
  "telefone": "(94) 99876-5432",
  "perfil": "diretor_coordenador",
  "ativo": true,
  "created_at": "2024-01-15T11:00:00"
}
```

---

#### 2. Listar Diretores
**GET** `/api/v1/diretores/`

Lista todos os diretores do sistema.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Query Parameters:**
- `skip` (int, default=0): Número de registros para pular
- `limit` (int, default=100): Limite de registros
- `ativo` (bool, opcional): Filtrar por status ativo/inativo
- `disponivel` (bool, opcional):
  - `true` = apenas diretores sem escola atribuída
  - `false` = apenas diretores com escola atribuída

**Exemplos de uso:**
```
GET /api/v1/diretores/?disponivel=true
# Retorna apenas diretores disponíveis para atribuir a escolas

GET /api/v1/diretores/?ativo=true&disponivel=false
# Retorna diretores ativos que já gerenciam escolas
```

**Resposta (200 OK):**
```json
[
  {
    "id": 5,
    "cpf": "123.456.789-00",
    "nome_completo": "Maria Santos Silva",
    "email": "maria.santos@curionopolis.pa.gov.br",
    "telefone": "(94) 99876-5432",
    "perfil": "diretor_coordenador",
    "ativo": true,
    "created_at": "2024-01-15T11:00:00"
  },
  {
    "id": 7,
    "cpf": "987.654.321-00",
    "nome_completo": "João Pedro Oliveira",
    "email": "joao.oliveira@curionopolis.pa.gov.br",
    "telefone": "(94) 99123-4567",
    "perfil": "diretor_coordenador",
    "ativo": true,
    "created_at": "2024-01-16T09:00:00"
  }
]
```

---

#### 3. Obter Diretor por ID
**GET** `/api/v1/diretores/{diretor_id}`

Retorna os detalhes de um diretor específico.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Resposta (200 OK):**
```json
{
  "id": 5,
  "cpf": "123.456.789-00",
  "nome_completo": "Maria Santos Silva",
  "email": "maria.santos@curionopolis.pa.gov.br",
  "telefone": "(94) 99876-5432",
  "perfil": "diretor_coordenador",
  "ativo": true,
  "created_at": "2024-01-15T11:00:00"
}
```

---

#### 4. Atualizar Diretor
**PUT** `/api/v1/diretores/{diretor_id}`

Atualiza os dados de um diretor.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Body (todos os campos são opcionais):**
```json
{
  "nome_completo": "Maria Santos Silva Ferreira",
  "email": "maria.ferreira@curionopolis.pa.gov.br",
  "telefone": "(94) 99876-9999",
  "ativo": true
}
```

**Resposta (200 OK):**
```json
{
  "id": 5,
  "cpf": "123.456.789-00",
  "nome_completo": "Maria Santos Silva Ferreira",
  "email": "maria.ferreira@curionopolis.pa.gov.br",
  "telefone": "(94) 99876-9999",
  "perfil": "diretor_coordenador",
  "ativo": true,
  "created_at": "2024-01-15T11:00:00"
}
```

---

#### 5. Deletar Diretor (Soft Delete)
**DELETE** `/api/v1/diretores/{diretor_id}`

Desativa um diretor (marca como inativo).

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**IMPORTANTE:** Não é possível desativar um diretor que está gerenciando uma escola. É necessário primeiro remover ou reatribuir a escola.

**Resposta (204 No Content)**

**Erro se diretor gerencia escola (400 Bad Request):**
```json
{
  "detail": "Este diretor gerencia a escola 'Escola Municipal João Silva'. Remova ou reatribua a escola antes de desativar o diretor."
}
```

---

#### 6. Obter Escola do Diretor
**GET** `/api/v1/diretores/{diretor_id}/escola`

Retorna a escola gerenciada por um diretor específico.

**Requer:** Token JWT com perfil `GESTAO_MUNICIPAL`

**Resposta (200 OK) - Diretor com escola:**
```json
{
  "diretor_id": 5,
  "escola": {
    "id": 1,
    "nome": "Escola Municipal João Silva",
    "endereco": "Rua das Flores, 123",
    "codigo_inep": "15012345"
  }
}
```

**Resposta (200 OK) - Diretor sem escola:**
```json
{
  "diretor_id": 7,
  "escola": null,
  "message": "Este diretor não está atribuído a nenhuma escola"
}
```

---

## 🔐 Autenticação

Todos os endpoints requerem autenticação via **Bearer Token** (JWT).

### Cabeçalho de Requisição
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Como obter o token

**POST** `/api/v1/auth/login-json`

**Body:**
```json
{
  "email": "admin@curionopolis.pa.gov.br",
  "senha": "suaSenha123"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## 📊 Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado com sucesso |
| 204 | No Content - Operação bem-sucedida sem conteúdo de retorno |
| 400 | Bad Request - Dados inválidos ou erro de validação |
| 401 | Unauthorized - Token não fornecido ou inválido |
| 403 | Forbidden - Usuário não tem permissão para acessar o recurso |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro interno do servidor |

---

## 💡 Exemplos de Uso com cURL

### Criar um Diretor
```bash
curl -X POST "http://localhost:8000/api/v1/diretores/" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "123.456.789-00",
    "nome_completo": "Maria Santos Silva",
    "email": "maria.santos@curionopolis.pa.gov.br",
    "telefone": "(94) 99876-5432",
    "perfil": "diretor_coordenador",
    "senha": "senhaSegura123"
  }'
```

### Criar uma Escola
```bash
curl -X POST "http://localhost:8000/api/v1/escolas/" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Escola Municipal João Silva",
    "endereco": "Rua das Flores, 123",
    "telefone": "(94) 98765-4321",
    "email": "contato@escolajoaosilva.edu.br",
    "codigo_inep": "15012345",
    "diretor_id": 5
  }'
```

### Listar Diretores Disponíveis (sem escola)
```bash
curl -X GET "http://localhost:8000/api/v1/diretores/?disponivel=true" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### Listar Todas as Escolas
```bash
curl -X GET "http://localhost:8000/api/v1/escolas/" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## 🎯 Fluxo de Trabalho Recomendado

### Para criar uma nova escola com diretor:

1. **Criar o diretor primeiro:**
   ```
   POST /api/v1/diretores/
   ```
   Guarde o `id` retornado (ex: 5)

2. **Criar a escola e atribuir o diretor:**
   ```
   POST /api/v1/escolas/
   ```
   Usar o `diretor_id: 5` no body

3. **Verificar a atribuição:**
   ```
   GET /api/v1/diretores/5/escola
   ```

### Para trocar o diretor de uma escola:

1. **Atualizar a escola com novo diretor:**
   ```
   PUT /api/v1/escolas/{escola_id}
   ```
   Passar o novo `diretor_id` no body

---

## 📝 Notas Importantes

1. **Soft Delete:** As operações de DELETE não removem registros do banco de dados, apenas marcam como `ativo: false`

2. **Unicidade:**
   - CPF de usuário deve ser único
   - Email de usuário deve ser único
   - Nome de escola deve ser único
   - Código INEP deve ser único

3. **Relacionamento Escola-Diretor:**
   - Um diretor pode gerenciar apenas uma escola por vez
   - Uma escola deve ter um diretor atribuído
   - Ao desativar um diretor, é necessário reatribuir ou remover a escola primeiro

4. **Perfil GESTÃO_MUNICIPAL:**
   - Apenas usuários com este perfil podem criar, atualizar e deletar diretores e escolas
   - Outros perfis têm acesso limitado (visualização apenas da sua própria escola)

---

## 📚 Documentação Interativa

Para explorar todos os endpoints de forma interativa, acesse:

**Swagger UI:** `http://localhost:8000/docs`

**ReDoc:** `http://localhost:8000/redoc`

---

## 🐛 Tratamento de Erros

Todas as respostas de erro seguem o formato:

```json
{
  "detail": "Descrição do erro em português"
}
```

Exemplos:
- `"CPF já cadastrado"`
- `"Escola não encontrada"`
- `"Você não tem acesso a esta escola"`
- `"Este diretor já gerencia outra escola"`

---

## ✅ Checklist de Implementação

- [x] CRUD completo de Escolas
- [x] CRUD completo de Diretores
- [x] Restrição de acesso por perfil (GESTÃO_MUNICIPAL)
- [x] Validações de unicidade (CPF, email, nome, código INEP)
- [x] Validação de relacionamento escola-diretor
- [x] Soft delete (desativação)
- [x] Filtros por status ativo/inativo
- [x] Filtro de diretores disponíveis
- [x] Importação de escolas via CSV
- [x] Endpoint para consultar escola do diretor
- [x] Documentação completa

---

**Desenvolvido para:** Prefeitura de Curionópolis - Secretaria de Educação
**Sistema:** EDUCA+ Curionópolis v1.0.0
**Data:** Janeiro 2024
