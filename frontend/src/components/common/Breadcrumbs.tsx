import React from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Mapeamento de rotas para labels e hierarquia
const routeConfig: Record<string, { label: string; parent?: string }> = {
  // Raiz
  '/': { label: 'Início' },
  
  // Páginas principais
  '/relatorios': { label: 'Relatórios', parent: '/' },
  '/escolas': { label: 'Escolas', parent: '/' },
  '/professores': { label: 'Professores', parent: '/' },
  '/turmas': { label: 'Turmas e Alunos', parent: '/' },
  '/avaliacoes': { label: 'Avaliações', parent: '/' },
  '/diagnosticos': { label: 'Diagnósticos', parent: '/' },
  '/diagnostico-itens': { label: 'Itens de Diagnóstico', parent: '/diagnosticos' },
  '/diagnostico-avaliar': { label: 'Avaliar Diagnóstico', parent: '/diagnosticos' },
  '/mensagens': { label: 'Mensagens', parent: '/' },
  '/perfil': { label: 'Meu Perfil', parent: '/' },
  '/importacao-alunos': { label: 'Importação de Alunos', parent: '/turmas' },
  '/configuracoes-grafico': { label: 'Configurações de Gráfico', parent: '/' },
  
  // SAEB V2 - Gestão (usa /saeb-v2/dashboard como hub)
  '/saeb-v2/dashboard': { label: 'SAEB V2', parent: '/' },
  '/saeb-v2/configuracoes': { label: 'Configurações', parent: '/saeb-v2/dashboard' },
  '/saeb-v2/descritores': { label: 'Descritores', parent: '/saeb-v2/dashboard' },
  '/saeb-v2/simulados': { label: 'Simulados', parent: '/saeb-v2/dashboard' },
  '/saeb-v2/relatorios': { label: 'Relatórios', parent: '/saeb-v2/dashboard' },
  
  // SAEB V2 - Professor
  '/saeb-v2/professor': { label: 'SAEB V2 - Professor', parent: '/' },
  '/saeb-v2/lancamento-manual': { label: 'Lançamento Manual', parent: '/saeb-v2/professor' },
  
  // SAEB V2 - Aluno
  '/saeb-v2/aluno': { label: 'Simulados Disponíveis', parent: '/' },
};

// Função para obter o label de rotas dinâmicas
const getDynamicRouteLabel = (pathname: string): { label: string; parent?: string } | null => {
  // /saeb-v2/simulados/:simuladoId/questoes
  if (/^\/saeb-v2\/simulados\/\d+\/questoes$/.test(pathname)) {
    return { label: 'Gerenciar Questões', parent: '/saeb-v2/simulados' };
  }
  
  // /saeb-v2/simulados/:simuladoId/analise
  if (/^\/saeb-v2\/simulados\/\d+\/analise$/.test(pathname)) {
    return { label: 'Análise Psicométrica', parent: '/saeb-v2/simulados' };
  }
  
  // /saeb-v2/resultados/:turmaId/:simuladoId - pode ser acessado por professor ou gestão
  if (/^\/saeb-v2\/resultados\/\d+\/\d+$/.test(pathname)) {
    return { label: 'Resultados', parent: '/saeb-v2/professor' };
  }
  
  // /saeb-v2/aluno/simulado/:simuladoId
  if (/^\/saeb-v2\/aluno\/simulado\/\d+$/.test(pathname)) {
    return { label: 'Realizar Simulado', parent: '/saeb-v2/aluno' };
  }
  
  return null;
};

// Função para construir a cadeia de breadcrumbs
const buildBreadcrumbChain = (pathname: string): BreadcrumbItem[] => {
  const chain: BreadcrumbItem[] = [];
  
  // Obtém a configuração da rota atual
  let config = routeConfig[pathname] || getDynamicRouteLabel(pathname);
  
  if (!config) {
    // Se não encontrou configuração, retorna apenas Início
    return [{ label: 'Início', path: '/' }];
  }
  
  // Adiciona a página atual (sem link)
  chain.unshift({ label: config.label });
  
  // Sobe a hierarquia adicionando os pais
  let parentPath = config.parent;
  while (parentPath) {
    const parentConfig = routeConfig[parentPath];
    if (parentConfig) {
      chain.unshift({ label: parentConfig.label, path: parentPath });
      parentPath = parentConfig.parent;
    } else {
      break;
    }
  }
  
  // Adiciona Início no começo se não estiver lá
  if (chain.length === 0 || chain[0].path !== '/') {
    chain.unshift({ label: 'Início', path: '/' });
  }
  
  return chain;
};

interface BreadcrumbsProps {
  /** Permite sobrescrever os itens do breadcrumb manualmente */
  customItems?: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems }) => {
  const location = useLocation();
  
  // Não mostra breadcrumb na página inicial, login ou acesso público
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/saeb-acesso') {
    return null;
  }
  
  const items = customItems || buildBreadcrumbChain(location.pathname);
  
  // Se só tem um item (página atual), não mostra breadcrumb
  if (items.length <= 1) {
    return null;
  }
  
  return (
    <Box
      sx={{
        backgroundColor: '#f5f5f5',
        px: 3,
        py: 1,
        borderBottom: '1px solid #e0e0e0',
        '@media print': {
          display: 'none',
        },
      }}
    >
      <MuiBreadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="navegação"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          if (isLast || !item.path) {
            // Último item ou item sem path - apenas texto
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: isLast ? 500 : 400,
                }}
              >
                {index === 0 && <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />}
                {item.label}
              </Typography>
            );
          }
          
          // Item com link
          return (
            <Link
              key={index}
              component={RouterLink}
              to={item.path}
              underline="hover"
              color="inherit"
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {index === 0 && <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;
