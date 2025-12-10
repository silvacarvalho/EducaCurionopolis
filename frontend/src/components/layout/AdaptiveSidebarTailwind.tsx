import React, { useState, useEffect, useRef } from 'react';
import {
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
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  People as PeopleIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PerfilUsuario } from '../../types';

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
  onLayoutToggle?: () => void;
  useTailwind?: boolean;
}

const AdaptiveSidebarTailwind: React.FC<AdaptiveSidebarProps> = ({
  open,
  onToggle,
  unreadMessages = 0,
  onLayoutToggle,
  useTailwind = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState<MenuItem | null>(null);
  const [isMouseOverPopover, setIsMouseOverPopover] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  const menuConfig = user ? getMenuConfig(user.perfil, unreadMessages) : [];

  const handleMenuToggle = (menuText: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuText)
        ? prev.filter(t => t !== menuText)
        : [...prev, menuText]
    );
  };

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
      const rect = event.currentTarget.getBoundingClientRect();
      setPopoverPosition({
        top: rect.top,
        left: rect.right + 8
      });
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

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

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
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-screen text-white transition-all duration-300 z-40 flex flex-col ${
          open ? 'w-[280px]' : 'w-[70px]'
        }`}
        style={{ background: 'linear-gradient(180deg, #1e88e5 0%, #1976d2 50%, #1565c0 100%)' }}
      >
        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute -right-[15px] top-5 z-50 w-[30px] h-[30px] bg-white rounded-full shadow-md border border-gray-200/80 flex items-center justify-center transition-all duration-200 hover:bg-gray-100 hover:shadow-lg hover:scale-105"
        >
          {open ? (
            <ChevronLeftIcon className="text-gray-800 text-sm" />
          ) : (
            <MenuIcon className="text-gray-800 text-sm" />
          )}
        </button>

        {/* User Section */}
        <div className="p-4 py-5 border-b border-white/15 min-h-[80px] bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 shadow-md border-2 border-white/30">
              <span className="text-white font-semibold text-sm">
                {user ? getInitials(user.nome_completo) : 'U'}
              </span>
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white/95 tracking-wide">
                  {user?.nome_completo || 'Usuário'}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[0.65rem] font-medium bg-white/20 text-white/90 rounded border border-white/30">
                  {user ? perfilNames[user.perfil] : 'Perfil'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-0.5">
          {menuConfig.map((item, index) => (
            <div key={`menu-${index}`}>
              {item.subItems ? (
                // Menu com subItems (expansível)
                <>
                  <button
                    onClick={() => open && handleMenuToggle(item.text)}
                    onMouseEnter={(e) => handlePopoverOpen(e, item)}
                    onMouseLeave={() => !open && schedulePopoverClose()}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 mx-0.5 rounded-lg transition-all duration-200 ${
                      isMenuActive(item)
                        ? 'bg-white/20 shadow-md hover:bg-white/25'
                        : 'hover:bg-white/10'
                    } ${!open && 'justify-center'}`}
                  >
                    <div className="flex-shrink-0 text-white/70 transition-colors duration-200">
                      {item.icon}
                    </div>
                    {open && (
                      <>
                        <span className="flex-1 text-left text-sm font-medium">
                          {item.text}
                        </span>
                        {expandedMenus.includes(item.text) ? (
                          <ExpandLess className="text-white" />
                        ) : (
                          <ExpandMore className="text-white" />
                        )}
                      </>
                    )}
                  </button>
                  {/* Submenus */}
                  {open && expandedMenus.includes(item.text) && (
                    <div className="bg-black/10">
                      {item.subItems.map((subItem, subIndex) => (
                        <button
                          key={`submenu-${index}-${subIndex}`}
                          onClick={() => subItem.path && handleNavigation(subItem.path)}
                          className={`w-full flex items-center gap-2 pl-9 pr-3 py-1 mx-0.5 rounded-md transition-all duration-200 ${
                            subItem.path && isActive(subItem.path)
                              ? 'bg-white/20 shadow-sm hover:bg-white/25'
                              : 'hover:bg-white/[0.08] hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex-shrink-0 text-white/60 transition-colors duration-200">
                            {subItem.icon}
                          </div>
                          <span className={`text-[0.78rem] ${
                            subItem.path && isActive(subItem.path)
                              ? 'text-white/95 font-medium'
                              : 'text-white/75'
                          }`}>
                            {subItem.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // Item simples sem submenus
                <button
                  onClick={() => item.path && handleNavigation(item.path)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 mx-0.5 rounded-lg transition-all duration-200 relative ${
                    item.path && isActive(item.path)
                      ? 'bg-white/20 shadow-md hover:bg-white/25'
                      : 'hover:bg-white/10'
                  } ${!open && 'justify-center'}`}
                >
                  <div className="flex-shrink-0 text-white/70 relative transition-colors duration-200">
                    {item.badge && item.badge > 0 ? (
                      <>
                        {item.icon}
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {item.badge}
                        </span>
                      </>
                    ) : (
                      item.icon
                    )}
                  </div>
                  {open && (
                    <span className="text-sm font-medium">
                      {item.text}
                    </span>
                  )}
                </button>
              )}
              {index < menuConfig.length - 1 && (
                <div className="my-1 mx-3 border-t border-white/10" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer com botão de toggle de layout */}
        {onLayoutToggle && (
          <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/15 bg-black/10">
            <button
              onClick={onLayoutToggle}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-white/15 ${
                open ? 'justify-start' : 'justify-center'
              }`}
            >
              <div className="flex-shrink-0 text-white/90">
                {useTailwind ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                )}
              </div>
              {open && (
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium text-white/95">
                    {useTailwind ? 'Material-UI' : 'Tailwind CSS'}
                  </p>
                  <p className="text-[0.65rem] text-white/70">
                    Versão: {useTailwind ? 'Tailwind' : 'MUI'}
                  </p>
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Popover para submenus quando collapsed */}
      {popoverAnchor && popoverContent && (
        <div
          className="fixed z-50 min-w-[200px] text-white rounded-lg shadow-2xl"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            background: 'linear-gradient(180deg, #1e88e5 0%, #1976d2 50%, #1565c0 100%)',
          }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        >
          <div className="py-2">
            <div className="px-4 py-2 border-b border-white/15">
              <p className="text-sm font-semibold">{popoverContent.text}</p>
            </div>
            {popoverContent.subItems?.map((subItem, index) => (
              <button
                key={`popover-${index}`}
                onClick={() => subItem.path && handleNavigation(subItem.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 mx-1 rounded-md transition-all duration-200 ${
                  subItem.path && isActive(subItem.path)
                    ? 'bg-white/20 shadow-sm'
                    : 'hover:bg-white/[0.08] hover:translate-x-0.5'
                }`}
              >
                <div className="flex-shrink-0 text-white/60 transition-colors duration-200">
                  {subItem.icon}
                </div>
                <span className={`text-[0.78rem] ${
                  subItem.path && isActive(subItem.path)
                    ? 'text-white/95 font-medium'
                    : 'text-white/75'
                }`}>
                  {subItem.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default AdaptiveSidebarTailwind;
