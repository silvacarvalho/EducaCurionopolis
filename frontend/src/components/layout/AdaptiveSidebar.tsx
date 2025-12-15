import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  Avatar,
  Chip,
  Divider,
  IconButton,
  Badge,
  Collapse,
  Popover,
  Paper,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Message as MessageIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Upload as UploadIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PerfilUsuario } from '../../types';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 70;

interface MenuItem {
  icon: React.ReactNode;
  text: string;
  path?: string;
  badge?: number;
  subItems?: MenuItem[];
}

// Configurações de menu por perfil
const getMenuConfig = (perfil: PerfilUsuario, unreadMessages: number): MenuItem[] => {
  const configs: Record<PerfilUsuario, MenuItem[]> = {
    [PerfilUsuario.GESTAO_MUNICIPAL]: [
      { icon: <DashboardIcon />, text: 'Dashboard', path: '/' },
      { icon: <AssessmentIcon />, text: 'Relatórios', path: '/relatorios' },
      { icon: <MessageIcon />, text: 'Mensagens', path: '/mensagens', badge: unreadMessages },
      
        { icon: <SettingsIcon />,
          text: 'Gestão',
          subItems: [
            { icon: <SchoolIcon />, text: 'Escolas', path: '/escolas' },
            { icon: <PeopleIcon />, text: 'Gestores', path: '/gestores' },
            { icon: <UploadIcon />, text: 'Importar Alunos', path: '/importacao-alunos' },
            { icon: <SettingsIcon />, text: 'Config. Gráficos', path: '/configuracoes-grafico' },
          ],
        },
      {
        icon: <AssignmentIcon />,
        text: 'SAEB',
        subItems: [
          { icon: <DashboardIcon />, text: 'Dashboard SAEB', path: '/saeb-v2/dashboard' },
          { icon: <SettingsIcon />, text: 'Configurações', path: '/saeb-v2/configuracoes' },
          { icon: <DescriptionIcon />, text: 'Descritores', path: '/saeb-v2/descritores' },
          { icon: <AssignmentIcon />, text: 'Simulados', path: '/saeb-v2/simulados' },
          { icon: <AssessmentIcon />, text: 'Relatórios SAEB', path: '/saeb-v2/relatorios' },
        ],
      },
      {
        icon: <AssignmentIcon />,
        text: 'Avaliações',
        subItems: [
          { icon: <AssignmentIcon />, text: 'Diagnósticos', path: '/diagnosticos' },
          { icon: <DescriptionIcon />, text: 'Itens Diagnóstico', path: '/diagnostico-itens' },
        ],
      },
    ],
    [PerfilUsuario.DIRETOR_COORDENADOR]: [
      { icon: <DashboardIcon />, text: 'Dashboard', path: '/' },
      { icon: <AssessmentIcon />, text: 'Relatórios', path: '/relatorios' },
      { icon: <MessageIcon />, text: 'Mensagens', path: '/mensagens', badge: unreadMessages },
      {
        icon: <SchoolIcon />,
        text: 'Gestão Escolar',
        subItems: [
          { icon: <PersonIcon />, text: 'Professores', path: '/professores' },
          { icon: <GroupsIcon />, text: 'Turmas e Alunos', path: '/turmas' },
          { icon: <UploadIcon />, text: 'Importar Alunos', path: '/importacao-alunos' },
        ],
      },
      {
        icon: <AssignmentIcon />,
        text: 'Avaliações',
        subItems: [
          { icon: <AssignmentIcon />, text: 'Avaliações', path: '/avaliacoes' },
          { icon: <AssignmentIcon />, text: 'Diagnósticos', path: '/diagnosticos' },
          { icon: <AssessmentIcon />, text: 'Relatórios SAEB', path: '/saeb-v2/relatorios' },
        ],
      },
    ],
    [PerfilUsuario.PROFESSOR]: [
      { icon: <DashboardIcon />, text: 'Dashboard', path: '/' },
      { icon: <AssessmentIcon />, text: 'Relatórios', path: '/relatorios' },
      { icon: <MessageIcon />, text: 'Mensagens', path: '/mensagens', badge: unreadMessages },
      {
        icon: <AssignmentIcon />,
        text: 'Minhas Atividades',
        subItems: [
          { icon: <AssignmentIcon />, text: 'Aplicar Diagnóstico', path: '/diagnostico-avaliar' },
          { icon: <AssignmentIcon />, text: 'SAEB - Gestão', path: '/saeb-v2/professor' },
          { icon: <DescriptionIcon />, text: 'Lançamento Manual', path: '/saeb-v2/lancamento-manual' },
          { icon: <AssessmentIcon />, text: 'Relatórios SAEB', path: '/saeb-v2/relatorios' },
        ],
      },
    ],
    [PerfilUsuario.COMUNIDADE]: [
      { icon: <DashboardIcon />, text: 'Dashboard', path: '/' },
      { icon: <AssessmentIcon />, text: 'Relatórios Públicos', path: '/relatorios' },
    ],
    [PerfilUsuario.ALUNO]: [
      { icon: <DashboardIcon />, text: 'Dashboard', path: '/' },
      { icon: <AssignmentIcon />, text: 'Meus Simulados', path: '/saeb-v2/aluno' },
    ],
  };

  return configs[perfil] || [];
};

// Mapeamento de nomes de perfil
const perfilNames: Record<PerfilUsuario, string> = {
  [PerfilUsuario.GESTAO_MUNICIPAL]: 'Gestão Municipal',
  [PerfilUsuario.DIRETOR_COORDENADOR]: 'Diretor/Coordenador',
  [PerfilUsuario.PROFESSOR]: 'Professor',
  [PerfilUsuario.COMUNIDADE]: 'Comunidade',
  [PerfilUsuario.ALUNO]: 'Aluno',
};

interface AdaptiveSidebarProps {
  open: boolean;
  onToggle: () => void;
  unreadMessages?: number;
}

const AdaptiveSidebar: React.FC<AdaptiveSidebarProps> = ({
  open,
  onToggle,
  unreadMessages = 0,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState<MenuItem | null>(null);
  const [isMouseOverPopover, setIsMouseOverPopover] = useState(false);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const menuConfig = user ? getMenuConfig(user.perfil, unreadMessages) : [];

  // Função para encontrar o menu ativo baseado na rota atual
  const getActiveMenuText = React.useCallback((): string | null => {
    for (const item of menuConfig) {
      if (item.subItems) {
        const hasActiveSubItem = item.subItems.some(subItem => {
          if (!subItem.path) return false;
          if (subItem.path === '/') {
            return location.pathname === '/';
          }
          return location.pathname.startsWith(subItem.path);
        });
        if (hasActiveSubItem) {
          return item.text;
        }
      }
    }
    return null;
  }, [location.pathname, user?.perfil]);

  const handleMenuToggle = (menuText: string) => {
    const activeMenu = getActiveMenuText();
    
    // Se clicar no menu que já está expandido, fecha ele
    if (expandedMenus.includes(menuText)) {
      setExpandedMenus([]);
      return;
    }
    
    // Se clicar em outro menu, abre apenas esse (fecha todos os outros)
    setExpandedMenus([menuText]);
  };

  // Função para resetar para o menu ativo quando clicar fora
  const resetToActiveMenu = React.useCallback(() => {
    const activeMenu = getActiveMenuText();
    if (activeMenu) {
      setExpandedMenus([activeMenu]);
    } else {
      setExpandedMenus([]);
    }
  }, [getActiveMenuText]);

  const handleNavigation = (path: string) => {
    navigate(path);
    handlePopoverClose();
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isMenuActive = (item: MenuItem): boolean => {
    if (item.path && isActive(item.path)) return true;
    if (item.subItems) {
      return item.subItems.some(subItem => subItem.path && isActive(subItem.path));
    }
    return false;
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, item: MenuItem) => {
    if (!open && item.subItems) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setPopoverAnchor(event.currentTarget);
      setPopoverContent(item);
    }
  };

  const handlePopoverClose = () => {
    if (!isMouseOverPopover) {
      setPopoverAnchor(null);
      setPopoverContent(null);
    }
  };

  const schedulePopoverClose = () => {
    closeTimeoutRef.current = setTimeout(() => {
      if (!isMouseOverPopover) {
        setPopoverAnchor(null);
        setPopoverContent(null);
      }
    }, 100);
  };

  const handlePopoverMouseEnter = () => {
    setIsMouseOverPopover(true);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    setIsMouseOverPopover(false);
    setPopoverAnchor(null);
    setPopoverContent(null);
  };

  // Cleanup de timeout
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Listener para cliques fora do sidebar - reseta para o menu ativo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Clicou fora do sidebar, reseta para mostrar apenas o menu ativo
        const activeMenu = getActiveMenuText();
        if (activeMenu) {
          setExpandedMenus(prev => {
            // Só atualiza se não estiver apenas com o menu ativo
            if (prev.length !== 1 || prev[0] !== activeMenu) {
              return [activeMenu];
            }
            return prev;
          });
        } else {
          setExpandedMenus([]);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [getActiveMenuText]);

  // Mantém aberto automaticamente o grupo de menu que contém a página ativa
  useEffect(() => {
    if (!user) return;
    
    const currentMenu = getMenuConfig(user.perfil, unreadMessages);
    
    for (const item of currentMenu) {
      if (item.subItems) {
        const hasActiveSubItem = item.subItems.some(subItem => {
          if (!subItem.path) return false;
          if (subItem.path === '/') return location.pathname === '/';
          return location.pathname.startsWith(subItem.path);
        });
        
        if (hasActiveSubItem) {
          setExpandedMenus(prevMenus => {
            if (!prevMenus.includes(item.text)) {
              return [item.text];
            }
            return prevMenus;
          });
          break;
        }
      }
    }
  }, [location.pathname, user?.perfil, unreadMessages]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Drawer
      ref={sidebarRef}
      variant="permanent"
      className="adaptive-sidebar no-print"
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        flexShrink: 0,
        '@media print': {
          display: 'none !important',
        },
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #1e88e5 0%, #1976d2 50%, #1565c0 100%)',
          color: 'rgba(255, 255, 255, 0.95)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '4px 0 24px rgba(21, 101, 192, 0.2)',
          '@media print': {
            display: 'none !important',
          },
        },
      }}
    >
      {/* Toggle Button */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: -15,
          zIndex: 1201,
        }}
      >
        <IconButton
          onClick={onToggle}
          sx={{
            backgroundColor: '#f8fafc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#f1f5f9',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transform: 'scale(1.05)',
            },
            width: 30,
            height: 30,
          }}
        >
          {open ? <ChevronLeftIcon fontSize="small" sx={{ color: '#475569' }} /> : <MenuIcon fontSize="small" sx={{ color: '#475569' }} />}
        </IconButton>
      </Box>

      {/* User Section */}
      <Box
        sx={{
          p: 2,
          py: 2.5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          minHeight: 80,
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: 'rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            {user ? getInitials(user.nome_completo) : 'U'}
          </Avatar>
          {open && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'rgba(255, 255, 255, 0.95)',
                  letterSpacing: '0.01em',
                }}
              >
                {user?.nome_completo || 'Usuário'}
              </Typography>
              <Chip
                label={user ? perfilNames[user.perfil] : 'Perfil'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  mt: 0.5,
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Menu Navigation */}
      <List sx={{ pt: 1, pb: 1, px: 0.5 }}>
        {menuConfig.map((item, index) => (
          <Box key={`menu-${index}`}>
            {item.subItems ? (
              <>
                <ListItem disablePadding sx={{ display: 'block' }}>
                  <ListItemButton
                    onClick={() => open ? handleMenuToggle(item.text) : null}
                    onMouseEnter={(e) => handlePopoverOpen(e, item)}
                    onMouseLeave={() => !open && schedulePopoverClose()}
                    selected={isMenuActive(item)}
                    sx={{
                      minHeight: 40,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2,
                      py: 0.75,
                      mx: 0.5,
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 1.5 : 'auto',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.7)',
                        transition: 'all 0.2s ease',
                        '.Mui-selected &': {
                          color: 'rgba(255, 255, 255, 0.95)',
                        },
                        '& .MuiSvgIcon-root': {
                          fontSize: '1.25rem',
                        },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <>
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.85)',
                            letterSpacing: '0.01em',
                          }}
                        />
                        <Box
                          component="span"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transform: expandedMenus.includes(item.text) ? 'rotate(180deg)' : 'rotate(0deg)',
                            backgroundColor: expandedMenus.includes(item.text) 
                              ? 'rgba(255, 255, 255, 0.15)' 
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                          }}
                        >
                          <ExpandMore 
                            sx={{ 
                              color: expandedMenus.includes(item.text) 
                                ? 'rgba(255, 255, 255, 0.9)' 
                                : 'rgba(255, 255, 255, 0.6)', 
                              fontSize: '1.1rem',
                              transition: 'color 0.3s ease',
                            }} 
                          />
                        </Box>
                      </>
                    )}
                  </ListItemButton>
                </ListItem>
                <Collapse 
                  in={open && expandedMenus.includes(item.text)} 
                  timeout={{ enter: 350, exit: 250 }}
                  easing={{
                    enter: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    exit: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  sx={{
                    '& .MuiCollapse-wrapperInner': {
                      transition: 'opacity 0.3s ease',
                    },
                  }}
                >
                  <List 
                    component="div" 
                    disablePadding
                    sx={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
                      borderRadius: 1,
                      mx: 1,
                      my: 0.5,
                      overflow: 'hidden',
                    }}
                  >
                    {item.subItems.map((subItem, subIndex) => (
                      <ListItem
                        key={`submenu-${index}-${subIndex}`}
                        disablePadding
                        sx={{ 
                          display: 'block',
                          animation: expandedMenus.includes(item.text) 
                            ? `fadeSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${subIndex * 0.06}s both`
                            : 'none',
                          '@keyframes fadeSlideIn': {
                            '0%': {
                              opacity: 0,
                              transform: 'translateY(-8px) scale(0.95)',
                            },
                            '100%': {
                              opacity: 1,
                              transform: 'translateY(0) scale(1)',
                            },
                          },
                        }}
                      >
                        <ListItemButton
                          onClick={() => subItem.path && handleNavigation(subItem.path)}
                          selected={subItem.path ? isActive(subItem.path) : false}
                          sx={{
                            minHeight: 36,
                            pl: 4.5,
                            pr: 2,
                            py: 0.5,
                            mx: 0.5,
                            borderRadius: 1.5,
                            transition: 'all 0.2s ease',
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                              },
                            },
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              transform: 'translateX(2px)',
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: 0,
                              mr: 1.5,
                              justifyContent: 'center',
                              color: 'rgba(255, 255, 255, 0.6)',
                              transition: 'color 0.2s ease',
                              '.Mui-selected &': {
                                color: 'rgba(255, 255, 255, 0.95)',
                              },
                              '& .MuiSvgIcon-root': {
                                fontSize: '1.1rem',
                              },
                            }}
                          >
                            {subItem.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontSize: '0.78rem',
                              fontWeight: 400,
                              color: 'rgba(255, 255, 255, 0.75)',
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  onClick={() => item.path && handleNavigation(item.path)}
                  selected={item.path ? isActive(item.path) : false}
                  sx={{
                    minHeight: 40,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2,
                    py: 0.75,
                    mx: 0.5,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 1.5 : 'auto',
                      justifyContent: 'center',
                      color: 'rgba(255, 255, 255, 0.7)',
                      transition: 'color 0.2s ease',
                      '.Mui-selected &': {
                        color: 'rgba(255, 255, 255, 0.95)',
                      },
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.25rem',
                      },
                    }}
                  >
                    {item.badge && item.badge > 0 ? (
                      <Badge badgeContent={item.badge} color="error">
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.85)',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            )}
            {index < menuConfig.length - 1 && (
              <Divider sx={{ my: 0.75, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            )}
          </Box>
        ))}
      </List>

      {/* Popover para submenus quando collapsed */}
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        disableRestoreFocus
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        sx={{
          pointerEvents: 'none',
        }}
        PaperProps={{
          onMouseEnter: handlePopoverMouseEnter,
          onMouseLeave: handlePopoverMouseLeave,
          sx: {
            pointerEvents: 'auto',
            ml: 1,
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            minWidth: 200,
          },
        }}
      >
        {popoverContent && popoverContent.subItems && (
          <List sx={{ py: 1 }}>
            <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {popoverContent.text}
              </Typography>
            </Box>
            {popoverContent.subItems.map((subItem, index) => (
              <ListItem key={`popover-${index}`} disablePadding>
                <ListItemButton
                  onClick={() => subItem.path && handleNavigation(subItem.path)}
                  selected={subItem.path ? isActive(subItem.path) : false}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25,118,210,0.4)',
                      borderLeft: '3px solid #1976d2',
                      '&:hover': {
                        backgroundColor: 'rgba(25,118,210,0.5)',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.15)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 1.5,
                      color: 'white',
                      opacity: 0.8,
                    }}
                  >
                    {subItem.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={subItem.text}
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      fontWeight: 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </Drawer>
  );
};

export default AdaptiveSidebar;
