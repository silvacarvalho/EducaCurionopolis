# Guia de Uso do Sistema de Permissões

## 📋 Visão Geral

O sistema de permissões do EDUCA+ Curionópolis oferece três formas de controlar o acesso:

1. **Proteção de Rotas** - Impede acesso não autorizado a páginas
2. **Ocultação de Elementos UI** - Esconde botões/componentes baseado em permissões
3. **Notificações de Acesso Negado** - Informa ao usuário quando não tem permissão

---

## 1. Proteção de Rotas com `ProtectedRoute`

### Uso Básico

```tsx
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PerfilUsuario } from '../types';

// No App.tsx ou arquivo de rotas
<Route
  path="/diagnosticos/itens"
  element={
    <ProtectedRoute allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
      <DiagnosticoItens />
    </ProtectedRoute>
  }
/>
```

### Com Redirecionamento Customizado

```tsx
<Route
  path="/admin"
  element={
    <ProtectedRoute
      allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}
      redirectTo="/dashboard"
    >
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

### Múltiplos Perfis

```tsx
<Route
  path="/relatorios"
  element={
    <ProtectedRoute
      allowedProfiles={[
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
        PerfilUsuario.PROFESSOR
      ]}
    >
      <RelatoriosPage />
    </ProtectedRoute>
  }
/>
```

**O que acontece:**
- Se o usuário não tiver permissão, é redirecionado para `/dashboard`
- Uma notificação aparece informando quais perfis têm acesso
- Exemplo: "⛔ Acesso Negado! Esta funcionalidade está disponível apenas para: Gestão Municipal"

---

## 2. Ocultação de Botões/Elementos com `PermissionGate`

### Ocultar Botão para Quem Não Tem Permissão

```tsx
import { PermissionGate } from '../hooks/usePermissions';
import { PerfilUsuario } from '../types';

function MinhaPage() {
  return (
    <Box>
      <h1>Diagnósticos</h1>

      {/* Botão visível apenas para Gestão Municipal */}
      <PermissionGate allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
        <Button
          variant="contained"
          onClick={() => navigate('/diagnosticos/criar')}
        >
          Criar Novo Diagnóstico
        </Button>
      </PermissionGate>

      {/* Botão visível para Gestão ou Diretor */}
      <PermissionGate
        allowedProfiles={[
          PerfilUsuario.GESTAO_MUNICIPAL,
          PerfilUsuario.DIRETOR_COORDENADOR
        ]}
      >
        <Button
          variant="outlined"
          onClick={() => exportarRelatorio()}
        >
          Exportar Relatório
        </Button>
      </PermissionGate>
    </Box>
  );
}
```

### Com Elemento Alternativo (Fallback)

```tsx
<PermissionGate
  allowedProfiles={[PerfilUsuario.PROFESSOR]}
  fallback={
    <Typography color="text.secondary">
      Apenas professores podem aplicar diagnósticos
    </Typography>
  }
>
  <Button variant="contained">Aplicar Diagnóstico</Button>
</PermissionGate>
```

---

## 3. Hook `usePermissions` - Verificações Programáticas

### Verificar Permissões no Código

```tsx
import { usePermissions } from '../hooks/usePermissions';
import { PerfilUsuario } from '../types';

function MinhaPage() {
  const {
    hasPermission,
    isGestaoMunicipal,
    canManageDiagnostics
  } = usePermissions();

  const handleClick = () => {
    if (!hasPermission([PerfilUsuario.GESTAO_MUNICIPAL])) {
      alert('Você não tem permissão para esta ação');
      return;
    }

    // Executar ação permitida
    createDiagnostic();
  };

  return (
    <Box>
      {canManageDiagnostics && (
        <Button onClick={handleClick}>
          Gerenciar Diagnósticos
        </Button>
      )}
    </Box>
  );
}
```

### Flags de Perfil Disponíveis

```tsx
const {
  // Flags de perfil individual
  isGestaoMunicipal,  // true se GESTAO_MUNICIPAL
  isDiretor,          // true se DIRETOR_COORDENADOR
  isProfessor,        // true se PROFESSOR
  isComunidade,       // true se COMUNIDADE

  // Permissões compostas
  canManageDiagnostics,   // Pode gerenciar diagnósticos
  canApplyDiagnostics,    // Pode aplicar diagnósticos
  canViewReports,         // Pode ver relatórios
  canEditSchoolData,      // Pode editar dados da escola
  canManageSchools,       // Pode gerenciar escolas

  // Funções
  hasPermission,          // Verificar array de perfis
  checkPermission,        // Verificar com mensagem customizada
  user,                   // Dados do usuário atual
} = usePermissions();
```

### Verificação com Mensagem Customizada

```tsx
const { checkPermission, showNotification } = usePermissions();

const handleAction = () => {
  const check = checkPermission({
    allowedProfiles: [PerfilUsuario.GESTAO_MUNICIPAL],
    message: 'Apenas a Gestão Municipal pode criar novos itens de diagnóstico'
  });

  if (!check.allowed) {
    showNotification(check.message, 'error');
    return;
  }

  // Executar ação
};
```

---

## 4. Notificações Manuais

### Mostrar Notificação de Sucesso

```tsx
import { useNotification } from '../contexts/NotificationContext';

function MinhaPage() {
  const { showNotification } = useNotification();

  const handleSave = async () => {
    try {
      await api.saveDiagnostic(data);
      showNotification('Diagnóstico salvo com sucesso!', 'success');
    } catch (error) {
      showNotification('Erro ao salvar diagnóstico', 'error');
    }
  };
}
```

### Tipos de Notificação

```tsx
// Sucesso (verde)
showNotification('Operação realizada com sucesso', 'success');

// Erro (vermelho)
showNotification('Ocorreu um erro', 'error');

// Aviso (laranja)
showNotification('Atenção: dados incompletos', 'warning');

// Informação (azul)
showNotification('Processando...', 'info');

// Duração customizada (padrão: 6000ms)
showNotification('Mensagem rápida', 'info', 3000);
```

---

## 5. Exemplos Práticos Completos

### Exemplo 1: Página de Gestão de Itens

```tsx
import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PermissionGate, usePermissions } from '../hooks/usePermissions';
import { useNotification } from '../contexts/NotificationContext';
import { PerfilUsuario } from '../types';

function ItensPage() {
  const navigate = useNavigate();
  const { isGestaoMunicipal } = usePermissions();
  const { showNotification } = useNotification();

  const handleDelete = (id: number) => {
    if (!isGestaoMunicipal) {
      showNotification('Apenas Gestão Municipal pode excluir itens', 'error');
      return;
    }

    // Lógica de exclusão
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Itens de Diagnóstico</Typography>

        <PermissionGate allowedProfiles={[PerfilUsuario.GESTAO_MUNICIPAL]}>
          <Button
            variant="contained"
            onClick={() => navigate('/diagnosticos/itens/criar')}
          >
            Novo Item
          </Button>
        </PermissionGate>
      </Box>

      {/* Lista de itens */}
      <ItemsList onDelete={handleDelete} />
    </Box>
  );
}
```

### Exemplo 2: Botões Condicionais em Cards

```tsx
function DiagnosticoCard({ diagnostico }) {
  const { canManageDiagnostics, canApplyDiagnostics } = usePermissions();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{diagnostico.nome}</Typography>
        <Typography color="text.secondary">{diagnostico.descricao}</Typography>
      </CardContent>

      <CardActions>
        {/* Botão de aplicar - apenas para professores */}
        {canApplyDiagnostics && (
          <Button size="small" color="primary">
            Aplicar Diagnóstico
          </Button>
        )}

        {/* Botão de editar - apenas para gestão */}
        {canManageDiagnostics && (
          <Button size="small" color="secondary">
            Editar
          </Button>
        )}

        {/* Botão de visualizar - todos podem ver */}
        <Button size="small">
          Visualizar
        </Button>
      </CardActions>
    </Card>
  );
}
```

### Exemplo 3: Menu Condicional

```tsx
function NavigationMenu() {
  const { isGestaoMunicipal, isProfessor, isDiretor } = usePermissions();

  return (
    <List>
      {/* Todos veem Dashboard */}
      <ListItem button component={Link} to="/dashboard">
        <ListItemText primary="Dashboard" />
      </ListItem>

      {/* Apenas Gestão vê Gerenciamento */}
      {isGestaoMunicipal && (
        <>
          <ListItem button component={Link} to="/escolas">
            <ListItemText primary="Escolas" />
          </ListItem>
          <ListItem button component={Link} to="/diagnosticos/itens">
            <ListItemText primary="Itens de Diagnóstico" />
          </ListItem>
        </>
      )}

      {/* Apenas Professor vê Aplicar */}
      {isProfessor && (
        <ListItem button component={Link} to="/diagnosticos/aplicar">
          <ListItemText primary="Aplicar Diagnóstico" />
        </ListItem>
      )}

      {/* Gestão e Diretor veem Relatórios */}
      {(isGestaoMunicipal || isDiretor) && (
        <ListItem button component={Link} to="/relatorios">
          <ListItemText primary="Relatórios" />
        </ListItem>
      )}
    </List>
  );
}
```

---

## 6. Matriz de Permissões Rápida

| Funcionalidade | Gestão | Diretor | Professor | Comunidade |
|---------------|--------|---------|-----------|------------|
| Criar Itens | ✅ | ❌ | ❌ | ❌ |
| Criar Diagnósticos | ✅ | ❌ | ❌ | ❌ |
| Aplicar Diagnósticos | ❌ | ❌ | ✅ | ❌ |
| Ver Relatórios | ✅ (Todos) | ✅ (Sua escola) | ✅ (Sua escola) | ❌ |
| Gerenciar Escolas | ✅ | ❌ | ❌ | ❌ |
| Editar Dados Escola | ✅ | ✅ | ❌ | ❌ |

---

## 7. Boas Práticas

### ✅ Faça

- Use `PermissionGate` para ocultar botões/elementos UI
- Use `ProtectedRoute` para proteger páginas inteiras
- Sempre valide permissões no backend também
- Mostre mensagens claras quando acesso for negado
- Use as flags booleanas (`isGestaoMunicipal`, etc) para código mais limpo

### ❌ Evite

- Não confie apenas em validações frontend (sempre valide no backend)
- Não mostre botões que não fazem nada quando clicados
- Não use strings hardcoded para perfis (use o enum `PerfilUsuario`)
- Não esqueça de adicionar `ProtectedRoute` em rotas sensíveis

---

## 8. Troubleshooting

### Notificação não aparece
✅ Verifique se `NotificationProvider` está em `main.tsx`

### Hook retorna erro
✅ Certifique-se de usar o hook dentro de um componente que está dentro do `AuthProvider`

### Permissão não funciona
✅ Verifique se o perfil do usuário está correto no `localStorage`
✅ Faça logout e login novamente

### Botão não some
✅ Verifique se está usando o enum correto: `PerfilUsuario.GESTAO_MUNICIPAL`
✅ Não use strings como `'gestao_municipal'`

---

## 📝 Resumo

1. **Para proteger páginas**: Use `<ProtectedRoute>`
2. **Para ocultar botões**: Use `<PermissionGate>` ou `{isGestaoMunicipal && <Button />}`
3. **Para verificações no código**: Use `const { hasPermission } = usePermissions()`
4. **Para notificações**: Use `const { showNotification } = useNotification()`

O sistema é completo, seguro e fácil de usar! 🎉
