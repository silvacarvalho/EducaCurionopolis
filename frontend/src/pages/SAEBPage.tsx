import React from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Paper,
  Alert,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';

const SAEBPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box>
      <AppBarWithUserMenu title="Gestão de Simulado SAEB" showBackButton />

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Gerenciar Simulados SAEB
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Módulo SAEB em desenvolvimento. Aqui você poderá criar provas e registrar resultados dos simulados.
          </Alert>
        </Paper>
      </Container>
    </Box>
  );
};

export default SAEBPage;
