# EDUCA+ CURIONÓPOLIS

Sistema Modular para Acompanhar, Gerenciar e Demonstrar Métricas do Desenvolvimento da Educação no Município de Curionópolis/PA.

## 📋 Visão Geral

O EDUCA+ Curionópolis é uma plataforma completa de gestão educacional que contempla 3 módulos principais:

- **Módulo de Avaliação**: Gestão de avaliações bimestrais com classificação de desempenho dos alunos
- **Módulo de Diagnóstico**: Acompanhamento diagnóstico para turmas do 1º ao 5º ano
- **Módulo SAEB**: Gerenciamento de simulados e resultados SAEB

## 🏗️ Arquitetura do Sistema

### Backend
- **Framework**: FastAPI (Python)
- **Banco de Dados**: PostgreSQL
- **ORM**: SQLAlchemy
- **Autenticação**: JWT (JSON Web Tokens)
- **Documentação API**: OpenAPI/Swagger (automática)

### Frontend
- **Framework**: React 18 com TypeScript
- **UI Library**: Material-UI (MUI)
- **Gráficos**: Recharts
- **State Management**: Context API
- **Build Tool**: Vite

## 👥 Perfis de Acesso

### 1. Gestão Municipal
- Cadastrar e gerenciar escolas e diretores
- Visualizar relatórios completos de todas as escolas
- Importar dados via CSV
- Resetar senhas de diretores (individual ou em lote)
- Enviar mensagens para diretores

### 2. Diretor/Coordenador
- Gerenciar professores, turmas, alunos e disciplinas de sua escola
- Vincular professores às disciplinas
- Visualizar relatórios da sua escola
- Resetar senhas de professores (individual ou em lote)
- Enviar mensagens para professores

### 3. Professor
- Realizar avaliações bimestrais dos alunos
- Aplicar diagnósticos (1º ao 5º ano)
- Registrar resultados de simulados SAEB
- Visualizar suas turmas e disciplinas

### 4. Comunidade
- Visualizar relatórios públicos agregados (sem identificação de escolas, alunos ou professores)

## 📦 Estrutura do Projeto

```
/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application
│   │   ├── database.py             # Database configuration
│   │   ├── models.py               # SQLAlchemy models
│   │   ├── schemas.py              # Pydantic schemas
│   │   ├── auth.py                 # Authentication/authorization
│   │   ├── dependencies.py         # Common dependencies
│   │   └── routers/                # API routes
│   │       ├── auth.py
│   │       ├── usuarios.py
│   │       ├── escolas.py
│   │       ├── professores.py
│   │       ├── turmas.py
│   │       ├── disciplinas.py
│   │       ├── alunos.py
│   │       ├── avaliacoes.py
│   │       ├── diagnosticos.py
│   │       ├── saeb.py
│   │       ├── mensagens.py
│   │       └── relatorios.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DrillDownChart.tsx  # Drill-down chart component
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── RelatoriosPage.tsx
│   │   ├── services/
│   │   │   └── api.ts              # API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## 🚀 Instalação e Configuração

### Pré-requisitos

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd EducaCurionopolis
```

### 2. Configuração do Backend

```bash
# Navegue para o diretório backend
cd backend

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Crie o banco de dados PostgreSQL
# Execute no PostgreSQL:
# CREATE DATABASE educacurionopolis;

# Execute o servidor
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

O backend estará disponível em: `http://localhost:8000`

Documentação da API: `http://localhost:8000/docs`

### 3. Configuração do Frontend

```bash
# Navegue para o diretório frontend
cd frontend

# Instale as dependências
npm install

# Execute o servidor de desenvolvimento
npm run dev
```

O frontend estará disponível em: `http://localhost:3000`

## 📊 Características Principais

### Avaliações Bimestrais
- Cadastro de avaliações para cada disciplina e bimestre
- Classificação do desempenho: Abaixo da Média, Na Média, Acima da Média
- Avaliação em lote para otimizar o trabalho dos professores
- Histórico completo de avaliações

### Diagnósticos (1º ao 5º Anos)
- 5 diagnósticos obrigatórios por ano:
  - 1 diagnóstico inicial (início do 1º bimestre)
  - 4 diagnósticos finais (final de cada bimestre)
- Definição de gênero textual e objetivos de avaliação
- Substituição de diagnósticos com aplicação obrigatória
- Classificação de evolução: Não, Sim, Em Partes

### Simulados SAEB
- Criação de provas simuladas
- Registro de notas de Português e Matemática
- Controle de presença/ausência
- Estatísticas de desempenho

### Relatórios com Drill-Down
- **Gráficos Interativos**: Clique para explorar dados em mais detalhes
- **Múltiplos Níveis**:
  - Visão geral do município
  - Detalhamento por escola
  - Detalhamento por turma
- **Visualizações**: Gráficos de barras e pizza
- **Exportação**: Dados podem ser exportados

### Sistema de Mensagens
- Comunicação interna entre:
  - Gestão Municipal → Diretores
  - Diretores → Professores
- Envio individual ou em broadcast
- Marcação de mensagens lidas

## 🔐 Autenticação e Segurança

- **JWT Authentication**: Tokens seguros com expiração configurável
- **Role-Based Access Control (RBAC)**: Controle de acesso baseado em perfis
- **Password Hashing**: Senhas criptografadas com bcrypt
- **CORS Configuration**: Proteção contra requisições não autorizadas
- **SQL Injection Protection**: Uso de ORM previne SQL injection

## 📡 API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/login-json` - Login (JSON)
- `GET /api/v1/auth/me` - Dados do usuário atual

### Escolas
- `GET /api/v1/escolas` - Listar escolas
- `POST /api/v1/escolas` - Criar escola
- `PUT /api/v1/escolas/{id}` - Atualizar escola
- `POST /api/v1/escolas/import-csv` - Importar escolas via CSV

### Avaliações
- `POST /api/v1/avaliacoes` - Criar avaliação
- `POST /api/v1/avaliacoes/bulk` - Criar avaliações em lote
- `GET /api/v1/avaliacoes` - Listar avaliações

### Relatórios
- `GET /api/v1/relatorios/avaliacoes/geral` - Relatório geral de avaliações
- `GET /api/v1/relatorios/avaliacoes/drill-down/escolas` - Drill-down por escolas
- `GET /api/v1/relatorios/avaliacoes/drill-down/turmas/{escola_id}` - Drill-down por turmas

**Veja a documentação completa da API em**: `http://localhost:8000/docs`

## 🎯 Casos de Uso

### Caso 1: Diretor Cadastra Professor
1. Diretor faz login no sistema
2. Acessa menu "Professores"
3. Clica em "Novo Professor"
4. Preenche dados do professor (nome, CPF, email, formação)
5. Sistema cria usuário com perfil "Professor"
6. Professor recebe credenciais de acesso

### Caso 2: Professor Registra Avaliação Bimestral
1. Professor faz login
2. Seleciona disciplina e turma
3. Seleciona bimestre
4. Para cada aluno, marca: Abaixo/Na/Acima da Média
5. Adiciona observações (opcional)
6. Salva avaliações

### Caso 3: Gestão Municipal Visualiza Relatórios
1. Gestão Municipal faz login
2. Acessa "Relatórios"
3. Seleciona ano letivo e bimestre
4. Visualiza gráfico geral de desempenho
5. Clica em uma barra do gráfico para ver detalhes por escola
6. Clica novamente para ver detalhes por turma

## 🧪 Testes

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm run test
```

## 📝 Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/educacurionopolis
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=480
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da Prefeitura Municipal de Curionópolis/PA.

## 📞 Suporte

Para suporte técnico ou dúvidas, entre em contato com:
- Email: educacao@curionopolis.pa.gov.br
- Telefone: (XX) XXXX-XXXX

## 🗺️ Roadmap

### Fase 1 (Atual)
- ✅ Autenticação e controle de acesso
- ✅ CRUD de escolas, professores, turmas e alunos
- ✅ Módulo de Avaliação
- ✅ Módulo de Diagnóstico
- ✅ Módulo SAEB
- ✅ Relatórios com drill-down

### Fase 2 (Futuro)
- ⬜ Dashboard com indicadores em tempo real
- ⬜ Notificações push
- ⬜ Exportação de relatórios em PDF
- ⬜ Aplicativo móvel
- ⬜ Integração com outros sistemas educacionais
- ⬜ Machine Learning para previsão de desempenho

## 📊 Modelo de Dados

### Principais Entidades

- **Usuario**: Armazena todos os usuários do sistema
- **Escola**: Dados das escolas municipais
- **Professor**: Professores vinculados às escolas
- **Turma**: Turmas/classes das escolas
- **Disciplina**: Disciplinas lecionadas
- **Aluno**: Alunos matriculados
- **AvaliacaoBimestral**: Avaliações bimestrais
- **Diagnostico**: Templates de diagnósticos
- **DiagnosticoResultado**: Resultados dos diagnósticos
- **ProvaSimuladoSAEB**: Provas SAEB
- **ResultadoSAEB**: Resultados das provas SAEB
- **Mensagem**: Mensagens internas

### Relacionamentos Principais

- Escola 1:N Professor
- Escola 1:N Turma
- Turma 1:N Aluno
- Turma 1:N Disciplina
- Professor N:M Disciplina (um professor pode lecionar várias disciplinas)
- Aluno 1:N AvaliacaoBimestral
- Aluno 1:N DiagnosticoResultado

---

**Desenvolvido para a Prefeitura Municipal de Curionópolis/PA**
