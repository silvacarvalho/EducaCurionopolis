import React, { useState } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { AccountCircle as AccountCircleIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PerfilUsuario } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
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

  const menuItems = [

    {
      title: 'Relatórios',
      description: 'Visualizar relatórios e métricas educacionais',
      path: '/relatorios',
      roles: [
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
        PerfilUsuario.PROFESSOR,
        PerfilUsuario.COMUNIDADE,
      ],
    },
    {
      title: 'Escolas',
      description: 'Gerenciar escolas e diretores',
      path: '/escolas',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL],
    },
    {
      title: 'Professores',
      description: 'Gerenciar professores e disciplinas',
      path: '/professores',
      roles: [PerfilUsuario.DIRETOR_COORDENADOR],
    },
    {
      title: 'Turmas e Alunos',
      description: 'Gerenciar turmas e alunos',
      path: '/turmas',
      roles: [PerfilUsuario.DIRETOR_COORDENADOR],
    },
    {
      title: 'Avaliações',
      description: 'Registrar e consultar avaliações bimestrais',
      path: '/avaliacoes',
      roles: [
        PerfilUsuario.DIRETOR_COORDENADOR,
      ],
    },
    {
      title: 'Diagnósticos',
      description: 'Aplicar e gerenciar diagnósticos',
      path: '/diagnosticos',
      roles: [
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
      ],
    },
    {
      title: 'Itens de Diagnóstico',
      description: 'Gerenciar itens de diagnóstico (Leitura/Escrita)',
      path: '/diagnostico-itens',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL],
    },
    {
      title: 'Aplicar Diagnóstico',
      description: 'Aplicar Diagnóstico a alunos e definir hipótese de escrita',
      path: '/diagnostico-avaliar',
      roles: [PerfilUsuario.PROFESSOR],
    },
    {
      title: 'SAEB',
      description: 'Simulados e resultados SAEB',
      path: '/saeb',
      roles: [
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
        PerfilUsuario.PROFESSOR,
      ],
    },
    {
      title: 'Mensagens',
      description: 'Enviar e receber mensagens',
      path: '/mensagens',
      roles: [
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
        PerfilUsuario.PROFESSOR,
      ],
    },
  ];

  const availableItems = menuItems.filter((item) => hasRole(item.roles));

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            EDUCA+ Curionópolis
          </Typography>
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
            <MenuItem onClick={logout}>Sair</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bem-vindo ao EDUCA+ Curionópolis
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Sistema Modular de Gestão Educacional
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {availableItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.path}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
                onClick={() => navigate(item.path)}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
