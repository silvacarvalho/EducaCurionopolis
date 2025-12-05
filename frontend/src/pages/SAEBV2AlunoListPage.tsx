/**
 * SAEB V2 - Aluno List Page
 * Interface for students to view and access their assigned simulado via token
 * Uses token-based authentication (no user profile required)
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompletedIcon,
  Assignment as AssignmentIcon,
  EmojiEvents as TrophyIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  VpnKey as TokenIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { SimuladoSAEB, ResultadoSimuladoAluno } from '../types';

interface StudentSession {
  aluno_id: number;
  aluno_nome: string;
  simulado_id: number;
  simulado_nome: string;
  token: string;
}

const SAEBV2AlunoListPage: React.FC = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudentSession | null>(null);
  const [simulado, setSimulado] = useState<SimuladoSAEB | null>(null);
  const [resultado, setResultado] = useState<ResultadoSimuladoAluno | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);

      // Load student session from localStorage
      const sessionData = localStorage.getItem('student_session');
      if (!sessionData) {
        showNotification('Sessão expirada. Faça login novamente.', 'error');
        navigate('/saeb-acesso');
        return;
      }

      const studentSession: StudentSession = JSON.parse(sessionData);
      setSession(studentSession);

      // Load the simulado details
      const simuladoResponse = await saebV2API.getSimulado(studentSession.simulado_id);
      setSimulado(simuladoResponse.data);

      // Check if student has completed the simulado
      try {
        const resultadoResponse = await saebV2API.getMeuResultado(studentSession.simulado_id);
        const resultadoData: ResultadoSimuladoAluno = resultadoResponse.data;
        if (resultadoData.finalizado) {
          setResultado(resultadoData);
          setIsCompleted(true);
        }
      } catch {
        // No result yet - simulado not completed
        setIsCompleted(false);
      }
    } catch (error) {
      showNotification('Erro ao carregar dados do simulado', 'error');
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSimulado = () => {
    if (session && simulado) {
      navigate(`/saeb-v2/aluno/simulado/${simulado.id}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('student_session');
    navigate('/saeb-acesso');
    showNotification('Você saiu do sistema', 'info');
  };

  const getSituacaoColor = (situacao: string) => {
    switch (situacao.toLowerCase()) {
      case 'adequado':
        return 'success';
      case 'intermediario_i':
      case 'intermediario_ii':
        return 'info';
      case 'critico':
        return 'warning';
      case 'muito_critico':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSituacaoLabel = (situacao: string) => {
    switch (situacao.toLowerCase()) {
      case 'adequado':
        return 'Adequado';
      case 'intermediario_i':
        return 'Intermediário I';
      case 'intermediario_ii':
        return 'Intermediário II';
      case 'critico':
        return 'Crítico';
      case 'muito_critico':
        return 'Muito Crítico';
      default:
        return situacao;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress sx={{ color: 'white' }} size={60} />
      </Box>
    );
  }

  if (!session || !simulado) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Alert severity="error">
          Erro ao carregar dados. Por favor, faça login novamente.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header with Student Info */}
        <Paper elevation={4} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">{session.aluno_nome}</Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                  <TokenIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Token: {session.token}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <IconButton onClick={handleLogout} color="error" title="Sair">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Welcome Message */}
        <Paper elevation={4} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <AssignmentIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Simulado SAEB
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bem-vindo(a) ao simulado do Sistema de Avaliação da Educação Básica
          </Typography>
        </Paper>

        {/* Simulado Card */}
        <Card
          elevation={8}
          sx={{
            position: 'relative',
            border: isCompleted ? '3px solid' : '1px solid',
            borderColor: isCompleted ? 'success.main' : 'divider',
          }}
        >
          {isCompleted && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                bgcolor: 'success.main',
                color: 'white',
                px: 3,
                py: 1,
                borderBottomLeftRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CompletedIcon />
              <Typography variant="subtitle1" fontWeight="bold">
                Concluído
              </Typography>
            </Box>
          )}

          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              {simulado.nome}
            </Typography>

            {simulado.descricao && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {simulado.descricao}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Simulado Info */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <Chip
                label={`${simulado.ano_escolar}º ano`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`${simulado.total_questoes || 0} questões`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Ano Letivo: ${simulado.ano_letivo}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            {/* Show Result if Completed */}
            {isCompleted && resultado && (
              <Box
                sx={{
                  bgcolor: 'success.light',
                  p: 3,
                  borderRadius: 2,
                  mt: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrophyIcon sx={{ color: 'success.dark' }} />
                  <Typography variant="h6" color="success.dark" fontWeight="bold">
                    Seu Resultado
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Acertos
                    </Typography>
                    <Typography variant="h4" color="success.dark" fontWeight="bold">
                      {resultado.total_acertos}/{resultado.total_questoes}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Porcentagem
                    </Typography>
                    <Typography variant="h4" color="success.dark" fontWeight="bold">
                      {resultado.porcentagem}%
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Situação
                  </Typography>
                  <Chip
                    label={getSituacaoLabel(resultado.situacao)}
                    color={getSituacaoColor(resultado.situacao)}
                    size="medium"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Box>
            )}

            {/* Instructions if Not Started */}
            {!isCompleted && (
              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Instruções:
                </Typography>
                <Typography variant="body2" component="div">
                  • Leia cada questão com atenção
                  <br />
                  • Escolha apenas uma alternativa por questão (A, B, C, D ou E)
                  <br />
                  • Você pode navegar entre as questões livremente
                  <br />
                  • Ao finalizar, revise suas respostas antes de enviar
                  <br />• Após enviar, não será possível alterar as respostas
                </Typography>
              </Alert>
            )}
          </CardContent>

          <CardActions sx={{ p: 3, pt: 0 }}>
            <Button
              fullWidth
              variant={isCompleted ? 'outlined' : 'contained'}
              color={isCompleted ? 'success' : 'primary'}
              size="large"
              startIcon={isCompleted ? <TrophyIcon /> : <StartIcon />}
              onClick={handleStartSimulado}
              sx={{ py: 1.5, fontSize: '1.1rem' }}
            >
              {isCompleted ? 'Ver Detalhes do Resultado' : 'Iniciar Simulado'}
            </Button>
          </CardActions>
        </Card>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
            Prefeitura Municipal de Curionópolis - Secretaria de Educação
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default SAEBV2AlunoListPage;
