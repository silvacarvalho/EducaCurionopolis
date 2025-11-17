import React from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PerfilUsuario } from '../types';

const Dashboard: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

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
      roles: [PerfilUsuario.GESTAO_MUNICIPAL, PerfilUsuario.DIRETOR_COORDENADOR],
    },
    {
      title: 'Turmas e Alunos',
      description: 'Gerenciar turmas e alunos',
      path: '/turmas',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL, PerfilUsuario.DIRETOR_COORDENADOR],
    },
    {
      title: 'Avaliações',
      description: 'Registrar e consultar avaliações bimestrais',
      path: '/avaliacoes',
      roles: [
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
        PerfilUsuario.PROFESSOR,
      ],
    },
    {
      title: 'Diagnósticos',
      description: 'Aplicar e gerenciar diagnósticos',
      path: '/diagnosticos',
      roles: [
        PerfilUsuario.GESTAO_MUNICIPAL,
        PerfilUsuario.DIRETOR_COORDENADOR,
        PerfilUsuario.PROFESSOR,
      ],
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
            {user?.nome_completo} ({user?.perfil})
          </Typography>
          <Button color="inherit" onClick={logout}>
            Sair
          </Button>
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
