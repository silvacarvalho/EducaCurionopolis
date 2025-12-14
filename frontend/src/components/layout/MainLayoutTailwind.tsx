import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Notifications as NotificationsIcon, AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContextualSearch } from '../../contexts/ContextualSearchContext';
import AdaptiveSidebarTailwind from './AdaptiveSidebarTailwind';
import api from '../../services/api';

// Hook para detectar se é mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
};

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const MainLayoutTailwind: React.FC<MainLayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { searchQuery, setSearchQuery } = useContextualSearch();
  const isMobile = useIsMobile();
  
  // No mobile, começa fechado
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  const [useTailwind, setUseTailwind] = useState(() => {
    const saved = localStorage.getItem('layoutVersion');
    return saved === 'tailwind';
  });

  // Salvar estado da sidebar apenas no desktop
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen, isMobile]);
  
  // Fechar sidebar ao redimensionar para mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile]);
  
  useEffect(() => {
    localStorage.setItem('layoutVersion', useTailwind ? 'tailwind' : 'mui');
  }, [useTailwind]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/mensagens/contador');
        setUnreadMessages(response.data.nao_lidas || 0);
      } catch (error) {
        console.error('Erro ao buscar contador de mensagens:', error);
      }
    };

    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/perfil');
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // A busca contextual é gerenciada pelo componente da página atual
  };

  const handleNotifications = () => {
    navigate('/mensagens');
  };
  
  const toggleLayout = () => {
    setUseTailwind(!useTailwind);
    window.location.reload(); // Reload para aplicar mudança
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Adaptive Sidebar */}
      <AdaptiveSidebarTailwind
        open={sidebarOpen}
        onToggle={handleToggleSidebar}
        unreadMessages={unreadMessages}
        onLayoutToggle={toggleLayout}
        useTailwind={useTailwind}
      />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 print:!pl-0 ${
          isMobile ? 'pl-0' : (sidebarOpen ? 'pl-[280px]' : 'pl-[70px]')
        }`}
      >
        {/* Top AppBar */}
        <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 safe-area-top">
          <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={handleToggleSidebar}
                className="p-2 -ml-1 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
                aria-label="Abrir menu"
              >
                <MenuIcon className="text-2xl" />
              </button>
            )}

            {/* Title */}
            <h1 className={`font-semibold text-slate-800 truncate ${
              isMobile ? 'text-base flex-1 text-center mx-2' : 'text-xl'
            }`}>
              {title || 'EDUCA+'}
            </h1>

            <div className="flex items-center gap-1 md:gap-4">
              {/* Search Bar - Desktop */}
              <form
                onSubmit={handleSearch}
                className="relative hidden md:block"
              >
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 lg:w-80 pl-10 pr-4 py-2 text-sm bg-slate-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                />
              </form>
              
              {/* Search Button - Mobile */}
              {isMobile && (
                <button
                  onClick={() => setShowMobileSearch(!showMobileSearch)}
                  className="p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
                  aria-label="Buscar"
                >
                  <SearchIcon />
                </button>
              )}

              {/* Notifications */}
              <button
                onClick={handleNotifications}
                className="relative p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
                aria-label="Notificações"
              >
                <NotificationsIcon />
                {unreadMessages > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleMenuOpen}
                  className="p-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
                  aria-label="Menu do usuário"
                >
                  <AccountCircle className="text-2xl md:text-3xl" />
                </button>

                {/* Dropdown Menu */}
                {anchorEl && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={handleMenuClose}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-slate-100">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {user?.nome_completo}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user?.email}
                          </p>
                        </div>
                        <button
                          onClick={handleProfile}
                          className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                        >
                          Meu Perfil
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                        >
                          Sair
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Search Bar - Expandable */}
          {isMobile && showMobileSearch && (
            <div className="px-3 pb-3 bg-white border-b border-slate-200">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <SearchIcon className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                />
              </form>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className={`flex-1 overflow-auto print:p-0 print:overflow-visible ${
          isMobile ? 'p-3' : 'p-6'
        }`}>
          {children}
        </main>
        
        {/* Safe area bottom para dispositivos com notch */}
        <div className="safe-area-bottom md:hidden" />
      </div>
    </div>
  );
};

export default MainLayoutTailwind;
