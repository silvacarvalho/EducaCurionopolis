"""
Utilitários para análise psicométrica de questões e simulados
Implementa cálculos de TCT (Teoria Clássica dos Testes)
"""
from typing import List, Dict, Tuple
import statistics
import math


def calcular_indice_dificuldade(total_acertos: int, total_respostas: int) -> Tuple[float, str]:
    """
    Calcula o Índice de Dificuldade (ID) de uma questão

    ID = (Acertos / Total) * 100

    Classificação (Pasquali, 2003):
    - Muito fácil: > 85%
    - Fácil: 65% - 85%
    - Médio: 35% - 65%
    - Difícil: 15% - 35%
    - Muito difícil: < 15%

    Returns:
        Tuple[float, str]: (índice, classificação)
    """
    if total_respostas == 0:
        return 0.0, "Sem dados"

    indice = (total_acertos / total_respostas) * 100

    if indice > 85:
        classificacao = "Muito fácil"
    elif indice >= 65:
        classificacao = "Fácil"
    elif indice >= 35:
        classificacao = "Médio"
    elif indice >= 15:
        classificacao = "Difícil"
    else:
        classificacao = "Muito difícil"

    return round(indice, 2), classificacao


def calcular_indice_discriminacao(
    acertos_grupo_superior: int,
    acertos_grupo_inferior: int,
    tamanho_grupo: int
) -> Tuple[float, str]:
    """
    Calcula o Índice de Discriminação (ID) de uma questão

    ID = (Acertos_Superior - Acertos_Inferior) / Tamanho_Grupo

    Grupos: 27% superiores e 27% inferiores (critério de Kelley)

    Classificação (Ebel & Frisbie, 1991):
    - Excelente: >= 0.40
    - Bom: 0.30 - 0.39
    - Regular: 0.20 - 0.29
    - Fraco: 0.10 - 0.19
    - Muito fraco: < 0.10
    - Negativo: < 0 (questão problemática)

    Returns:
        Tuple[float, str]: (índice, classificação)
    """
    if tamanho_grupo == 0:
        return 0.0, "Sem dados"

    indice = (acertos_grupo_superior - acertos_grupo_inferior) / tamanho_grupo

    if indice < 0:
        classificacao = "Negativo (revisar)"
    elif indice < 0.10:
        classificacao = "Muito fraco"
    elif indice < 0.20:
        classificacao = "Fraco"
    elif indice < 0.30:
        classificacao = "Regular"
    elif indice < 0.40:
        classificacao = "Bom"
    else:
        classificacao = "Excelente"

    return round(indice, 3), classificacao


def analisar_distratores(
    distribuicao: Dict[str, int],
    alternativa_correta: str,
    total_respostas: int,
    limiar_eficacia: float = 0.05
) -> List[str]:
    """
    Analisa a eficácia dos distratores (alternativas incorretas)

    Um distrator é considerado eficaz se atrair pelo menos 5% das respostas
    (pode ser ajustado via limiar_eficacia)

    Args:
        distribuicao: Dicionário com contagem de respostas por alternativa
        alternativa_correta: Letra da alternativa correta
        total_respostas: Total de respostas à questão
        limiar_eficacia: Percentual mínimo para considerar distrator eficaz

    Returns:
        Lista de distratores eficazes
    """
    if total_respostas == 0:
        return []

    distratores_eficazes = []

    for alternativa, count in distribuicao.items():
        if alternativa != alternativa_correta:
            percentual = count / total_respostas
            if percentual >= limiar_eficacia:
                distratores_eficazes.append(alternativa)

    return distratores_eficazes


def calcular_alpha_cronbach(matriz_respostas: List[List[int]]) -> float:
    """
    Calcula o coeficiente Alpha de Cronbach
    Mede a consistência interna do teste (confiabilidade)

    α = (k / (k-1)) * (1 - (Σσ²i / σ²t))

    Onde:
    k = número de itens
    σ²i = variância de cada item
    σ²t = variância total dos escores

    Interpretação (DeVellis, 2017):
    - α ≥ 0.90: Excelente
    - 0.80 ≤ α < 0.90: Bom
    - 0.70 ≤ α < 0.80: Aceitável
    - 0.60 ≤ α < 0.70: Questionável
    - α < 0.60: Inaceitável

    Args:
        matriz_respostas: Matriz onde cada linha é um aluno e cada coluna é uma questão
                         Valores: 1 (acerto) ou 0 (erro)

    Returns:
        float: Coeficiente Alpha de Cronbach (0-1)
    """
    if not matriz_respostas or len(matriz_respostas) < 2:
        return 0.0

    k = len(matriz_respostas[0])  # Número de itens
    if k < 2:
        return 0.0

    # Calcular variância de cada item
    variancias_itens = []
    for j in range(k):
        coluna = [linha[j] for linha in matriz_respostas]
        if len(set(coluna)) > 1:  # Só calcular se há variação
            variancias_itens.append(statistics.variance(coluna))
        else:
            variancias_itens.append(0)

    soma_variancias_itens = sum(variancias_itens)

    # Calcular escores totais de cada aluno
    escores_totais = [sum(linha) for linha in matriz_respostas]

    # Calcular variância total
    if len(set(escores_totais)) > 1:
        variancia_total = statistics.variance(escores_totais)
    else:
        return 1.0  # Todos com mesmo escore

    if variancia_total == 0:
        return 0.0

    # Calcular Alpha de Cronbach
    alpha = (k / (k - 1)) * (1 - (soma_variancias_itens / variancia_total))

    return round(max(0, min(1, alpha)), 3)  # Limitar entre 0 e 1


def calcular_estatisticas_basicas(notas: List[float]) -> Dict:
    """
    Calcula estatísticas descritivas básicas

    Args:
        notas: Lista de notas/escores

    Returns:
        Dict com média, mediana, desvio padrão, mínimo e máximo
    """
    if not notas:
        return {
            "media": 0.0,
            "mediana": 0.0,
            "desvio_padrao": 0.0,
            "minimo": 0.0,
            "maximo": 0.0
        }

    return {
        "media": round(statistics.mean(notas), 2),
        "mediana": round(statistics.median(notas), 2),
        "desvio_padrao": round(statistics.stdev(notas), 2) if len(notas) > 1 else 0.0,
        "minimo": round(min(notas), 2),
        "maximo": round(max(notas), 2)
    }


def criar_histograma(notas: List[float], num_bins: int = 10) -> Dict[str, int]:
    """
    Cria um histograma de distribuição de notas

    Args:
        notas: Lista de notas (0-100)
        num_bins: Número de intervalos

    Returns:
        Dicionário com contagem por faixa
    """
    if not notas:
        return {}

    minimo = min(notas)
    maximo = max(notas)

    if minimo == maximo:
        return {f"{minimo:.1f}": len(notas)}

    tamanho_bin = (maximo - minimo) / num_bins
    histograma = {}

    for i in range(num_bins):
        inicio = minimo + (i * tamanho_bin)
        fim = inicio + tamanho_bin

        if i == num_bins - 1:  # Último bin inclui o máximo
            count = sum(1 for n in notas if inicio <= n <= fim)
        else:
            count = sum(1 for n in notas if inicio <= n < fim)

        label = f"{inicio:.1f}-{fim:.1f}"
        histograma[label] = count

    return histograma


def separar_grupos_extremos(
    respostas_questao: List[Tuple[int, int]],  # [(aluno_id, acertou)]
    escores_totais: Dict[int, float],  # {aluno_id: escore_total}
    percentil: float = 0.27
) -> Tuple[List[int], List[int]]:
    """
    Separa grupos superior e inferior para cálculo de discriminação

    Método de Kelley (1939): usar 27% superiores e 27% inferiores

    Args:
        respostas_questao: Lista de tuplas (aluno_id, acertou)
        escores_totais: Dicionário com escore total de cada aluno
        percentil: Percentual para definir grupos (padrão: 0.27)

    Returns:
        Tuple[acertos_superior, acertos_inferior]
    """
    # Ordenar alunos por escore total
    alunos_ordenados = sorted(
        [(aluno_id, escores_totais.get(aluno_id, 0)) for aluno_id, _ in respostas_questao],
        key=lambda x: x[1],
        reverse=True
    )

    n = len(alunos_ordenados)
    tamanho_grupo = max(1, int(n * percentil))

    # IDs dos grupos superior e inferior
    ids_superior = {aluno_id for aluno_id, _ in alunos_ordenados[:tamanho_grupo]}
    ids_inferior = {aluno_id for aluno_id, _ in alunos_ordenados[-tamanho_grupo:]}

    # Contar acertos em cada grupo
    acertos_superior = sum(1 for aluno_id, acertou in respostas_questao
                          if aluno_id in ids_superior and acertou == 1)
    acertos_inferior = sum(1 for aluno_id, acertou in respostas_questao
                          if aluno_id in ids_inferior and acertou == 1)

    return acertos_superior, acertos_inferior


def classificar_alpha_cronbach(alpha: float) -> str:
    """
    Classifica o coeficiente Alpha de Cronbach

    Args:
        alpha: Valor do Alpha (0-1)

    Returns:
        Classificação textual
    """
    if alpha >= 0.90:
        return "Excelente"
    elif alpha >= 0.80:
        return "Bom"
    elif alpha >= 0.70:
        return "Aceitável"
    elif alpha >= 0.60:
        return "Questionável"
    else:
        return "Inaceitável"
