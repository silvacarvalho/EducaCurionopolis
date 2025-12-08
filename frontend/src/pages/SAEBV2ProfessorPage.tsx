/**
 * SAEB V2 - Professor Page
 * Interface for teachers to release simulados to their classes and view results
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  VpnKey as TokenIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API, turmasAPI } from '../services/api';
import {
  SimuladoSAEB,
  ParticipacaoSimulado,
  Turma,
  ParticipacaoSimuladoCreate,
  StatusSimulado,
  TokenAcessoList,
} from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const SAEBV2ProfessorPage: React.FC = () => {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data states
  const [simulados, setSimulados] = useState<SimuladoSAEB[]>([]);
  const [participacoes, setParticipacoes] = useState<ParticipacaoSimulado[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  // Dialog states
  const [liberarDialogOpen, setLiberarDialogOpen] = useState(false);
  const [selectedSimulado, setSelectedSimulado] = useState<SimuladoSAEB | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<number>(0);

  // Token dialog states
  const [tokensDialogOpen, setTokensDialogOpen] = useState(false);
  const [tokensData, setTokensData] = useState<TokenAcessoList | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSimulados(),
        loadParticipacoes(),
        loadTurmas(),
      ]);
    } catch (error) {
      showNotification('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSimulados = async () => {
    try {
      const response = await saebV2API.listSimulados({ status: StatusSimulado.PUBLICADO });
      setSimulados(response.data);
    } catch (error) {
      console.error('Erro ao carregar simulados:', error);
    }
  };

  const loadParticipacoes = async () => {
    try {
      const response = await saebV2API.listMinhasParticipacoes();
      setParticipacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar participações:', error);
    }
  };

  const loadTurmas = async () => {
    try {
      const response = await turmasAPI.list();
      setTurmas(response.data);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  };

  const handleLiberarSimulado = async () => {
    if (!selectedSimulado || !selectedTurmaId) {
      showNotification('Selecione um simulado e uma turma', 'warning');
      return;
    }

    try {
      const data: ParticipacaoSimuladoCreate = {
        simulado_id: selectedSimulado.id,
        turma_id: selectedTurmaId,
      };

      await saebV2API.createParticipacao(data);
      showNotification('Simulado liberado com sucesso!', 'success');
      setLiberarDialogOpen(false);
      setSelectedSimulado(null);
      setSelectedTurmaId(0);
      loadParticipacoes();
    } catch (error: any) {
      showNotification(
        error.response?.data?.detail || 'Erro ao liberar simulado',
        'error'
      );
    }
  };

  const openLiberarDialog = (simulado: SimuladoSAEB) => {
    setSelectedSimulado(simulado);
    setLiberarDialogOpen(true);
  };

  const handleViewResultados = (participacao: ParticipacaoSimulado) => {
    navigate(
      `/saeb-v2/resultados/${participacao.turma_id}/${participacao.simulado_id}`
    );
  };

  const handleGerarTokens = async (participacaoId: number) => {
    try {
      setLoadingTokens(true);
      await saebV2API.gerarTokens(participacaoId);
      showNotification('Tokens gerados com sucesso!', 'success');

      // Load and display tokens
      await handleVisualizarTokens(participacaoId);
    } catch (error: any) {
      console.error('Erro ao gerar tokens:', error);
      if (error.response?.data?.detail) {
        showNotification(error.response.data.detail, 'error');
      } else {
        showNotification('Erro ao gerar tokens', 'error');
      }
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleVisualizarTokens = async (participacaoId: number) => {
    try {
      setLoadingTokens(true);
      const response = await saebV2API.listarTokens(participacaoId);
      setTokensData(response.data);
      setTokensDialogOpen(true);
    } catch (error: any) {
      console.error('Erro ao carregar tokens:', error);
      showNotification('Erro ao carregar tokens', 'error');
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    showNotification('Token copiado!', 'success');
  };

  const handleCopyAllTokens = () => {
    if (!tokensData) return;

    const tokenList = tokensData.tokens
      .map(t => `${t.aluno_nome} (${t.aluno_matricula}): ${t.token}`)
      .join('\n');

    navigator.clipboard.writeText(tokenList);
    showNotification('Todos os tokens copiados!', 'success');
  };

  const handlePrintTokens = () => {
    if (!tokensData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('Erro ao abrir janela de impressão', 'error');
      return;
    }

    // Generate HTML for token labels/tickets
    const tokensHTML = tokensData.tokens.map((token) => `
      <div class="token-card">
        <div class="token-header">
          <div class="logo">📚</div>
          <div class="title">
            <h2>EDUCA+ Curionópolis</h2>
            <p>Simulado SAEB - Token de Acesso</p>
          </div>
        </div>
        <div class="divider"></div>
        <div class="token-info">
          <div class="info-row">
            <span class="label">Aluno:</span>
            <span class="value">${token.aluno_nome}</span>
          </div>
          <div class="info-row">
            <span class="label">Matrícula:</span>
            <span class="value">${token.aluno_matricula || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="label">Turma:</span>
            <span class="value">${tokensData.turma_nome}</span>
          </div>
          <div class="info-row">
            <span class="label">Simulado:</span>
            <span class="value">${tokensData.simulado_nome}</span>
          </div>
        </div>
        <div class="token-code">
          <div class="token-label">Seu Token de Acesso:</div>
          <div class="token-value">${token.token}</div>
        </div>
        <div class="instructions">
          <p><strong>Instruções:</strong></p>
          <p>1. Acesse: <strong>seu-site.com/saeb-acesso</strong></p>
          <p>2. Digite o token acima (6 caracteres)</p>
          <p>3. Realize o simulado online</p>
          <p><em>⚠ Não compartilhe seu token com outros alunos</em></p>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Tokens de Acesso - ${tokensData.simulado_nome}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Arial', sans-serif;
            background: white;
            padding: 10mm;
          }

          .token-card {
            width: 90mm;
            height: 130mm;
            border: 2px solid #333;
            border-radius: 8px;
            padding: 8mm;
            margin-bottom: 5mm;
            page-break-inside: avoid;
            display: inline-block;
            vertical-align: top;
            margin-right: 5mm;
            position: relative;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          }

          .token-card:nth-child(2n) {
            margin-right: 0;
          }

          .token-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }

          .logo {
            font-size: 32px;
            line-height: 1;
          }

          .title h2 {
            font-size: 16px;
            color: #1976d2;
            margin-bottom: 2px;
          }

          .title p {
            font-size: 11px;
            color: #666;
          }

          .divider {
            height: 2px;
            background: linear-gradient(to right, #1976d2, #42a5f5);
            margin: 8px 0;
          }

          .token-info {
            background: white;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 10px;
            border: 1px solid #ddd;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 11px;
          }

          .info-row:last-child {
            margin-bottom: 0;
          }

          .info-row .label {
            font-weight: bold;
            color: #555;
          }

          .info-row .value {
            color: #333;
            text-align: right;
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .token-code {
            background: #1976d2;
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            margin: 12px 0;
            border: 3px dashed white;
          }

          .token-label {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .token-value {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }

          .instructions {
            font-size: 9px;
            color: #333;
            background: #fff;
            padding: 8px;
            border-radius: 6px;
            border: 1px solid #ddd;
            line-height: 1.4;
          }

          .instructions p {
            margin-bottom: 4px;
          }

          .instructions strong {
            color: #1976d2;
          }

          .instructions em {
            color: #d32f2f;
            font-style: normal;
          }

          @media print {
            body {
              padding: 5mm;
            }

            .token-card {
              margin-bottom: 3mm;
              margin-right: 3mm;
            }

            @page {
              size: A4;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        ${tokensHTML}
      </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleImprimirSimulado = async (simuladoId: number) => {
    try {
      const response = await saebV2API.exportarSimulado(simuladoId);
      const simuladoExportado = response.data;

      // Open print dialog with simulado data
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showNotification('Erro ao abrir janela de impressão', 'error');
        return;
      }

      // Generate HTML for printing
      let questoesHTML = '';
      let numeroQuestao = 1;

      simuladoExportado.disciplinas.forEach((disc: any) => {
        questoesHTML += `
          <div class="disciplina-section">
            <h2 class="disciplina-title">${disc.disciplina === 'portugues' ? 'LÍNGUA PORTUGUESA' : 'MATEMÁTICA'}</h2>
        `;

        disc.blocos.forEach((bloco: any) => {
          questoesHTML += `<h3 class="bloco-title">Bloco ${bloco.bloco}</h3>`;

          bloco.questoes.forEach((questao: any) => {
            questoesHTML += `
              <div class="questao">
                <div class="questao-header">
                  <strong>Questão ${numeroQuestao}</strong>
                  <span class="descritor">(${questao.descritor_codigo})</span>
                </div>
                <p class="enunciado">${questao.enunciado}</p>
                <div class="alternativas">
                  <div class="alternativa">( ) A) ${questao.alternativa_a}</div>
                  <div class="alternativa">( ) B) ${questao.alternativa_b}</div>
                  <div class="alternativa">( ) C) ${questao.alternativa_c}</div>
                  <div class="alternativa">( ) D) ${questao.alternativa_d}</div>
                  <div class="alternativa">( ) E) ${questao.alternativa_e}</div>
                </div>
              </div>
            `;
            numeroQuestao++;
          });
        });

        questoesHTML += `</div>`;
      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${simuladoExportado.simulado_nome} - ${simuladoExportado.ano_escolar}º ano</title>
          <style>
            @media print {
              @page { margin: 2cm; }
              body { margin: 0; }
            }

            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 21cm;
              margin: 0 auto;
              padding: 20px;
            }

            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }

            .header h1 {
              margin: 0;
              font-size: 24px;
              text-transform: uppercase;
            }

            .header .info {
              margin-top: 10px;
              font-size: 14px;
            }

            .aluno-info {
              margin-bottom: 30px;
              padding: 15px;
              border: 1px solid #333;
              background-color: #f5f5f5;
            }

            .aluno-info strong {
              display: inline-block;
              width: 100px;
            }

            .disciplina-section {
              margin-bottom: 40px;
              page-break-before: always;
            }

            .disciplina-section:first-child {
              page-break-before: auto;
            }

            .disciplina-title {
              background-color: #333;
              color: white;
              padding: 10px;
              margin: 20px 0 10px 0;
              text-align: center;
              font-size: 18px;
            }

            .bloco-title {
              background-color: #666;
              color: white;
              padding: 8px;
              margin: 15px 0 10px 0;
              font-size: 16px;
            }

            .questao {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }

            .questao-header {
              font-size: 16px;
              margin-bottom: 10px;
            }

            .descritor {
              font-size: 12px;
              color: #666;
              font-weight: normal;
            }

            .enunciado {
              margin: 10px 0;
              text-align: justify;
            }

            .alternativas {
              margin-left: 20px;
            }

            .alternativa {
              margin: 8px 0;
              padding: 5px;
            }

            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EDUCA+ Curionópolis</h1>
            <div class="info">
              <strong>${simuladoExportado.simulado_nome}</strong><br>
              ${simuladoExportado.ano_escolar}º ano - ${simuladoExportado.ano_letivo}<br>
              Total de Questões: ${simuladoExportado.total_questoes}
            </div>
          </div>

          <div class="aluno-info">
            <div><strong>Nome:</strong> _________________________________________________</div>
            <div><strong>Matrícula:</strong> _________________________________________________</div>
            <div><strong>Data:</strong> _____/_____/_________</div>
          </div>

          ${questoesHTML}

          <div class="footer">
            Prefeitura Municipal de Curionópolis - Secretaria de Educação<br>
            Sistema EDUCA+ Curionópolis
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      // Wait a bit for content to load, then print
      setTimeout(() => {
        printWindow.print();
      }, 500);

    } catch (error: any) {
      console.error('Erro ao imprimir simulado:', error);
      showNotification('Erro ao carregar simulado para impressão', 'error');
    }
  };

  const getStatusColor = (status: StatusSimulado) => {
    switch (status) {
      case StatusSimulado.PUBLICADO:
        return 'success';
      case StatusSimulado.EM_ANDAMENTO:
        return 'info';
      case StatusSimulado.ENCERRADO:
        return 'default';
      default:
        return 'default';
    }
  };

  const getTurmaById = (turmaId: number): Turma | undefined => {
    return turmas.find((t) => t.id === turmaId);
  };

  // Filter turmas to only show 5º and 9º ano (SAEB years)
  const turmasSAEB = turmas.filter((t) => t.ano_escolar === 5 || t.ano_escolar === 9);

  // Filter simulados already released to avoid duplicates
  const getAvailableSimuladosForTurma = (turmaId: number): SimuladoSAEB[] => {
    const turma = getTurmaById(turmaId);
    if (!turma) return [];
    
    const liberadosIds = participacoes
      .filter((p) => p.turma_id === turmaId)
      .map((p) => p.simulado_id);
    
    // Filter by ano_escolar matching turma and not already released
    return simulados.filter((s) => 
      s.ano_escolar === turma.ano_escolar && !liberadosIds.includes(s.id)
    );
  };

  if (loading) {
    return (
      <MainLayout title="SAEB V2 - Professor">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="SAEB V2 - Gestão de Simulados">
      <Box sx={{ width: '100%', height: '100%' }}>
        {/* Quick Actions */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AssignmentIcon />}
            onClick={() => navigate('/saeb-v2/lancamento-manual')}
          >
            Lançamento Manual de Resultados
          </Button>
        </Box>
        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" color="primary">
                      {simulados.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Simulados Disponíveis
                    </Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {participacoes.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Simulados Liberados
                    </Typography>
                  </Box>
                  <CheckIcon sx={{ fontSize: 48, color: 'success.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {turmasSAEB.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Minhas Turmas (5º/9º ano)
                    </Typography>
                  </Box>
                  <AssessmentIcon sx={{ fontSize: 48, color: 'info.main', opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alert if professor has no 5º/9º ano classes */}
        {turmasSAEB.length === 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Você não possui turmas de 5º ou 9º ano. O SAEB é aplicado apenas para esses anos escolares.
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Simulados Disponíveis" />
            <Tab label="Simulados Liberados" />
          </Tabs>

          {/* Tab 1: Simulados Disponíveis */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Liberar Simulados para Turmas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecione um simulado publicado para liberar aos seus alunos
              </Typography>
            </Box>

            {turmasSAEB.length === 0 ? (
              <Alert severity="info">
                Você não possui turmas elegíveis para o SAEB (5º ou 9º ano).
              </Alert>
            ) : simulados.length === 0 ? (
              <Alert severity="info">
                Nenhum simulado publicado disponível para os anos escolares das suas turmas.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome do Simulado</TableCell>
                      <TableCell>Ano</TableCell>
                      <TableCell>Ano Letivo</TableCell>
                      <TableCell>Questões</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {simulados.map((sim) => (
                      <TableRow key={sim.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {sim.nome}
                          </Typography>
                          {sim.descricao && (
                            <Typography variant="caption" color="text.secondary">
                              {sim.descricao}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{sim.ano_escolar}º ano</TableCell>
                        <TableCell>{sim.ano_letivo}</TableCell>
                        <TableCell>
                          <Chip label={`${sim.total_questoes || 0} questões`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sim.status}
                            size="small"
                            color={getStatusColor(sim.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => openLiberarDialog(sim)}
                          >
                            Liberar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Tab 2: Simulados Liberados */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Simulados Liberados para suas Turmas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Visualize e acompanhe os simulados que você liberou
              </Typography>
            </Box>

            {participacoes.length === 0 ? (
              <Alert severity="info">
                Você ainda não liberou nenhum simulado para suas turmas.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Simulado</TableCell>
                      <TableCell>Turma</TableCell>
                      <TableCell>Data de Liberação</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {participacoes.map((part) => {
                      const turma = getTurmaById(part.turma_id);
                      const simulado = part.simulado;

                      return (
                        <TableRow key={part.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {simulado?.nome || `Simulado #${part.simulado_id}`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={turma?.nome || `Turma #${part.turma_id}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {part.data_liberacao
                              ? new Date(part.data_liberacao).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={part.liberado ? 'Liberado' : 'Bloqueado'}
                              size="small"
                              color={part.liberado ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<ViewIcon />}
                                onClick={() => handleViewResultados(part)}
                              >
                                Resultados
                              </Button>
                              <Button
                                variant="contained"
                                size="small"
                                color="secondary"
                                startIcon={<TokenIcon />}
                                onClick={() => handleVisualizarTokens(part.id)}
                                disabled={loadingTokens}
                              >
                                Tokens
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                color="info"
                                startIcon={<PrintIcon />}
                                onClick={() => handleImprimirSimulado(part.simulado_id)}
                              >
                                Imprimir
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Paper>
      </Box>

      {/* Liberar Simulado Dialog */}
      <Dialog
        open={liberarDialogOpen}
        onClose={() => setLiberarDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Liberar Simulado para Turma</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {selectedSimulado && (
              <Alert severity="info">
                <Typography variant="body2" fontWeight="medium">
                  {selectedSimulado.nome}
                </Typography>
                <Typography variant="caption">
                  {selectedSimulado.ano_escolar}º ano
                </Typography>
              </Alert>
            )}

            <FormControl fullWidth>
              <InputLabel>Selecione a Turma</InputLabel>
              <Select
                value={selectedTurmaId}
                label="Selecione a Turma"
                onChange={(e) => setSelectedTurmaId(Number(e.target.value))}
              >
                <MenuItem value={0} disabled>
                  -- Selecione uma turma --
                </MenuItem>
                {turmasSAEB.length === 0 ? (
                  <MenuItem disabled>
                    Você não possui turmas de 5º ou 9º ano
                  </MenuItem>
                ) : (
                  turmasSAEB.map((turma) => {
                    const availableSimulados = getAvailableSimuladosForTurma(turma.id);
                    const isAvailable = selectedSimulado
                      ? availableSimulados.some((s) => s.id === selectedSimulado.id)
                      : true;

                    return (
                      <MenuItem
                        key={turma.id}
                        value={turma.id}
                        disabled={!isAvailable}
                      >
                        {turma.nome} - {turma.ano_escolar}º ano
                        {!isAvailable && ' (Já liberado)'}
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>

            <Alert severity="warning">
              Ao liberar o simulado, todos os alunos da turma selecionada poderão realizá-lo.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLiberarDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleLiberarSimulado}
            variant="contained"
            disabled={!selectedTurmaId}
          >
            Liberar Simulado
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tokens Dialog */}
      <Dialog
        open={tokensDialogOpen}
        onClose={() => setTokensDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TokenIcon />
            Tokens de Acesso - {tokensData?.simulado_nome}
          </Box>
        </DialogTitle>
        <DialogContent>
          {tokensData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Header Info */}
              <Alert severity="info">
                <Typography variant="body2" fontWeight="medium">
                  Turma: {tokensData.turma_nome}
                </Typography>
                <Typography variant="body2">
                  Total de tokens: {tokensData.total_tokens}
                </Typography>
              </Alert>

              {/* Generate Tokens Button */}
              {tokensData.tokens.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Nenhum token foi gerado ainda para esta participação.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<TokenIcon />}
                    onClick={() => handleGerarTokens(tokensData.participacao_id)}
                    disabled={loadingTokens}
                    sx={{ mt: 2 }}
                  >
                    {loadingTokens ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        Gerando Tokens...
                      </>
                    ) : (
                      'Gerar Tokens para Todos os Alunos'
                    )}
                  </Button>
                </Box>
              ) : (
                <>
                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={handleCopyAllTokens}
                    >
                      Copiar Todos
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={handlePrintTokens}
                    >
                      Imprimir
                    </Button>
                  </Box>

                  {/* Tokens Table */}
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Aluno</TableCell>
                          <TableCell>Matrícula</TableCell>
                          <TableCell align="center">Token</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="center">Ação</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tokensData.tokens.map((token) => (
                          <TableRow key={token.id}>
                            <TableCell>{token.aluno_nome}</TableCell>
                            <TableCell>{token.aluno_matricula}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={token.token}
                                color="primary"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '1.1rem',
                                  fontWeight: 'bold',
                                  letterSpacing: '0.1rem',
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {token.usado ? (
                                <Chip
                                  label="Usado"
                                  size="small"
                                  color="success"
                                  icon={<CheckIcon />}
                                />
                              ) : token.ativo ? (
                                <Chip
                                  label="Ativo"
                                  size="small"
                                  color="info"
                                  icon={<ScheduleIcon />}
                                />
                              ) : (
                                <Chip
                                  label="Inativo"
                                  size="small"
                                  color="default"
                                />
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleCopyToken(token.token)}
                                title="Copiar token"
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Instructions */}
                  <Alert severity="success">
                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                      Como os alunos devem acessar:
                    </Typography>
                    <Typography variant="body2" component="div">
                      1. Acesse: <strong>{window.location.origin}/saeb-acesso</strong>
                      <br />
                      2. Digite o token de 6 caracteres fornecido
                      <br />
                      3. O aluno será automaticamente direcionado para o simulado
                    </Typography>
                  </Alert>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTokensDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default SAEBV2ProfessorPage;
