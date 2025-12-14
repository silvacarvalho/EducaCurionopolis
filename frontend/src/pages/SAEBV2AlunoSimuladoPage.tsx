/**
 * SAEB V2 - Aluno Simulado Page
 * Interface for students to take SAEB exams online
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  LinearProgress,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import AppBarWithUserMenu from '../components/common/AppBarWithUserMenu';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { SimuladoQuestao, RespostaAlunoSAEBCreate, ResultadoSimuladoAluno } from '../types';

const SAEBV2AlunoSimuladoPage: React.FC = () => {
  const { simuladoId } = useParams<{ simuladoId: string }>();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [simuladoNome, setSimuladoNome] = useState('');
  const [questoes, setQuestoes] = useState<SimuladoQuestao[]>([]);
  const [respostas, setRespostas] = useState<{ [key: number]: string }>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSimuladoAluno | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (simuladoId) {
      loadSimulado();
    }
  }, [simuladoId]);

  const loadSimulado = async () => {
    try {
      setLoading(true);
      const [simResponse, questoesResponse, respostasResponse] = await Promise.all([
        saebV2API.getSimulado(Number(simuladoId)),
        saebV2API.getSimuladoQuestoes(Number(simuladoId)),
        saebV2API.getMinhasRespostas(Number(simuladoId)),
      ]);

      setSimuladoNome(simResponse.data.nome);
      setQuestoes(questoesResponse.data);

      // Load existing answers
      const existingAnswers: { [key: number]: string } = {};
      respostasResponse.data.forEach((r: any) => {
        existingAnswers[r.simulado_questao_id] = r.resposta;
      });
      setRespostas(existingAnswers);

      // Check if already finished
      try {
        const resultadoResponse = await saebV2API.getMeuResultado(Number(simuladoId));
        if (resultadoResponse.data.finalizado) {
          setFinished(true);
          setResultado(resultadoResponse.data);
        }
      } catch {
        // Not finished yet
      }
    } catch (error) {
      showNotification('Erro ao carregar simulado', 'error');
      navigate('/saeb-v2/aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (simuladoQuestaoId: number, answer: string) => {
    setRespostas({ ...respostas, [simuladoQuestaoId]: answer });
  };

  const handleOpenConfirmDialog = () => {
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false);

    try {
      setSubmitting(true);

      const respostasArray: RespostaAlunoSAEBCreate[] = Object.entries(respostas).map(
        ([simuladoQuestaoId, resposta]) => ({
          simulado_questao_id: Number(simuladoQuestaoId),
          resposta,
        })
      );

      await saebV2API.submitRespostasBulk({
        simulado_id: Number(simuladoId),
        respostas: respostasArray,
      });

      const resultadoResponse = await saebV2API.getMeuResultado(Number(simuladoId));
      setResultado(resultadoResponse.data);
      setFinished(true);

      showNotification('Simulado enviado com sucesso!', 'success');
    } catch (error) {
      showNotification('Erro ao enviar simulado', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestao = questoes[currentIndex];
  const progress = questoes.length > 0 ? ((currentIndex + 1) / questoes.length) * 100 : 0;
  const totalRespondidas = Object.keys(respostas).length;

  if (loading) {
    return (
      <Box>
        <AppBarWithUserMenu title="Carregando..." />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (finished && resultado) {
    return (
      <Box>
        <AppBarWithUserMenu title="Resultado do Simulado" showBackButton />
        <Box sx={{ width: '100%', height: '100%', mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 3 } }}>
          <Paper sx={{ p: { xs: 2, sm: 4 } }}>
            <Box sx={{ textAlign: 'center' }}>
              <CheckIcon sx={{ fontSize: { xs: 60, sm: 80 }, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                Simulado Finalizado!
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
                {simuladoNome}
              </Typography>

              <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 2, sm: 3 } }}>
                <Grid item xs={6} sm={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Typography variant="h3" color="primary" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                        {resultado.porcentagem}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        Porcentagem
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Typography variant="h3" color="success.main" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                        {resultado.total_acertos}/{resultado.total_questoes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}>
                        Acertos
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                      <Typography variant="h5" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.5rem' } }}>
                        Situação: <Chip label={resultado.situacao.toUpperCase()} color="primary" size="small" />
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={() => navigate('/saeb-v2/aluno')}
                sx={{ mt: 4, py: { xs: 1.5, sm: 1 }, px: { xs: 4, sm: 3 } }}
                fullWidth
              >
                Voltar para Simulados
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: { xs: 10, sm: 4 } }}> {/* Padding bottom for fixed navigation on mobile */}
      <AppBarWithUserMenu title={simuladoNome} showBackButton />

      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 3 } }}>
        {/* Progress Bar */}
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Questão {currentIndex + 1} de {questoes.length}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
              Respondidas: {totalRespondidas}/{questoes.length}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: { xs: 6, sm: 4 }, borderRadius: 1 }} />
        </Paper>

        {/* Question */}
        {currentQuestao && currentQuestao.questao && (
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 10, sm: 0 } }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Questão {currentIndex + 1}
            </Typography>

            <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap', fontSize: { xs: '0.95rem', sm: '1rem' }, lineHeight: 1.6 }}>
              {currentQuestao.questao.enunciado}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={respostas[currentQuestao.id] || ''}
                onChange={(e) => handleAnswer(currentQuestao.id, e.target.value)}
              >
                {['A', 'B', 'C', 'D', 'E'].map((letter) => {
                  const alternativeKey = `alternativa_${letter.toLowerCase()}` as keyof typeof currentQuestao.questao;
                  const alternativeText = currentQuestao.questao?.[alternativeKey] ?? '';
                  return (
                    <FormControlLabel
                      key={letter}
                      value={letter}
                      control={<Radio sx={{ '& .MuiSvgIcon-root': { fontSize: { xs: 24, sm: 20 } } }} />}
                      label={`${letter}) ${alternativeText}`}
                      sx={{
                        mb: 1,
                        p: { xs: 1, sm: 0.5 },
                        mx: 0,
                        borderRadius: 1,
                        transition: 'background-color 0.2s',
                        '&:active': { backgroundColor: 'action.selected' },
                        '& .MuiFormControlLabel-label': {
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          lineHeight: 1.4,
                        },
                      }}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>

            {/* Navigation - Desktop */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, justifyContent: 'space-between', mt: 4 }}>
              <Button
                startIcon={<BackIcon />}
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
              >
                Anterior
              </Button>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {currentIndex < questoes.length - 1 ? (
                  <Button
                    variant="contained"
                    endIcon={<NextIcon />}
                    onClick={() => setCurrentIndex(currentIndex + 1)}
                  >
                    Próxima
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<SendIcon />}
                    onClick={handleOpenConfirmDialog}
                    disabled={submitting}
                  >
                    Finalizar Simulado
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        )}

        {/* Mobile Fixed Navigation */}
        {currentQuestao && (
          <Box
            sx={{
              display: { xs: 'flex', sm: 'none' },
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              backgroundColor: 'white',
              borderTop: '1px solid',
              borderColor: 'divider',
              gap: 2,
              zIndex: 1000,
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(currentIndex - 1)}
              sx={{ flex: 1, py: 1.5 }}
            >
              Anterior
            </Button>

            {currentIndex < questoes.length - 1 ? (
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                sx={{ flex: 1, py: 1.5 }}
              >
                Próxima
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                onClick={handleOpenConfirmDialog}
                disabled={submitting}
                sx={{ flex: 1, py: 1.5 }}
              >
                Finalizar
              </Button>
            )}
          </Box>
        )}

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialogOpen}
          onClose={handleCloseConfirmDialog}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              m: { xs: 2, sm: 4 },
              width: { xs: 'calc(100% - 32px)', sm: 'auto' },
              maxHeight: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SendIcon color="primary" />
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Confirmar Envio
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Atenção! Esta ação não pode ser desfeita.
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Após enviar o simulado, você não poderá mais alterar suas respostas.
              </Typography>
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body1" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              <strong>Resumo:</strong>
            </Typography>
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                • Total de questões: <strong>{questoes.length}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                • Questões respondidas: <strong>{totalRespondidas}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                • Questões em branco: <strong>{questoes.length - totalRespondidas}</strong>
              </Typography>
            </Box>

            {totalRespondidas < questoes.length && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                  Você ainda tem <strong>{questoes.length - totalRespondidas}</strong> questão(ões) sem resposta.
                  Tem certeza que deseja enviar o simulado?
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Deseja realmente finalizar e enviar o simulado?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={handleCloseConfirmDialog} variant="outlined">
              Revisar Respostas
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              variant="contained"
              color="success"
              startIcon={<SendIcon />}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Enviando...
                </>
              ) : (
                'Confirmar Envio'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SAEBV2AlunoSimuladoPage;
