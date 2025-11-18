# Implementação das Views do Sistema EDUCA+ Curionópolis

## 📋 Status da Implementação

### ✅ Já Implementadas:
1. **Login** - Autenticação de usuários
2. **Dashboard** - Página inicial com cards de navegação
3. **Escolas e Diretores** - CRUD completo com abas
4. **Professores** - CRUD completo com validações
5. **Relatórios** - Visualização de métricas

### 🚧 A Implementar:

#### 1. **Turmas e Alunos** (`/turmas`)
- **Aba Turmas:**
  - Criar turma (nome, ano escolar, ano letivo, turno, escola)
  - Listar turmas com filtros por escola e ano
  - Editar turma
  - Desativar turma

- **Aba Alunos:**
  - Criar aluno (nome, CPF, matrícula, turma, responsável)
  - Listar alunos com filtro por turma
  - Editar aluno
  - Desativar aluno
  - Transferir aluno de turma

#### 2. **Avaliações** (`/avaliacoes`)
- Selecionar escola, turma, disciplina e bimestre
- Listar alunos da turma
- Registrar nível de desempenho (Abaixo/Na/Acima da média)
- Adicionar observações
- Visualizar histórico de avaliações

#### 3. **Diagnósticos** (`/diagnosticos`)
- **Aba Gerenciar Diagnósticos:**
  - Criar diagnóstico (nome, tipo, objetivo, gênero textual)
  - Definir anos aplicáveis
  - Listar diagnósticos ativos

- **Aba Aplicar Resultados:**
  - Selecionar diagnóstico e turma
  - Registrar nível de evolução (Não/Sim/Em partes)
  - Adicionar observações

#### 4. **SAEB** (`/saeb`)
- **Aba Simulados:**
  - Criar prova SAEB
  - Definir data de aplicação
  - Listar simulados

- **Aba Resultados:**
  - Selecionar prova e turma
  - Registrar notas (Português e Matemática)
  - Marcar presença/ausência
  - Visualizar estatísticas

#### 5. **Mensagens** (`/mensagens`)
- **Aba Enviar:**
  - Individual (selecionar destinatário)
  - Por Escola (todos da escola)
  - Por Perfil (todos de um perfil)
  - Broadcast (todos)

- **Aba Recebidas:**
  - Listar mensagens recebidas
  - Marcar como lida
  - Visualizar detalhes

---

## 🏗️ Estrutura de Pastas

```
frontend/src/
├── pages/
│   ├── Login.tsx                    ✅
│   ├── Dashboard.tsx                ✅
│   ├── EscolasPage.tsx             ✅
│   ├── ProfessoresPage.tsx         ✅
│   ├── TurmasAlunosPage.tsx        🚧
│   ├── AvaliacoesPage.tsx          📝
│   ├── DiagnosticosPage.tsx        📝
│   ├── SAEBPage.tsx                📝
│   ├── MensagensPage.tsx           📝
│   └── RelatoriosPage.tsx          ✅
│
├── components/
│   ├── escolas/
│   │   ├── EscolasTab.tsx          ✅
│   │   └── DiretoresTab.tsx        ✅
│   ├── turmas/
│   │   ├── TurmasTab.tsx           📝
│   │   └── AlunosTab.tsx           📝
│   ├── avaliacoes/
│   │   └── AvaliacaoForm.tsx       📝
│   ├── diagnosticos/
│   │   ├── DiagnosticosTab.tsx     📝
│   │   └── ResultadosTab.tsx       📝
│   ├── saeb/
│   │   ├── SimuladosTab.tsx        📝
│   │   └── ResultadosTab.tsx       📝
│   └── mensagens/
│       ├── EnviarTab.tsx           📝
│       └── RecebidasTab.tsx        📝
```

---

## 🔧 APIs Necessárias

As APIs já estão definidas em `frontend/src/services/api.ts`. Principais endpoints:

### Turmas
```typescript
turmasAPI.list(params)
turmasAPI.create(data)
turmasAPI.update(id, data)
turmasAPI.delete(id)
```

### Alunos
```typescript
alunosAPI.list(params)
alunosAPI.create(data)
alunosAPI.update(id, data)
alunosAPI.delete(id)
```

### Avaliações
```typescript
avaliacoesAPI.list(params)
avaliacoesAPI.create(data)
avaliacoesAPI.update(id, data)
```

### Diagnósticos
```typescript
diagnosticosAPI.list()
diagnosticosAPI.create(data)
diagnosticosResultadosAPI.create(data)
```

### SAEB
```typescript
saebAPI.list()
saebAPI.create(data)
resultadosSAEBAPI.create(data)
```

### Mensagens
```typescript
mensagensAPI.list()
mensagensAPI.send(data)
mensagensAPI.broadcast(data)
mensagensAPI.markAsRead(id)
```

---

## 📊 Campos por Entidade

### Turma
- nome: string
- ano_escolar: number (1-9)
- ano_letivo: number
- turno: string (Matutino/Vespertino/Noturno)
- escola_id: number

### Aluno
- nome_completo: string
- data_nascimento: date
- cpf: string (opcional)
- matricula: string
- turma_id: number
- nome_responsavel: string
- telefone_responsavel: string

### Avaliação Bimestral
- aluno_id: number
- disciplina_id: number
- professor_id: number
- bimestre: number (1-4)
- ano_letivo: number
- nivel_desempenho: enum (abaixo_media/na_media/acima_media)
- observacoes: string

### Diagnóstico
- nome: string
- descricao: string
- ano_letivo: number
- tipo: string
- bimestre_referencia: number
- objetivo_avaliacao: string
- genero_textual: string
- aplicavel_ano_inicial: number
- aplicavel_ano_final: number

### Resultado Diagnóstico
- diagnostico_id: number
- aluno_id: number
- professor_id: number
- nivel_evolucao: enum (nao/sim/em_partes)
- observacoes: string
- data_aplicacao: date

### Prova SAEB
- nome: string
- ano_letivo: number
- ano_escolar_aplicavel: number
- data_aplicacao_prevista: date
- descricao: string

### Resultado SAEB
- prova_id: number
- aluno_id: number
- nota_portugues: number
- nota_matematica: number
- presente: boolean
- data_realizacao: date
- observacoes: string

### Mensagem
- remetente_id: number (automático)
- destinatario_id: number (opcional)
- assunto: string
- corpo: string
- broadcast: boolean

---

## 🎯 Prioridades de Implementação

### Fase 1 (Essencial):
1. **Turmas e Alunos** - Base para as outras funcionalidades
2. **Mensagens** - Comunicação importante

### Fase 2 (Importante):
3. **Avaliações** - Core do sistema educacional
4. **Diagnósticos** - Acompanhamento pedagógico

### Fase 3 (Complementar):
5. **SAEB** - Preparação para avaliações externas

---

## 💡 Padrão de Implementação

Todas as páginas seguem o mesmo padrão das já implementadas:

1. **Estrutura com AppBar** - Navegação e logout
2. **Filtros** - Por escola, turma, etc
3. **Tabela** - Listagem com ações
4. **Dialogs** - Formulários de criar/editar
5. **Alertas** - Feedback de sucesso/erro
6. **Loading States** - Durante operações assíncronas
7. **Validações** - Campos obrigatórios

---

## 🚀 Como Continuar

Para implementar cada página:

1. Copie a estrutura de uma página existente (ex: `ProfessoresPage.tsx`)
2. Ajuste os campos do formulário conforme a entidade
3. Configure as chamadas à API
4. Adicione validações específicas
5. Teste o fluxo completo

---

## 📝 Notas Importantes

- Todas as páginas requerem autenticação
- Diretores veem apenas dados da sua escola
- Gestão Municipal vê todos os dados
- Soft delete em todas as entidades
- Validação de dados no frontend e backend

---

**Status:** Estrutura base criada. Pronto para implementação das páginas individuais.
