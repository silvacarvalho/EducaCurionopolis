/**
 * SAEB V2 - Dashboard de Métricas
 * Dashboard consolidado com métricas da rede municipal
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Popover,
} from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  CheckCircle as CheckIcon,
  EmojiEvents as TrophyIcon,
  InfoOutlined as InfoOutlinedIcon,
} from '@mui/icons-material';
import MainLayout from '../components/layout/MainLayout';
import { useNotification } from '../contexts/NotificationContext';
import { saebV2API } from '../services/api';
import { DashboardMetricas } from '../types';

const SAEBV2DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [metricas, setMetricas] = useState<DashboardMetricas | null>(null);
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  // Popover anchors
  const [anchorTop5, setAnchorTop5] = useState<HTMLElement | null>(null);
  const [anchorDistratores, setAnchorDistratores] = useState<HTMLElement | null>(null);
  const [anchorAlpha, setAnchorAlpha] = useState<HTMLElement | null>(null);
  const [anchorComparacao, setAnchorComparacao] = useState<HTMLElement | null>(null);
  const [anchorMediaDisc, setAnchorMediaDisc] = useState<HTMLElement | null>(null);

  const handleOpen = (setter: (el: HTMLElement | null) => void) => (e: React.MouseEvent<HTMLElement>) => setter(e.currentTarget);
  const handleClose = (setter: (el: HTMLElement | null) => void) => () => setter(null);

  useEffect(() => {
    loadMetricas();
  }, [anoLetivo]);

  const loadMetricas = async () => {
    try {
      setLoading(true);
      const response = await saebV2API.dashboardMetricas(anoLetivo);
      setMetricas(response.data);
    } catch (error: any) {
      const mensagem = error.response?.data?.detail || 'Erro ao carregar métricas';
      showNotification(mensagem, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard SAEB">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (!metricas) {
    return (
      <MainLayout title="Dashboard SAEB">
        <Box sx={{ width: '100%', height: '100%' }}>
          <Alert severity="error">Erro ao carregar métricas</Alert>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard SAEB - Métricas da Rede">
      <Container maxWidth="xl">
        {/* Filtro de Ano Letivo */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', m: '5px' }}>
          <Typography variant="h5">{metricas.periodo}</Typography>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Ano Letivo</InputLabel>
            <Select
              value={anoLetivo}
              label="Ano Letivo"
              onChange={(e) => setAnoLetivo(e.target.value as number)}
            >
                {Array.from({ length: 2030 - 2024 + 1 }, (_, i) => 2024 + i).map((ano) => (
                  <MenuItem key={ano} value={ano}>
                    {ano}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        {/* Métricas Principais */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'primary.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                <Typography variant="h3" color="primary.dark">
                  {metricas.total_simulados}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Simulados Aplicados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'success.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="h3" color="success.dark">
                  {metricas.total_alunos_unicos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Alunos Participantes
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'info.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                <Typography variant="h3" color="info.dark">
                  {metricas.total_participacoes}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Participações
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ height: '100%', bgcolor: 'warning.light' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />
                <Typography variant="h3" color="warning.dark">
                  {metricas.taxa_conclusao.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Taxa de Conclusão
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Média da Rede */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrophyIcon color="primary" />
            Desempenho da Rede
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h2" color="primary.main">
              {metricas.media_geral_rede.toFixed(1)}%
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Média Geral da Rede Municipal
            </Typography>
          </Box>

          {(metricas.melhor_escola || metricas.pior_escola) && (
            <Grid container spacing={3}>
              {metricas.melhor_escola && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ bgcolor: 'success.light' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TrophyIcon color="success" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Melhor Desempenho
                        </Typography>
                      </Box>
                      <Typography variant="h6">{metricas.melhor_escola.nome}</Typography>
                      <Typography variant="h4" color="success.dark">
                        {metricas.melhor_escola.media.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {metricas.pior_escola && (
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ bgcolor: 'warning.light' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SchoolIcon color="warning" />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Necessita Atenção
                        </Typography>
                      </Box>
                      <Typography variant="h6">{metricas.pior_escola.nome}</Typography>
                      <Typography variant="h4" color="warning.dark">
                        {metricas.pior_escola.media.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Paper>

        {/* Análise de Dificuldade das Questões */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Distribuição de Dificuldade das Questões
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Muito Fácil" color="success" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {metricas.questoes_muito_faceis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Fácil" color="info" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="info.main">
                    {metricas.questoes_faceis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Médio" color="default" sx={{ mb: 1 }} />
                  <Typography variant="h4">
                    {metricas.questoes_medias}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Difícil" color="warning" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="warning.main">
                    {metricas.questoes_dificeis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Chip label="Muito Difícil" color="error" sx={{ mb: 1 }} />
                  <Typography variant="h4" color="error.main">
                    {metricas.questoes_muito_dificeis}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    questões
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              Uma boa distribuição de dificuldade deve ter mais questões de nível médio, com questões fáceis e difíceis equilibradas nas extremidades.
            </Typography>
          </Alert>
        </Paper>

        {/* Indicadores Relevantes */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Indicadores Relevantes
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={2}>
            {/* Média por Disciplina */}
            <Grid item xs={12} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Média por Disciplina
                  </Typography>
                  <IconButton size="small" onClick={handleOpen(setAnchorMediaDisc)} sx={{ position: 'absolute', right: 16, top: 16 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                  <Popover
                    open={Boolean(anchorMediaDisc)}
                    anchorEl={anchorMediaDisc}
                    onClose={handleClose(setAnchorMediaDisc)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 2, maxWidth: 320 }}>
                      <Typography variant="subtitle2">Média por Disciplina</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Média dos índices de dificuldade (ID) das questões por disciplina. ID = (acertos/total) × 100.
                      </Typography>
                    </Box>
                  </Popover>
                  <Typography variant="h6">Português</Typography>
                  <Typography variant="h4" color="info.main">
                    {metricas.media_por_disciplina?.portugues?.toFixed(1) ?? '-'}%
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6">Matemática</Typography>
                  <Typography variant="h4" color="warning.main">
                    {metricas.media_por_disciplina?.matematica?.toFixed(1) ?? '-'}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Top 5 Questões Problemáticas */}
            <Grid item xs={12} md={3}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent sx={{ position: 'relative' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Top 5 Questões Problemáticas
                  </Typography>
                  <IconButton size="small" onClick={handleOpen(setAnchorTop5)} sx={{ position: 'absolute', right: 16, top: 16 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                  <Popover
                    open={Boolean(anchorTop5)}
                    anchorEl={anchorTop5}
                    onClose={handleClose(setAnchorTop5)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 2, maxWidth: 360 }}>
                      <Typography variant="subtitle2">Top 5 Questões Problemáticas</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Lista de questões com menor índice de dificuldade (mais difíceis para os alunos). Útil para priorizar revisões pedagógicas.
                      </Typography>
                    </Box>
                  </Popover>
                  {metricas.top_5_questoes_problematicas && metricas.top_5_questoes_problematicas.length > 0 ? (
                    metricas.top_5_questoes_problematicas.map((q, idx) => (
                      <Box key={idx} sx={{ mb: 1 }}>
                        <Typography variant="body2" noWrap>
                          {idx + 1}. {q.enunciado}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Dificuldade: {q.indice_dificuldade?.toFixed(1) ?? '-'}% • Disc: {q.indice_discriminacao ?? '-'}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">Nenhuma questão problemática identificada.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Percentual de questoes com 3+ distratores eficazes */}
            <Grid item xs={12} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Distratores Eficazes (≥3)
                  </Typography>
                  <IconButton size="small" onClick={handleOpen(setAnchorDistratores)} sx={{ position: 'absolute', right: 16, top: 16 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                  <Popover
                    open={Boolean(anchorDistratores)}
                    anchorEl={anchorDistratores}
                    onClose={handleClose(setAnchorDistratores)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 2, maxWidth: 380 }}>
                      <Typography variant="subtitle2">Distratores eficazes</Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Distratores são as alternativas incorretas de uma questão. Um distrator é considerado eficaz quando atrai uma proporção significativa de respostas (padrão usado: ≥ 5% do total de respostas para a questão).
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        O indicador mostra a porcentagem de questões que possuem 3 ou mais distratores eficazes — sinal de qualidade das alternativas (mais opções plausíveis).
                      </Typography>
                    </Box>
                  </Popover>
                  <Typography variant="h3" color="primary.main">
                    {metricas.percentual_questoes_distratores_eficazes?.toFixed(1) ?? '0.0'}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">% das questões</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Alpha de Cronbach */}
            <Grid item xs={12} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Alpha de Cronbach
                  </Typography>
                  <IconButton size="small" onClick={handleOpen(setAnchorAlpha)} sx={{ position: 'absolute', right: 16, top: 16 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                  <Popover
                    open={Boolean(anchorAlpha)}
                    anchorEl={anchorAlpha}
                    onClose={handleClose(setAnchorAlpha)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 2, maxWidth: 380 }}>
                      <Typography variant="subtitle2">Alpha de Cronbach</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Coeficiente que mede a consistência interna do conjunto de itens (0-1). Valores mais altos indicam maior confiabilidade do teste.
                      </Typography>
                    </Box>
                  </Popover>
                  <Typography variant="h3" color="success.main">
                    {metricas.alpha_cronbach_rede?.toFixed(3) ?? '0.000'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Consistência interna</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Comparação com ano anterior */}
            <Grid item xs={12} md={2}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', position: 'relative' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Variação vs Ano Anterior
                  </Typography>
                  <IconButton size="small" onClick={handleOpen(setAnchorComparacao)} sx={{ position: 'absolute', right: 16, top: 16 }}>
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                  <Popover
                    open={Boolean(anchorComparacao)}
                    anchorEl={anchorComparacao}
                    onClose={handleClose(setAnchorComparacao)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  >
                    <Box sx={{ p: 2, maxWidth: 360 }}>
                      <Typography variant="subtitle2">Comparação com Ano Anterior</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Mostra a média da rede no ano anterior e a diferença (delta) em pontos percentuais em relação ao ano selecionado.
                      </Typography>
                    </Box>
                  </Popover>
                  <Typography variant="h6">Ano anterior</Typography>
                  <Typography variant="h4" color="primary.main">
                    {metricas.comparacao_periodos?.ano_anterior_media?.toFixed(1) ?? '-'}%
                  </Typography>
                  {
                    (() => {
                      const delta = metricas.comparacao_periodos?.delta_versus_ano_anterior ?? 0;
                      return (
                        <Typography variant="caption" color={delta >= 0 ? 'success.main' : 'error.main'}>
                          {delta >= 0 ? '+' : ''}{delta}%
                        </Typography>
                      );
                    })()
                  }
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>

        {/* Sugestões e Exemplos: como usar estas métricas na prática */}
        <Paper sx={{ p: 3, mt: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Sugestões e Exemplos — Como usar estas métricas
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">Sugestões práticas (passo a passo)</Typography>
              <Box component="div" sx={{ mt: 1 }}>
                <Typography variant="body2" paragraph>
                  1) Filtrar por disciplina/turma e ordenar as questões pelo menor índice de dificuldade e menor discriminação. Priorize as 10% piores questões para revisão inicial.
                </Typography>
                <Typography variant="body2" paragraph>
                  2) Para cada questão priorizada, abra a análise de distratores: anote as três alternativas mais escolhidas e verifique se indicam conceitos errados específicos. Se 1–2 distratores correspondem a erro conceitual comum, prepare uma atividade formativa sobre esse conceito.
                </Typography>
                <Typography variant="body2" paragraph>
                  3) Reescrever alternativas (quando necessário): torne os distratores plausíveis evitando pistas no enunciado; exemplo prático — substituir alternativas muito óbvias por opções que reflitam erros conceituais reais observados nas respostas.
                </Typography>
                <Typography variant="body2" paragraph>
                  4) Alpha baixo (ex.: &lt;0.65): calcule correlação item-total e elimine/reequipe itens com correlação &lt; 0.20. Antes de excluir, valide com professores e teste em uma aplicação formativa.
                </Typography>
                <Typography variant="body2" paragraph>
                  5) Plano de ação rápido (timeline 2–4 semanas): semana 1 — revisão de enunciados e distratores (com equipe pedagógica); semana 2 — aplicação formativa com itens revisados; semanas 3–4 — análise dos resultados e formação docente focalizada nos descritores problemáticos.
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">Exemplos rápidos</Typography>
              <Box component="div" sx={{ mt: 1 }}>
                <Typography variant="body2" paragraph>
                  • Exemplo 1 — Alpha baixo (0.55): revise itens com baixa correlação item-total; aplique uma sessão de revisão com professores para reformular enunciados confusos.
                </Typography>
                <Typography variant="body2" paragraph>
                  • Exemplo 2 — Muitos distratores eficazes (≥3): excelentes alternativas plausíveis — use para criar atividades formativas destacando os erros conceituais mais comuns.
                </Typography>
                <Typography variant="body2" paragraph>
                  • Exemplo 3 — Top 5 problemáticas: selecione 2–3 questões dessas para rede/curso de formação e desenvolva planos de recuperação focados nos descritores relacionados.
                </Typography>
                <Typography variant="body2" paragraph>
                  • Dica operacional: para cada questão problemática, registre o descritor, % de acerto e distratores mais escolhidos — isso orienta intervenções didáticas concretas.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default SAEBV2DashboardPage;
