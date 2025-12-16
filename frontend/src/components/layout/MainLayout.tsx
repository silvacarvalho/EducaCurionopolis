import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, InputBase, IconButton, Badge, Avatar, Menu, MenuItem, alpha } from '@mui/material';
import { Search as SearchIcon, Notifications as NotificationsIcon, AccountCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useContextualSearch } from '../../contexts/ContextualSearchContext';
import AdaptiveSidebar from './AdaptiveSidebar';
import api from '../../services/api';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerExtra?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, title, headerExtra }) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { searchQuery, setSearchQuery } = useContextualSearch();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Recuperar estado do localStorage
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Salvar estado do sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Buscar contagem de mensagens não lidas
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
      // Atualizar a cada 30 segundos
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

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc', 
      overflow: 'hidden',
      '@media print': {
        backgroundColor: 'white',
      }
    }}>
      {/* Adaptive Sidebar */}
      <Box
        className="no-print"
        sx={{
          '@media print': {
            display: 'none !important',
          }
        }}
      >
        <AdaptiveSidebar
          open={sidebarOpen}
          onToggle={handleToggleSidebar}
          unreadMessages={unreadMessages}
        />
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          '@media print': {
            width: '100% !important',
            maxWidth: '100% !important',
            marginLeft: '0 !important',
          }
        }}
      >
        {/* Top AppBar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: 'white',
            borderBottom: '1px solid #e2e8f0',
            color: '#1e293b',
            '@media print': {
              display: 'none !important',
            }
          }}
        >
          <Toolbar>
            {/* Breadcrumb / Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                {title || 'EDUCA+ Curionópolis'}
              </Typography>
              {headerExtra}
            </Box>

            {/* Search Bar */}
            <Box
              component="form"
              onSubmit={handleSearch}
              sx={{
                position: 'relative',
                borderRadius: 2,
                backgroundColor: alpha('#000', 0.05),
                '&:hover': {
                  backgroundColor: alpha('#000', 0.08),
                },
                mr: 2,
                width: { xs: '100%', sm: 'auto' },
                maxWidth: 300,
              }}
            >
              <Box
                sx={{
                  padding: '0 16px',
                  height: '100%',
                  position: 'absolute',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SearchIcon sx={{ color: '#64748b' }} />
              </Box>
              <InputBase
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  color: 'inherit',
                  width: '100%',
                  '& .MuiInputBase-input': {
                    padding: '10px 10px 10px 0',
                    paddingLeft: `calc(1em + 32px)`,
                    fontSize: '0.9rem',
                  },
                }}
              />
            </Box>

            {/* Notifications - Hidden for students */}
            {!localStorage.getItem('student_session') && (
              <IconButton
                size="large"
                color="inherit"
                onClick={handleNotifications}
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={unreadMessages} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            )}


            {/* User Menu */}
            <IconButton
              size="large"
              edge="end"
              onClick={handleMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              
              <MenuItem onClick={handleProfile}>Meu Perfil</MenuItem>
              <MenuItem onClick={handleLogout}>Sair</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            '@media print': {
              p: 0,
              overflow: 'visible',
            }
          }}
        >
          <Box sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden', 
            maxWidth: '100%',
            '@media print': {
              overflow: 'visible !important',
              overflowY: 'visible !important',
              overflowX: 'visible !important',
            }
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
