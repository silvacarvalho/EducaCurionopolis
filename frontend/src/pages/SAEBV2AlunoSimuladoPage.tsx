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
        <Box sx={{ width: '100%', height: '100%', mt: 4, mb: 4 }}>
          <Paper sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Simulado Finalizado!
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {simuladoNome}
              </Typography>

              <Grid container spacing={3} sx={{ mt: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h3" color="primary">
                        {resultado.porcentagem}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Porcentagem de Acertos
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h3" color="success.main">
                        {resultado.total_acertos}/{resultado.total_questoes}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Acertos / Total
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" gutterBottom>
                        Situação: <Chip label={resultado.situacao.toUpperCase()} color="primary" />
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={() => navigate('/saeb-v2/aluno')}
                sx={{ mt: 4 }}
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
    <Box>
      <AppBarWithUserMenu title={simuladoNome} showBackButton />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Progress Bar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Questão {currentIndex + 1} de {questoes.length}
            </Typography>
            <Typography variant="body2">
              Respondidas: {totalRespondidas}/{questoes.length}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} />
        </Paper>

        {/* Question */}
        {currentQuestao && currentQuestao.questao && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Questão {currentIndex + 1}
            </Typography>

            <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
              {currentQuestao.questao.enunciado}
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={respostas[currentQuestao.id] || ''}
                onChange={(e) => handleAnswer(currentQuestao.id, e.target.value)}
              >
                <FormControlLabel value="A" control={<Radio />} label={`A) ${currentQuestao.questao.alternativa_a}`} />
                <FormControlLabel value="B" control={<Radio />} label={`B) ${currentQuestao.questao.alternativa_b}`} />
                <FormControlLabel value="C" control={<Radio />} label={`C) ${currentQuestao.questao.alternativa_c}`} />
                <FormControlLabel value="D" control={<Radio />} label={`D) ${currentQuestao.questao.alternativa_d}`} />
                <FormControlLabel value="E" control={<Radio />} label={`E) ${currentQuestao.questao.alternativa_e}`} />
              </RadioGroup>
            </FormControl>

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
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

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialogOpen}
          onClose={handleCloseConfirmDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SendIcon color="primary" />
              <Typography variant="h6">Confirmar Envio do Simulado</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Atenção! Esta ação não pode ser desfeita.
              </Typography>
              <Typography variant="body2">
                Após enviar o simulado, você não poderá mais alterar suas respostas.
              </Typography>
            </Alert>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body1" gutterBottom>
              <strong>Resumo:</strong>
            </Typography>
            <Box sx={{ pl: 2, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • Total de questões: <strong>{questoes.length}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Questões respondidas: <strong>{totalRespondidas}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Questões em branco: <strong>{questoes.length - totalRespondidas}</strong>
              </Typography>
            </Box>

            {totalRespondidas < questoes.length && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Você ainda tem <strong>{questoes.length - totalRespondidas}</strong> questão(ões) sem resposta.
                  Tem certeza que deseja enviar o simulado?
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
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
