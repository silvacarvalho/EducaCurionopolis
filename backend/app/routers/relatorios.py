"""
Reports Router
Data visualization and drill-down reports
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Dict, Any

from ..database import get_db
from ..models import (
    AvaliacaoBimestral, AvaliacaoAgregada, DiagnosticoResultado, ResultadoSAEB,
    Escola, Turma, Aluno, Disciplina, Usuario, PerfilUsuario,
    NivelDesempenho, NivelEvolucao, Bimestre
)
from ..schemas import (
    FiltroRelatorio,
    RelatorioAvaliacaoGeral,
    RelatorioDiagnosticoGeral,
    RelatorioSAEBGeral,
    DrillDownData
)
from ..auth import get_current_active_user

router = APIRouter()


def apply_filters_escola(query, current_user: Usuario, escola_id: int = None):
    """Apply escola filter based on user permissions"""
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            return query, current_user.escola_dirigida.id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Diretor sem escola vinculada"
            )
    elif current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
        return query, escola_id
    elif current_user.perfil == PerfilUsuario.COMUNIDADE:
        # Community sees only aggregated data, no filtering
        return query, None

    return query, escola_id


# ============================================
# AVALIAÇÃO REPORTS
# ============================================

@router.get("/avaliacoes/geral", response_model=RelatorioAvaliacaoGeral)
async def relatorio_avaliacao_geral(
    escola_id: int = None,
    turma_id: int = None,
    disciplina_id: int = None,
    ano_letivo: int = None,
    bimestre: Bimestre = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    General evaluation report with performance distribution
    """
    query = db.query(AvaliacaoBimestral)

    # Apply permission filters
    _, filtered_escola_id = apply_filters_escola(query, current_user, escola_id)
    if filtered_escola_id:
        query = query.join(Aluno).join(Turma).filter(Turma.escola_id == filtered_escola_id)

    # Apply other filters
    if turma_id:
        query = query.join(Aluno).filter(Aluno.turma_id == turma_id)
    if disciplina_id:
        query = query.filter(AvaliacaoBimestral.disciplina_id == disciplina_id)
    if ano_letivo:
        query = query.filter(AvaliacaoBimestral.ano_letivo == ano_letivo)
    if bimestre:
        query = query.filter(AvaliacaoBimestral.bimestre == bimestre)

    # Count by performance level
    total = query.count()

    if total == 0:
        return RelatorioAvaliacaoGeral(
            total_alunos=0,
            abaixo_media=0,
            na_media=0,
            acima_media=0,
            percentual_abaixo=0.0,
            percentual_na=0.0,
            percentual_acima=0.0
        )

    abaixo = query.filter(AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ABAIXO_MEDIA).count()
    na = query.filter(AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.NA_MEDIA).count()
    acima = query.filter(AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ACIMA_MEDIA).count()

    return RelatorioAvaliacaoGeral(
        total_alunos=total,
        abaixo_media=abaixo,
        na_media=na,
        acima_media=acima,
        percentual_abaixo=round((abaixo / total) * 100, 2),
        percentual_na=round((na / total) * 100, 2),
        percentual_acima=round((acima / total) * 100, 2)
    )


@router.get("/avaliacoes/drill-down/escolas")
async def avaliacoes_drill_down_escolas(
    ano_letivo: int = None,
    bimestre: Bimestre = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Drill-down by schools
    Returns performance distribution per school
    """
    if current_user.perfil == PerfilUsuario.COMUNIDADE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil Comunidade não tem acesso a dados detalhados"
        )

    # Query avaliacoes grouped by escola
    query = db.query(
        Escola.id,
        Escola.nome,
        func.count(AvaliacaoBimestral.id).label('total'),
        func.sum(case((AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ABAIXO_MEDIA, 1), else_=0)).label('abaixo'),
        func.sum(case((AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.NA_MEDIA, 1), else_=0)).label('na_media'),
        func.sum(case((AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ACIMA_MEDIA, 1), else_=0)).label('acima')
    ).join(Aluno, AvaliacaoBimestral.aluno_id == Aluno.id)\
     .join(Turma, Aluno.turma_id == Turma.id)\
     .join(Escola, Turma.escola_id == Escola.id)

    # Apply filters
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Escola.id == current_user.escola_dirigida.id)

    if ano_letivo:
        query = query.filter(AvaliacaoBimestral.ano_letivo == ano_letivo)
    if bimestre:
        query = query.filter(AvaliacaoBimestral.bimestre == bimestre)

    query = query.group_by(Escola.id, Escola.nome)

    results = query.all()

    drill_down_data = []
    for result in results:
        total = result.total or 0
        drill_down_data.append({
            "escola_id": result.id,
            "label": result.nome,
            "value": total,
            "abaixo_media": result.abaixo or 0,
            "na_media": result.na_media or 0,
            "acima_media": result.acima or 0,
            "percentual_abaixo": round((result.abaixo or 0) / total * 100, 2) if total > 0 else 0,
            "percentual_na": round((result.na_media or 0) / total * 100, 2) if total > 0 else 0,
            "percentual_acima": round((result.acima or 0) / total * 100, 2) if total > 0 else 0
        })

    return drill_down_data


@router.get("/avaliacoes/drill-down/turmas/{escola_id}")
async def avaliacoes_drill_down_turmas(
    escola_id: int,
    ano_letivo: int = None,
    bimestre: Bimestre = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Drill-down by classes within a school
    """
    # Verify escola access
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or current_user.escola_dirigida.id != escola_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta escola"
            )

    query = db.query(
        Turma.id,
        Turma.nome,
        func.count(AvaliacaoBimestral.id).label('total'),
        func.sum(case((AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ABAIXO_MEDIA, 1), else_=0)).label('abaixo'),
        func.sum(case((AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.NA_MEDIA, 1), else_=0)).label('na_media'),
        func.sum(case((AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ACIMA_MEDIA, 1), else_=0)).label('acima')
    ).join(Aluno, AvaliacaoBimestral.aluno_id == Aluno.id)\
     .join(Turma, Aluno.turma_id == Turma.id)\
     .filter(Turma.escola_id == escola_id)

    if ano_letivo:
        query = query.filter(AvaliacaoBimestral.ano_letivo == ano_letivo)
    if bimestre:
        query = query.filter(AvaliacaoBimestral.bimestre == bimestre)

    query = query.group_by(Turma.id, Turma.nome)

    results = query.all()

    drill_down_data = []
    for result in results:
        total = result.total or 0
        drill_down_data.append({
            "turma_id": result.id,
            "label": result.nome,
            "value": total,
            "abaixo_media": result.abaixo or 0,
            "na_media": result.na_media or 0,
            "acima_media": result.acima or 0,
            "percentual_abaixo": round((result.abaixo or 0) / total * 100, 2) if total > 0 else 0,
            "percentual_na": round((result.na_media or 0) / total * 100, 2) if total > 0 else 0,
            "percentual_acima": round((result.acima or 0) / total * 100, 2) if total > 0 else 0
        })

    return drill_down_data


# ============================================
# DIAGNÓSTICO REPORTS
# ============================================

@router.get("/diagnosticos/geral", response_model=RelatorioDiagnosticoGeral)
async def relatorio_diagnostico_geral(
    diagnostico_id: int = None,
    escola_id: int = None,
    turma_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """General diagnostic report"""
    query = db.query(DiagnosticoResultado)

    # Apply permission filters
    _, filtered_escola_id = apply_filters_escola(query, current_user, escola_id)
    if filtered_escola_id:
        query = query.join(Aluno).join(Turma).filter(Turma.escola_id == filtered_escola_id)

    if diagnostico_id:
        query = query.filter(DiagnosticoResultado.diagnostico_id == diagnostico_id)
    if turma_id:
        query = query.join(Aluno).filter(Aluno.turma_id == turma_id)

    total = query.count()

    if total == 0:
        return RelatorioDiagnosticoGeral(
            total_alunos=0,
            nao=0,
            sim=0,
            em_partes=0,
            percentual_nao=0.0,
            percentual_sim=0.0,
            percentual_em_partes=0.0
        )

    nao = query.filter(DiagnosticoResultado.nivel_evolucao == NivelEvolucao.NAO).count()
    sim = query.filter(DiagnosticoResultado.nivel_evolucao == NivelEvolucao.SIM).count()
    em_partes = query.filter(DiagnosticoResultado.nivel_evolucao == NivelEvolucao.EM_PARTES).count()

    return RelatorioDiagnosticoGeral(
        total_alunos=total,
        nao=nao,
        sim=sim,
        em_partes=em_partes,
        percentual_nao=round((nao / total) * 100, 2),
        percentual_sim=round((sim / total) * 100, 2),
        percentual_em_partes=round((em_partes / total) * 100, 2)
    )


# ============================================
# SAEB REPORTS
# ============================================

@router.get("/saeb/geral", response_model=RelatorioSAEBGeral)
async def relatorio_saeb_geral(
    prova_id: int = None,
    escola_id: int = None,
    turma_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """General SAEB report"""
    query = db.query(ResultadoSAEB)

    # Apply permission filters
    _, filtered_escola_id = apply_filters_escola(query, current_user, escola_id)
    if filtered_escola_id:
        query = query.join(Aluno).join(Turma).filter(Turma.escola_id == filtered_escola_id)

    if prova_id:
        query = query.filter(ResultadoSAEB.prova_id == prova_id)
    if turma_id:
        query = query.join(Aluno).filter(Aluno.turma_id == turma_id)

    total = query.count()

    if total == 0:
        return RelatorioSAEBGeral(
            total_alunos=0,
            presentes=0,
            ausentes=0,
            media_portugues=None,
            media_matematica=None
        )

    presentes = query.filter(ResultadoSAEB.presente == True).count()
    ausentes = total - presentes

    # Calculate averages (only for present students)
    resultados_presentes = query.filter(ResultadoSAEB.presente == True).all()

    notas_portugues = [r.nota_portugues for r in resultados_presentes if r.nota_portugues is not None]
    notas_matematica = [r.nota_matematica for r in resultados_presentes if r.nota_matematica is not None]

    media_portugues = round(sum(notas_portugues) / len(notas_portugues), 2) if notas_portugues else None
    media_matematica = round(sum(notas_matematica) / len(notas_matematica), 2) if notas_matematica else None

    return RelatorioSAEBGeral(
        total_alunos=total,
        presentes=presentes,
        ausentes=ausentes,
        media_portugues=media_portugues,
        media_matematica=media_matematica
    )


# ============================================
# COMMUNITY PUBLIC REPORTS (Aggregated only)
# ============================================

@router.get("/publico/avaliacoes")
async def relatorio_publico_avaliacoes(
    ano_letivo: int = None,
    db: Session = Depends(get_db)
):
    """
    Public evaluation report (no identifying details)
    Accessible by COMUNIDADE profile
    """
    query = db.query(AvaliacaoBimestral)

    if ano_letivo:
        query = query.filter(AvaliacaoBimestral.ano_letivo == ano_letivo)

    total = query.count()

    if total == 0:
        return {
            "total_avaliacoes": 0,
            "distribuicao": {
                "abaixo_media": 0,
                "na_media": 0,
                "acima_media": 0
            }
        }

    abaixo = query.filter(AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ABAIXO_MEDIA).count()
    na = query.filter(AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.NA_MEDIA).count()
    acima = query.filter(AvaliacaoBimestral.nivel_desempenho == NivelDesempenho.ACIMA_MEDIA).count()

    return {
        "total_avaliacoes": total,
        "distribuicao": {
            "abaixo_media": abaixo,
            "na_media": na,
            "acima_media": acima
        },
        "percentuais": {
            "abaixo_media": round((abaixo / total) * 100, 2),
            "na_media": round((na / total) * 100, 2),
            "acima_media": round((acima / total) * 100, 2)
        }
    }


@router.get("/publico/diagnosticos")
async def relatorio_publico_diagnosticos(
    ano_letivo: int = None,
    db: Session = Depends(get_db)
):
    """Public diagnostic report (aggregated only)"""
    from ..models import Diagnostico

    query = db.query(DiagnosticoResultado)

    if ano_letivo:
        query = query.join(Diagnostico).filter(Diagnostico.ano_letivo == ano_letivo)

    total = query.count()

    if total == 0:
        return {
            "total_diagnosticos": 0,
            "distribuicao": {
                "nao": 0,
                "sim": 0,
                "em_partes": 0
            }
        }

    nao = query.filter(DiagnosticoResultado.nivel_evolucao == NivelEvolucao.NAO).count()
    sim = query.filter(DiagnosticoResultado.nivel_evolucao == NivelEvolucao.SIM).count()
    em_partes = query.filter(DiagnosticoResultado.nivel_evolucao == NivelEvolucao.EM_PARTES).count()

    return {
        "total_diagnosticos": total,
        "distribuicao": {
            "nao": nao,
            "sim": sim,
            "em_partes": em_partes
        },
        "percentuais": {
            "nao": round((nao / total) * 100, 2),
            "sim": round((sim / total) * 100, 2),
            "em_partes": round((em_partes / total) * 100, 2)
        }
    }


# ============================================
# AVALIAÇÃO AGREGADA REPORTS
# ============================================

@router.get("/avaliacoes-agregadas/geral", response_model=RelatorioAvaliacaoGeral)
async def relatorio_avaliacao_agregada_geral(
    escola_id: int = None,
    turma_id: int = None,
    disciplina_id: int = None,
    disciplina_nome: str = None,
    ano_letivo: int = None,
    bimestre: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    General evaluation report from aggregated data
    Uses AvaliacaoAgregada table
    """
    query = db.query(AvaliacaoAgregada)

    # Apply permission filters
    _, filtered_escola_id = apply_filters_escola(query, current_user, escola_id)
    if filtered_escola_id:
        query = query.join(Turma).filter(Turma.escola_id == filtered_escola_id)

    # Apply other filters
    if turma_id:
        query = query.filter(AvaliacaoAgregada.turma_id == turma_id)
    if disciplina_id:
        query = query.filter(AvaliacaoAgregada.disciplina_id == disciplina_id)
    # Support filtering by discipline name across turmas
    if disciplina_nome:
        # join Disciplina to filter by name
        query = query.join(Disciplina, AvaliacaoAgregada.disciplina).filter(Disciplina.nome == disciplina_nome)
    if ano_letivo:
        query = query.filter(AvaliacaoAgregada.ano_letivo == ano_letivo)
    if bimestre:
        query = query.filter(AvaliacaoAgregada.bimestre == bimestre)

    # Sum quantities from aggregated evaluations
    results = query.all()

    if not results:
        return RelatorioAvaliacaoGeral(
            total_alunos=0,
            abaixo_media=0,
            na_media=0,
            acima_media=0,
            percentual_abaixo=0.0,
            percentual_na=0.0,
            percentual_acima=0.0
        )

    total_abaixo = sum(r.qtd_abaixo_media for r in results)
    total_na = sum(r.qtd_na_media for r in results)
    total_acima = sum(r.qtd_acima_media for r in results)
    total_alunos = total_abaixo + total_na + total_acima

    if total_alunos == 0:
        return RelatorioAvaliacaoGeral(
            total_alunos=0,
            abaixo_media=0,
            na_media=0,
            acima_media=0,
            percentual_abaixo=0.0,
            percentual_na=0.0,
            percentual_acima=0.0
        )

    return RelatorioAvaliacaoGeral(
        total_alunos=total_alunos,
        abaixo_media=total_abaixo,
        na_media=total_na,
        acima_media=total_acima,
        percentual_abaixo=round((total_abaixo / total_alunos) * 100, 2),
        percentual_na=round((total_na / total_alunos) * 100, 2),
        percentual_acima=round((total_acima / total_alunos) * 100, 2)
    )


@router.get("/avaliacoes-agregadas/drill-down/escolas")
async def avaliacoes_agregadas_drill_down_escolas(
    ano_letivo: int = None,
    bimestre: int = None,
    disciplina_id: int = None,
    disciplina_nome: str = None,
    escola_id: int = None,
    turma_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Drill-down by schools using aggregated data
    Returns performance distribution per school
    """
    if current_user.perfil == PerfilUsuario.COMUNIDADE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Perfil Comunidade não tem acesso a dados detalhados"
        )

    # Query aggregated evaluations grouped by escola
    query = db.query(
        Escola.id,
        Escola.nome,
        func.sum(AvaliacaoAgregada.qtd_abaixo_media).label('abaixo'),
        func.sum(AvaliacaoAgregada.qtd_na_media).label('na_media'),
        func.sum(AvaliacaoAgregada.qtd_acima_media).label('acima')
    ).join(Turma, AvaliacaoAgregada.turma_id == Turma.id)\
     .join(Escola, Turma.escola_id == Escola.id)

    # Apply filters
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Escola.id == current_user.escola_dirigida.id)

    if escola_id:
        query = query.filter(Escola.id == escola_id)
    if turma_id:
        query = query.filter(AvaliacaoAgregada.turma_id == turma_id)
    if ano_letivo:
        query = query.filter(AvaliacaoAgregada.ano_letivo == ano_letivo)
    if bimestre:
        query = query.filter(AvaliacaoAgregada.bimestre == bimestre)
    if disciplina_id:
        query = query.filter(AvaliacaoAgregada.disciplina_id == disciplina_id)
    if disciplina_nome:
        query = query.join(Disciplina, AvaliacaoAgregada.disciplina).filter(Disciplina.nome == disciplina_nome)

    query = query.group_by(Escola.id, Escola.nome)

    results = query.all()

    drill_down_data = []
    for result in results:
        abaixo = result.abaixo or 0
        na_media = result.na_media or 0
        acima = result.acima or 0
        total = abaixo + na_media + acima
        
        drill_down_data.append({
            "escola_id": result.id,
            "label": result.nome,
            "value": total,
            "abaixo_media": abaixo,
            "na_media": na_media,
            "acima_media": acima,
            "percentual_abaixo": round(abaixo / total * 100, 2) if total > 0 else 0,
            "percentual_na": round(na_media / total * 100, 2) if total > 0 else 0,
            "percentual_acima": round(acima / total * 100, 2) if total > 0 else 0
        })

    return drill_down_data


@router.get("/avaliacoes-agregadas/drill-down/turmas/{escola_id}")
async def avaliacoes_agregadas_drill_down_turmas(
    escola_id: int,
    ano_letivo: int = None,
    bimestre: int = None,
    disciplina_id: int = None,
    disciplina_nome: str = None,
    turma_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Drill-down by classes within a school using aggregated data
    """
    # Verify escola access
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or current_user.escola_dirigida.id != escola_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta escola"
            )

    query = db.query(
        Turma.id,
        Turma.nome,
        func.sum(AvaliacaoAgregada.qtd_abaixo_media).label('abaixo'),
        func.sum(AvaliacaoAgregada.qtd_na_media).label('na_media'),
        func.sum(AvaliacaoAgregada.qtd_acima_media).label('acima')
    ).join(Turma, AvaliacaoAgregada.turma_id == Turma.id)\
     .filter(Turma.escola_id == escola_id)

    if turma_id:
        query = query.filter(AvaliacaoAgregada.turma_id == turma_id)
    if ano_letivo:
        query = query.filter(AvaliacaoAgregada.ano_letivo == ano_letivo)
    if bimestre:
        query = query.filter(AvaliacaoAgregada.bimestre == bimestre)
    if disciplina_id:
        query = query.filter(AvaliacaoAgregada.disciplina_id == disciplina_id)
    if disciplina_nome:
        query = query.join(Disciplina, AvaliacaoAgregada.disciplina).filter(Disciplina.nome == disciplina_nome)

    query = query.group_by(Turma.id, Turma.nome)

    results = query.all()

    drill_down_data = []
    from ..models import Aluno

    for result in results:
        abaixo = result.abaixo or 0
        na_media = result.na_media or 0
        acima = result.acima or 0
        total = abaixo + na_media + acima

        # Get current student count
        alunos_atuais = db.query(Aluno).filter(
            Aluno.turma_id == result.id,
            Aluno.ativo == True
        ).count()

        # Calculate if there are potential transfers
        # (difference between students evaluated and current students)
        tem_transferencias = total != alunos_atuais
        total_transferidos = abs(total - alunos_atuais) if tem_transferencias else 0

        drill_down_data.append({
            "turma_id": result.id,
            "label": result.nome,
            "value": total,
            "abaixo_media": abaixo,
            "na_media": na_media,
            "acima_media": acima,
            "percentual_abaixo": round(abaixo / total * 100, 2) if total > 0 else 0,
            "percentual_na": round(na_media / total * 100, 2) if total > 0 else 0,
            "percentual_acima": round(acima / total * 100, 2) if total > 0 else 0,
            "tem_transferencias": tem_transferencias,
            "total_transferidos": total_transferidos,
            "total_alunos_atuais": alunos_atuais
        })

    return drill_down_data


@router.get("/avaliacoes-agregadas/detalhamento/{turma_id}")
async def detalhamento_avaliacao_turma(
    turma_id: int,
    ano_letivo: int,
    bimestre: int,
    disciplina_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna detalhamento da avaliação agregada de uma turma
    Mostra quais alunos foram avaliados e seu status atual (transferidos ou não)
    """
    from ..models import Aluno, Turma as TurmaModel

    # Verify turma exists and user has access
    turma = db.query(TurmaModel).filter(TurmaModel.id == turma_id).first()
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # Check permissions
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or turma.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado a esta turma"
            )

    # Get the aggregated evaluation
    query = db.query(AvaliacaoAgregada).filter(
        AvaliacaoAgregada.turma_id == turma_id,
        AvaliacaoAgregada.ano_letivo == ano_letivo,
        AvaliacaoAgregada.bimestre == bimestre
    )

    if disciplina_id:
        query = query.filter(AvaliacaoAgregada.disciplina_id == disciplina_id)

    avaliacao = query.first()

    if not avaliacao:
        return {
            "turma_id": turma_id,
            "turma_nome": turma.nome,
            "avaliacao_existe": False,
            "alunos": [],
            "total_alunos_atuais": 0,
            "total_avaliados": 0,
            "total_transferidos": 0,
            "tem_transferencias": False,
            "qtd_abaixo_media": 0,
            "qtd_na_media": 0,
            "qtd_acima_media": 0
        }

    # Get current students in the turma
    alunos_atuais = db.query(Aluno).filter(
        Aluno.turma_id == turma_id,
        Aluno.ativo == True
    ).all()

    total_avaliado = (
        avaliacao.qtd_abaixo_media +
        avaliacao.qtd_na_media +
        avaliacao.qtd_acima_media
    )

    # Build response with current student details
    alunos_info = []
    for aluno in alunos_atuais:
        alunos_info.append({
            "id": aluno.id,
            "nome": aluno.nome_completo,
            "status": "ativo",
            "turma_atual": turma.nome
        })

    # Calculate if there are potential transfers based on difference between
    # total evaluated and current students
    total_alunos_atuais = len(alunos_atuais)
    total_transferidos = abs(total_avaliado - total_alunos_atuais)
    tem_transferencias = total_avaliado != total_alunos_atuais

    return {
        "turma_id": turma_id,
        "turma_nome": turma.nome,
        "disciplina_id": avaliacao.disciplina_id,
        "ano_letivo": ano_letivo,
        "bimestre": bimestre,
        "avaliacao_existe": True,
        "data_avaliacao": avaliacao.created_at.isoformat() if avaliacao.created_at else None,
        "qtd_abaixo_media": avaliacao.qtd_abaixo_media,
        "qtd_na_media": avaliacao.qtd_na_media,
        "qtd_acima_media": avaliacao.qtd_acima_media,
        "total_avaliados": total_avaliado,
        "total_alunos_atuais": total_alunos_atuais,
        "tem_transferencias": tem_transferencias,
        "total_transferidos": total_transferidos,
        "alunos": alunos_info,
        "observacoes": avaliacao.observacoes
    }
