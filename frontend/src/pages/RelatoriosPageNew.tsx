import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import MainLayout from '../components/layout/MainLayout';
import RelatoriosPage from './RelatoriosPage';

/**
 * Exemplo de como migrar uma página existente para usar o novo layout
 *
 * Opção 1: Wrapper simples (recomendado para migração rápida)
 * Esta abordagem mantém a página original e apenas adiciona o novo layout
 */
const RelatoriosPageNew: React.FC = () => {
  return (
    <MainLayout title="Relatórios">
      {/* Remove o AppBarWithUserMenu da página original pois o MainLayout já tem */}
      <RelatoriosPage />
    </MainLayout>
  );
};

export default RelatoriosPageNew;

/**
 * Opção 2: Migração completa (recomendado a longo prazo)
 *
 * Para migrar completamente, faça:
 *
 * 1. Copie todo o conteúdo da página original
 * 2. Remova o componente AppBarWithUserMenu (já incluído no MainLayout)
 * 3. Envolva o conteúdo com MainLayout
 *
 * Exemplo:
 *
 * const RelatoriosPageNew: React.FC = () => {
 *   const { user } = useAuth();
 *   // ... seu código original ...
 *
 *   return (
 *     <MainLayout title="Relatórios">
 *       <Box sx={{ width: '100%', height: '100%' }}>
 *         <Typography variant="h4" gutterBottom>
 *           Relatórios Educacionais
 *         </Typography>
 *
 *         // ... resto do seu conteúdo ...
 *       </Box>
 *     </MainLayout>
 *   );
 * };
 */
