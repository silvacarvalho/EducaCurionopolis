import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Stack,
  Box,
} from '@mui/material';
import {
  AccountCircle as AccountCircleIcon,
  ArrowBack as ArrowBackIcon,
  Mail as MailIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../contexts/MessagesContext';

interface AppBarWithUserMenuProps {
  title: string;
  showBackButton?: boolean;
}

const AppBarWithUserMenu: React.FC<AppBarWithUserMenuProps> = ({
  title,
  showBackButton = false,
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useMessages();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePerfil = () => {
    handleMenuClose();
    navigate('/perfil');
  };

  const handleMensagens = () => {
    navigate('/mensagens');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {showBackButton && (
          <Button
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            Voltar
          </Button>
        )}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
          <Box component="img" src="/favicon.svg" alt="Educa Curionópolis" sx={{ width: 40, height: 40 }} />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Stack>
        
        {/* Message Badge */}
        <Tooltip title={unreadCount > 0 ? `${unreadCount} mensagens não lidas` : 'Mensagens'}>
          <IconButton
            color="inherit"
            onClick={handleMensagens}
            sx={{ mr: 1 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <MailIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Typography variant="body2" sx={{ mr: 2 }}>
          {user?.nome_completo}
        </Typography>
        <IconButton
          color="inherit"
          onClick={handleMenuOpen}
          aria-label="menu do usuário"
        >
          <AccountCircleIcon />
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
          <MenuItem onClick={handlePerfil}>Meu Perfil</MenuItem>
          <MenuItem onClick={handleMensagens}>Mensagens {unreadCount > 0 && `(${unreadCount})`}</MenuItem>
          <MenuItem onClick={logout}>Sair</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default AppBarWithUserMenu;
