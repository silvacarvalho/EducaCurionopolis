# Permissões do Sistema de Diagnósticos

## Visão Geral das Permissões por Perfil

### 1. GESTÃO_MUNICIPAL
**Acesso Total ao Sistema**

#### Itens de Diagnóstico
- ✅ Criar novos itens (`POST /api/v1/diagnosticos/itens`)
- ✅ Listar todos os itens (`GET /api/v1/diagnosticos/itens`)
- ✅ Visualizar detalhes de um item (`GET /api/v1/diagnosticos/itens/{item_id}`)
- ✅ Editar itens (`PUT /api/v1/diagnosticos/itens/{item_id}`)
- ✅ Desativar itens (`DELETE /api/v1/diagnosticos/itens/{item_id}`)

#### Diagnósticos
- ✅ Criar diagnósticos (`POST /api/v1/diagnosticos/`)
- ✅ Listar todos os diagnósticos (`GET /api/v1/diagnosticos/`)
- ✅ Visualizar detalhes de um diagnóstico (`GET /api/v1/diagnosticos/{diagnostico_id}`)
- ✅ Editar diagnósticos (`PUT /api/v1/diagnosticos/{diagnostico_id}`)
- ✅ Vincular itens aos diagnósticos (`POST /api/v1/diagnosticos/{diagnostico_id}/vincular-itens`)
- ✅ Substituir diagnósticos (`POST /api/v1/diagnosticos/substituir`)

#### Relatórios
- ✅ Visualizar relatórios de qualquer escola/turma (`GET /api/v1/diagnosticos/relatorios/por-eixo/{diagnostico_id}`)

#### Restrições
- ❌ Nenhuma - acesso total

---

### 2. PROFESSOR
**Aplicação de Diagnósticos e Visualização dos Próprios Resultados**

#### Itens de Diagnóstico
- ✅ Listar itens (apenas visualização) (`GET /api/v1/diagnosticos/itens`)
- ✅ Visualizar detalhes de um item (`GET /api/v1/diagnosticos/itens/{item_id}`)
- ❌ Criar, editar ou excluir itens

#### Diagnósticos
- ✅ Listar diagnósticos disponíveis (filtrados por `data_disponivel` e `data_limite`) (`GET /api/v1/diagnosticos/`)
- ✅ Visualizar detalhes de um diagnóstico (`GET /api/v1/diagnosticos/{diagnostico_id}`)
- ❌ Criar, editar ou excluir diagnósticos
- ❌ Vincular itens aos diagnósticos

#### Aplicação de Diagnósticos (Avaliação)
- ✅ Aplicar diagnóstico a um aluno (`POST /api/v1/diagnosticos/resultados`)
- ✅ Listar resultados dos seus próprios alunos (`GET /api/v1/diagnosticos/resultados`)
- ✅ Editar resultado de um aluno que avaliou (`PUT /api/v1/diagnosticos/resultados/{resultado_id}`)
- ❌ Editar resultados de outros professores

#### Relatórios
- ✅ Visualizar relatórios apenas da sua escola (`GET /api/v1/diagnosticos/relatorios/por-eixo/{diagnostico_id}`)
- ❌ Visualizar relatórios de outras escolas

#### Restrições
- Apenas diagnósticos dentro do período de `data_disponivel` e `data_limite`
- Apenas dados da escola onde leciona
- Apenas resultados que ele mesmo criou

---

### 3. DIRETOR_COORDENADOR
**Visualização de Resultados da Sua Escola**

#### Itens de Diagnóstico
- ✅ Listar itens (apenas visualização) (`GET /api/v1/diagnosticos/itens`)
- ✅ Visualizar detalhes de um item (`GET /api/v1/diagnosticos/itens/{item_id}`)
- ❌ Criar, editar ou excluir itens

#### Diagnósticos
- ✅ Listar diagnósticos (`GET /api/v1/diagnosticos/`)
- ✅ Visualizar detalhes de um diagnóstico (`GET /api/v1/diagnosticos/{diagnostico_id}`)
- ❌ Criar, editar ou excluir diagnósticos
- ❌ Vincular itens aos diagnósticos

#### Aplicação de Diagnósticos
- ❌ Não pode aplicar diagnósticos
- ✅ Visualizar resultados de todos os professores da sua escola (`GET /api/v1/diagnosticos/resultados`)

#### Relatórios
- ✅ Visualizar relatórios apenas da sua escola (`GET /api/v1/diagnosticos/relatorios/por-eixo/{diagnostico_id}`)
- ❌ Visualizar relatórios de outras escolas

#### Restrições
- **Apenas dados da escola onde é diretor**
- Não pode criar ou editar nada, apenas visualizar
- Acesso automático filtrado pela escola vinculada ao seu usuário

---

### 4. COMUNIDADE
**Visualização Básica (se aplicável)**

#### Permissões
- ⚠️ A definir (atualmente sem acesso ao módulo de diagnósticos)

---

## Fluxo de Trabalho

### 1. Criação de Diagnóstico (GESTÃO_MUNICIPAL)
```
1. Criar itens de diagnóstico
   POST /api/v1/diagnosticos/itens
   {
     "descricao": "Reconhece letras do alfabeto",
     "modalidade": "leitura",
     "anos_aplicaveis": "1,2,3"
   }

2. Criar diagnóstico
   POST /api/v1/diagnosticos/
   {
     "nome": "Diagnóstico Inicial 2025",
     "ano_letivo": 2025,
     "tipo": "inicial",
     "aplicavel_ano_inicial": 1,
     "aplicavel_ano_final": 5,
     "data_disponivel": "2025-02-01",
     "data_limite": "2025-02-28"
   }

3. Vincular itens ao diagnóstico
   POST /api/v1/diagnosticos/{diagnostico_id}/vincular-itens
   {
     "item_ids": [1, 2, 3, 4, 5]
   }
```

### 2. Aplicação de Diagnóstico (PROFESSOR)
```
1. Listar diagnósticos disponíveis
   GET /api/v1/diagnosticos/?ativo=true

2. Obter detalhes do diagnóstico e itens
   GET /api/v1/diagnosticos/{diagnostico_id}

3. Aplicar diagnóstico ao aluno
   POST /api/v1/diagnosticos/resultados
   {
     "diagnostico_id": 1,
     "aluno_id": 1,
     "hipotese_escrita": "silabico_alfabetico",
     "avaliacoes_itens": [
       {"item_diagnostico_id": 1, "resposta": "sim"},
       {"item_diagnostico_id": 2, "resposta": "em_parte"}
     ]
   }
```

### 3. Visualização de Resultados (DIRETOR)
```
1. Visualizar relatório por eixo da sua escola
   GET /api/v1/diagnosticos/relatorios/por-eixo/{diagnostico_id}

   - Sistema automaticamente filtra pela escola do diretor
   - Não pode acessar dados de outras escolas
```

---

## Resumo das Permissões

| Ação | GESTÃO_MUNICIPAL | PROFESSOR | DIRETOR | COMUNIDADE |
|------|-----------------|-----------|---------|------------|
| Criar Itens | ✅ | ❌ | ❌ | ❌ |
| Editar Itens | ✅ | ❌ | ❌ | ❌ |
| Criar Diagnóstico | ✅ | ❌ | ❌ | ❌ |
| Editar Diagnóstico | ✅ | ❌ | ❌ | ❌ |
| Vincular Itens | ✅ | ❌ | ❌ | ❌ |
| Aplicar Diagnóstico | ❌ | ✅ | ❌ | ❌ |
| Ver Relatórios | ✅ (Todos) | ✅ (Sua escola) | ✅ (Sua escola) | ❌ |
| Editar Resultados | ❌ | ✅ (Próprios) | ❌ | ❌ |

---

## Implementação Técnica

### Backend (FastAPI)
- **Decoradores de Permissão**: `@require_gestao_municipal`, `@require_diretor_or_gestao`
- **Dependency Injection**: `get_current_professor`, `get_current_active_user`
- **Filtros Automáticos**: Sistema aplica filtros baseados no perfil do usuário

### Frontend (React)
- **Proteção de Rotas**: Componente `ProtectedRoute` verifica permissões
- **Ocultação de UI**: Botões e menus condicionais baseados em `user.perfil`
- **Validação Dupla**: Frontend + Backend validam permissões

---

## Segurança

### Princípios Aplicados
1. **Least Privilege**: Cada perfil tem apenas as permissões necessárias
2. **Defense in Depth**: Validação no frontend E backend
3. **Separation of Duties**: Gestão não pode aplicar, Professor não pode criar
4. **Data Isolation**: Diretores e Professores acessam apenas dados da sua escola

### Logs e Auditoria
- Todas as criações/edições registram `created_at` e `updated_at`
- Resultados vinculam `professor_id` para rastreabilidade
- Sistema mantém histórico de substituições de diagnósticos
