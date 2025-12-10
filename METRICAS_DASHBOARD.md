Métricas do Dashboard SAEB V2

Este documento descreve todas as métricas exibidas no Dashboard SAEB após a implementação das métricas avançadas.

1) Período
- `periodo`: rótulo do período (ex: "Ano Letivo 2025").

2) Visão Geral
- `total_simulados`: Número total de simulados aplicados no período.
- `total_participacoes`: Número total de participações finalizadas (resultados calculados).
- `total_alunos_unicos`: Número de alunos distintos que participaram.
- `taxa_conclusao`: Percentual de participações finalizadas sobre participações registradas.

3) Desempenho
- `media_geral_rede`: Média de acertos (%), calculada a partir dos resultados finalizados.
- `melhor_escola` / `pior_escola`: Objetos com `nome` e `media` (média por escola).

4) Análise de Dificuldade
- `questoes_muito_faceis`, `questoes_faceis`, `questoes_medias`, `questoes_dificeis`, `questoes_muito_dificeis`:
  - Classificação baseada no Índice de Dificuldade (ID = Acertos / Total * 100) com faixas:
    - Muito fácil: > 85%
    - Fácil: 65% - 85%
    - Médio: 35% - 65%
    - Difícil: 15% - 35%
    - Muito difícil: < 15%

5) Indicadores Avançados (implementados)
- `media_por_disciplina`: Médias de índice de dificuldade por disciplina (Português e Matemática).
  - Cálculo: média dos `indice_dificuldade` das questões pertencentes à disciplina.

- `top_5_questoes_problematicas`: Lista das 5 questões com menor índice de dificuldade (e em caso de empate, pior índice de discriminação).
  - Campos: `simulado_id`, `simulado_nome`, `questao_id`, `enunciado`, `indice_dificuldade`, `indice_discriminacao`, `distratores_eficazes`.
  - Uso: identificar itens que mais prejudicam o desempenho.

- `percentual_questoes_distratores_eficazes`: Percentual de questões que possuem 3 ou mais distratores eficazes (eficácia >= 5% das respostas).
  - Cálculo: (qtd_questoes_com_>=3_distratores / total_questoes_consideradas) * 100

- `alpha_cronbach_rede`: Alpha de Cronbach médio ponderado por simulado (indicador de consistência interna dos testes).
  - Cálculo: Alpha calculado por simulado (quando há >= 5 participantes) e ponderado pelo número de participantes.
  - Interpretação (DeVellis, 2017):
    - α ≥ 0.90: Excelente
    - 0.80 ≤ α < 0.90: Bom
    - 0.70 ≤ α < 0.80: Aceitável
    - 0.60 ≤ α < 0.70: Questionável
    - α < 0.60: Inaceitável

- `mapa_descritores`: Lista agregada por descritor com `descritor_codigo`, `media_dificuldade` e `total_questoes`.
  - Uso: identificar descritores com maior dificuldade média.

- `comparacao_periodos`: Comparação entre a média da rede no período atual e no ano anterior.
  - Campos: `ano_anterior_media`, `delta_versus_ano_anterior` (diferença em pontos percentuais).

6) Evolução Mensal (mantido para histórico)
- `evolucao_mensal`: Lista com os últimos 6 meses contendo `{ mes, media, total_participacoes }`.
  - Observação: mesmo que o simulado não seja aplicado mensalmente, esse histórico mostra médias por mês com base nas participações registradas.

7) Notas sobre implementação
- As métricas avançadas reutilizam funções em `backend/app/utils/psicometria.py`:
  - `calcular_indice_dificuldade`, `calcular_indice_discriminacao`, `analisar_distratores`, `calcular_alpha_cronbach`, etc.
- Algumas métricas (ex: Alpha de Cronbach) exigem um número mínimo de participantes por simulado (>= 5) para cálculo confiável.
- As métricas são retornadas pelo endpoint `GET /saeb-v2/dashboard/metricas?ano_letivo=YYYY`.

8) Próximos passos e melhorias possíveis
- Adicionar cache para o endpoint `dashboard/metricas` (para reduzir custo de agregações pesadas).
- Indexar colunas usadas em filtros (ex: `ResultadoSimuladoAluno.created_at`, `simulado_id`) para melhorar performance.
- Adicionar página/relatório detalhado para `top_5_questoes_problematicas` com links para edição das questões.

--
Documento gerado automaticamente pelo assistente.