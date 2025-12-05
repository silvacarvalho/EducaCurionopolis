import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PerfilUsuario } from '../types';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

const Dashboard: React.FC = () => {
  const { hasRole } = useAuth();
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
      roles: [PerfilUsuario.DIRETOR_COORDENADOR],
    },
    {
      title: 'Turmas e Alunos',
      description: 'Gerenciar turmas e alunos',
      path: '/turmas',
      roles: [PerfilUsuario.DIRETOR_COORDENADOR],
    },
    {
      title: 'Importar Alunos',
      description: 'Importar alunos via planilha Excel',
      path: '/importacao-alunos',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL, PerfilUsuario.DIRETOR_COORDENADOR],
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
      title: 'SAEB - Configurações',
      description: 'Configurar quantidades de questões por ano escolar',
      path: '/saeb-v2/configuracoes',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL],
    },
    {
      title: 'SAEB - Descritores e Questões',
      description: 'Gerenciar descritores e questões SAEB',
      path: '/saeb-v2/descritores',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL],
    },
    {
      title: 'SAEB - Simulados',
      description: 'Criar e gerenciar simulados SAEB online',
      path: '/saeb-v2/simulados',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL],
    },
    {
      title: 'SAEB - Gestão de Simulados',
      description: 'Liberar simulados, gerar tokens e imprimir provas',
      path: '/saeb-v2/professor',
      roles: [PerfilUsuario.PROFESSOR],
    },
    {
      title: 'SAEB - Lançamento Manual',
      description: 'Lançar resultados de provas aplicadas em papel',
      path: '/saeb-v2/lancamento-manual',
      roles: [PerfilUsuario.PROFESSOR],
    },
    {
      title: 'SAEB - Meus Simulados',
      description: 'Realizar simulados SAEB online',
      path: '/saeb-v2/aluno',
      roles: [PerfilUsuario.ALUNO],
    },
    {
      title: 'SAEB - Relatórios',
      description: 'Relatórios completos de desempenho SAEB',
      path: '/saeb-v2/relatorios',
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
    {
      title: 'Configurações de Gráficos',
      description: 'Personalizar cores e tamanhos dos gráficos',
      path: '/configuracoes-grafico',
      roles: [PerfilUsuario.GESTAO_MUNICIPAL],
    },
  ];

  const availableItems = menuItems.filter((item) => hasRole(item.roles));

  return (
    <Box>
      <AppBarWithUserMenu title="EDUCA+ Curionópolis" />

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
