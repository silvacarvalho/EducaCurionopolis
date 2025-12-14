/**
 * Modal de Detalhamento de Avaliação Agregada
 * Mostra os alunos avaliados e seu status atual (transferidos ou não)
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Divider,
  Grid,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { relatoriosAPI } from '../services/api';

interface DetalhamentoAvaliacaoModalProps {
  open: boolean;
  onClose: () => void;
  turmaId: number | null;
  turmaNome?: string;
  anoLetivo: number;
  bimestre?: number;
  disciplinaId?: number;
}

interface AlunoDetalhamento {
  id: number;
  nome: string;
  status: 'ativo' | 'transferido';
  turma_atual: string;
  turma_anterior?: string;
}

interface DetalhamentoData {
  turma_id: number;
  turma_nome: string;
  disciplina_id?: number;
  ano_letivo: number;
  bimestre: number;
  avaliacao_existe: boolean;
  data_avaliacao?: string;
  qtd_abaixo_media: number;
  qtd_na_media: number;
  qtd_acima_media: number;
  total_avaliados: number;
  total_alunos_atuais: number;
  tem_transferencias: boolean;
  total_transferidos: number;
  alunos: AlunoDetalhamento[];
  observacoes?: string;
}

const DetalhamentoAvaliacaoModal: React.FC<DetalhamentoAvaliacaoModalProps> = ({
  open,
  onClose,
  turmaId,
  turmaNome,
  anoLetivo,
  bimestre,
  disciplinaId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<DetalhamentoData | null>(null);

  useEffect(() => {
    if (open && turmaId) {
      loadDetalhamento();
    }
  }, [open, turmaId, anoLetivo, bimestre, disciplinaId]);

  const loadDetalhamento = async () => {
    if (!turmaId) return;

    setLoading(true);
    setError('');

    try {
      const response = await relatoriosAPI.avaliacaoAgregadaDetalhamento(turmaId, {
        ano_letivo: anoLetivo,
        bimestre: bimestre || undefined,
        disciplina_id: disciplinaId,
      });

      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao carregar detalhamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Detalhamento da Avaliação - {turmaNome || 'Turma'}
        <Typography variant="caption" display="block" color="text.secondary">
          {bimestre ? `${bimestre}º Bimestre` : 'Todos os Bimestres'} / {anoLetivo}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && data && (
          <>
            {!data.avaliacao_existe ? (
              <Alert severity="info">
                Não há avaliação registrada para esta turma no período selecionado.
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Parâmetros usados: Turma ID: {turmaId}, Ano: {anoLetivo}, Bimestre: {bimestre || 'Todos'}, Disciplina: {disciplinaId || 'Todas'}
                </Typography>
              </Alert>
            ) : (
              <>
                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={3}>
                    <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white', textAlign: 'center' }}>
                      <Typography variant="caption">Total Avaliados</Typography>
                      <Typography variant="h4">{data.total_avaliados}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'white', textAlign: 'center' }}>
                      <Typography variant="caption">Abaixo Média</Typography>
                      <Typography variant="h4">{data.qtd_abaixo_media}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper sx={{ p: 2, bgcolor: 'warning.light', color: 'white', textAlign: 'center' }}>
                      <Typography variant="caption">Na Média</Typography>
                      <Typography variant="h4">{data.qtd_na_media}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'white', textAlign: 'center' }}>
                      <Typography variant="caption">Acima Média</Typography>
                      <Typography variant="h4">{data.qtd_acima_media}</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Transfer Alert */}
                {data.tem_transferencias && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Atenção:</strong> Foram avaliados <strong>{data.total_avaliados}</strong> alunos,
                    mas atualmente a turma possui <strong>{data.total_alunos_atuais}</strong> alunos ativos.
                    Diferença: <strong>{data.total_transferidos}</strong> aluno(s).
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Isso pode indicar transferências, evasões ou novas matrículas após a avaliação.
                    </Typography>
                  </Alert>
                )}

                {/* Students Table */}
                {data.alunos && data.alunos.length > 0 && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Alunos Avaliados
                    </Typography>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Nome do Aluno</TableCell>
                            <TableCell align="center">Status</TableCell>
                            <TableCell>Turma Atual</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.alunos.map((aluno) => (
                            <TableRow
                              key={aluno.id}
                              sx={{
                                bgcolor: aluno.status === 'transferido' ? '#fff3e0' : 'inherit',
                              }}
                            >
                              <TableCell>{aluno.nome}</TableCell>
                              <TableCell align="center">
                                {aluno.status === 'transferido' ? (
                                  <Chip
                                    icon={<SwapHorizIcon />}
                                    label="Transferido"
                                    color="warning"
                                    size="small"
                                  />
                                ) : (
                                  <Chip
                                    icon={<CheckCircleIcon />}
                                    label="Ativo"
                                    color="success"
                                    size="small"
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {aluno.turma_atual}
                                {aluno.turma_anterior && aluno.turma_anterior !== aluno.turma_atual && (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    (Anteriormente: {aluno.turma_anterior})
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                {/* Observations */}
                {data.observacoes && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Observações:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data.observacoes}
                    </Typography>
                  </Box>
                )}

                {data.data_avaliacao && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                    Avaliação registrada em: {new Date(data.data_avaliacao).toLocaleString('pt-BR')}
                  </Typography>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetalhamentoAvaliacaoModal;
