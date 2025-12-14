"""
Dashboard Analytics API
Endpoint único para fornecer todas as métricas do dashboard
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, and_, case
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from datetime import datetime
import logging

from app.database import get_db
from app.auth import get_current_active_user
from app.models import (
    Usuario, Escola, Professor, Turma, Aluno,
    Diagnostico, DiagnosticoResultado, AvaliacaoItemDiagnostico,
    ProvaSimuladoSAEB, ResultadoSAEB, AvaliacaoAgregada
)
from app.schemas import HipoteseEscrita, Bimestre

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(
    ano_letivo: int = Query(default=None, description="Ano letivo para filtrar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna todas as estatísticas do dashboard em uma única chamada.
    """
    try:
        # Usar ano atual se não especificado
        if not ano_letivo:
            ano_letivo = datetime.now().year
        
        # ============================================
        # CONTADORES GERAIS
        # ============================================
        
        # Escolas ativas
        total_escolas = db.query(func.count(Escola.id)).filter(
            Escola.ativo == True
        ).scalar() or 0
        
        # Professores ativos
        total_professores = db.query(func.count(Professor.id)).filter(
            Professor.ativo == True
        ).scalar() or 0
        
        # Turmas do ano letivo
        total_turmas = db.query(func.count(Turma.id)).filter(
            Turma.ano_letivo == ano_letivo,
            Turma.ativo == True
        ).scalar() or 0
        
        # Alunos ativos do ano letivo (via turma)
        total_alunos = db.query(func.count(Aluno.id)).join(
            Turma, Aluno.turma_id == Turma.id
        ).filter(
            Aluno.ativo == True,
            Turma.ano_letivo == ano_letivo
        ).scalar() or 0
        
        # Total de avaliações registradas no ano
        total_avaliacoes = db.query(func.count(AvaliacaoAgregada.id)).filter(
            AvaliacaoAgregada.ano_letivo == ano_letivo
        ).scalar() or 0
        
        # Total de diagnósticos cadastrados no ano
        total_diagnosticos = db.query(func.count(Diagnostico.id)).filter(
            Diagnostico.ano_letivo == ano_letivo,
            Diagnostico.ativo == True
        ).scalar() or 0
        
        # ============================================
        # MÉTRICAS SAEB
        # ============================================
        
        # Simulados ativos no ano
        total_simulados = db.query(func.count(ProvaSimuladoSAEB.id)).filter(
            ProvaSimuladoSAEB.ano_letivo == ano_letivo,
            ProvaSimuladoSAEB.ativo == True
        ).scalar() or 0
        
        # Participantes únicos em simulados
        participantes_saeb = 0
        total_participacoes = 0
        media_saeb = 0.0
        
        try:
            participantes_saeb = db.query(func.count(distinct(ResultadoSAEB.aluno_id))).join(
                ProvaSimuladoSAEB
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            ).scalar() or 0
            
            # Total de participações (resultados)
            total_participacoes = db.query(func.count(ResultadoSAEB.id)).join(
                ProvaSimuladoSAEB
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            ).scalar() or 0
            
            # Média geral SAEB
            media_result = db.query(func.avg(ResultadoSAEB.nota_percentual)).join(
                ProvaSimuladoSAEB
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            ).scalar()
            media_saeb = round(float(media_result), 1) if media_result else 0.0
        except Exception as e:
            logger.warning(f"Erro ao calcular métricas SAEB: {str(e)}")
        
        # Taxa de conclusão
        taxa_conclusao = 0.0
        if participantes_saeb > 0 and total_simulados > 0:
            taxa_conclusao = round((total_participacoes / (participantes_saeb * total_simulados)) * 100, 1)
            if taxa_conclusao > 100:
                taxa_conclusao = 100.0
        
        # ============================================
        # DIAGNÓSTICOS - HIPÓTESES DE ESCRITA
        # ============================================
        
        hipoteses = {
            'pre_silabico': 0,
            'silabico_sem_valor_sonoro': 0,
            'silabico_com_valor_sonoro': 0,
            'silabico_alfabetico': 0,
            'alfabetico': 0,
            'nao_avaliado': 0
        }
        
        try:
            hipoteses_count = db.query(
                DiagnosticoResultado.hipotese_escrita,
                func.count(DiagnosticoResultado.id).label('quantidade')
            ).join(
                Diagnostico, DiagnosticoResultado.diagnostico_id == Diagnostico.id
            ).filter(
                Diagnostico.ano_letivo == ano_letivo
            ).group_by(
                DiagnosticoResultado.hipotese_escrita
            ).all()
            
            for hip, qtd in hipoteses_count:
                if hip:
                    key = hip.value if hasattr(hip, 'value') else hip
                    if key in hipoteses:
                        hipoteses[key] = qtd
        except Exception as e:
            logger.warning(f"Erro ao calcular hipóteses: {str(e)}")
        
        # ============================================
        # ALERTAS E PENDÊNCIAS
        # ============================================
        
        alertas = []
        
        # Turmas sem professor
        turmas_sem_professor = db.query(func.count(Turma.id)).filter(
            Turma.ano_letivo == ano_letivo,
            Turma.ativo == True,
            Turma.professor_id == None
        ).scalar() or 0
        
        if turmas_sem_professor > 0:
            alertas.append({
                'tipo': 'danger',
                'titulo': f'{turmas_sem_professor} turma(s) sem professor',
                'descricao': 'Precisam de atribuição',
                'icone': 'warning'
            })
        
        # Escolas abaixo da média SAEB (< 50%)
        escolas_baixo_saeb = 0
        try:
            escolas_com_saeb = db.query(
                Turma.escola_id,
                func.avg(ResultadoSAEB.nota_percentual).label('media')
            ).join(
                Aluno, Turma.id == Aluno.turma_id
            ).join(
                ResultadoSAEB, Aluno.id == ResultadoSAEB.aluno_id
            ).join(
                ProvaSimuladoSAEB, ResultadoSAEB.prova_id == ProvaSimuladoSAEB.id
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            ).group_by(
                Turma.escola_id
            ).all()
            
            escolas_baixo_saeb = sum(1 for e in escolas_com_saeb if e.media and e.media < 50)
        except Exception as e:
            logger.warning(f"Erro ao calcular escolas SAEB: {str(e)}")
        
        if escolas_baixo_saeb > 0:
            alertas.append({
                'tipo': 'warning',
                'titulo': f'{escolas_baixo_saeb} escola(s) abaixo da média',
                'descricao': 'SAEB menor que 50%',
                'icone': 'trending_down'
            })
        
        # Alunos sem diagnóstico (do ano letivo atual)
        alunos_sem_diagnostico = 0
        try:
            # Subquery para pegar IDs de alunos com diagnóstico no ano
            alunos_com_diagnostico = db.query(DiagnosticoResultado.aluno_id).join(
                Diagnostico, DiagnosticoResultado.diagnostico_id == Diagnostico.id
            ).filter(
                Diagnostico.ano_letivo == ano_letivo
            ).subquery()
            
            # Contar alunos do ano sem diagnóstico
            alunos_sem_diagnostico = db.query(func.count(Aluno.id)).join(
                Turma, Aluno.turma_id == Turma.id
            ).filter(
                Aluno.ativo == True,
                Turma.ano_letivo == ano_letivo,
                ~Aluno.id.in_(db.query(alunos_com_diagnostico.c.aluno_id))
            ).scalar() or 0
        except Exception as e:
            logger.warning(f"Erro ao calcular diagnósticos pendentes: {str(e)}")
        
        if alunos_sem_diagnostico > 0:
            alertas.append({
                'tipo': 'info',
                'titulo': 'Diagnósticos pendentes',
                'descricao': f'{alunos_sem_diagnostico} aluno(s) aguardam',
                'icone': 'schedule'
            })
        
        # Progresso de avaliações lançadas
        turmas_com_avaliacao = db.query(func.count(distinct(AvaliacaoAgregada.turma_id))).filter(
            AvaliacaoAgregada.ano_letivo == ano_letivo
        ).scalar() or 0
        
        if total_turmas > 0:
            percentual_avaliacoes = round((turmas_com_avaliacao / total_turmas) * 100, 0)
            if percentual_avaliacoes >= 80:
                alertas.append({
                    'tipo': 'success',
                    'titulo': 'Meta atingida!',
                    'descricao': f'{int(percentual_avaliacoes)}% avaliações lançadas',
                    'icone': 'check_circle'
                })
        
        # ============================================
        # DESEMPENHO POR BIMESTRE
        # ============================================
        
        desempenho_bimestre = []
        
        for bim in [1, 2, 3, 4]:
            media_bimestre = None
            try:
                media_bimestre = db.query(func.avg(AvaliacaoAgregada.media_turma)).filter(
                    AvaliacaoAgregada.ano_letivo == ano_letivo,
                    AvaliacaoAgregada.bimestre == bim
                ).scalar()
            except Exception:
                pass
            
            desempenho_bimestre.append({
                'bimestre': bim,
                'label': f'{bim}º Bim',
                'media': round(float(media_bimestre), 1) if media_bimestre else 0.0
            })
        
        # ============================================
        # TOP 5 ESCOLAS (por média SAEB)
        # ============================================
        
        escolas_ranking = []
        try:
            top_escolas = db.query(
                Escola.id,
                Escola.nome,
                func.count(distinct(Turma.id)).label('turmas'),
                func.count(distinct(Aluno.id)).label('alunos'),
                func.avg(ResultadoSAEB.nota_percentual).label('media_saeb')
            ).join(
                Turma, Escola.id == Turma.escola_id
            ).join(
                Aluno, Turma.id == Aluno.turma_id
            ).outerjoin(
                ResultadoSAEB, Aluno.id == ResultadoSAEB.aluno_id
            ).filter(
                Escola.ativo == True,
                Turma.ano_letivo == ano_letivo
            ).group_by(
                Escola.id, Escola.nome
            ).order_by(
                func.avg(ResultadoSAEB.nota_percentual).desc().nullslast()
            ).limit(5).all()
            
            for escola in top_escolas:
                escolas_ranking.append({
                    'id': escola.id,
                    'nome': escola.nome,
                    'turmas': escola.turmas or 0,
                    'alunos': escola.alunos or 0,
                    'media_saeb': round(float(escola.media_saeb), 1) if escola.media_saeb else 0.0
                })
        except Exception as e:
            logger.warning(f"Erro ao calcular ranking escolas: {str(e)}")
        
        # ============================================
        # RETORNO CONSOLIDADO
        # ============================================
        
        return {
            'ano_letivo': ano_letivo,
            'atualizado_em': datetime.now().isoformat(),
            
            # Contadores gerais
            'contadores': {
                'escolas': total_escolas,
                'professores': total_professores,
                'turmas': total_turmas,
                'alunos': total_alunos,
                'avaliacoes': total_avaliacoes,
                'diagnosticos': total_diagnosticos
            },
            
            # Métricas SAEB
            'saeb': {
                'simulados': total_simulados,
                'participantes': participantes_saeb,
                'participacoes': total_participacoes,
                'taxa_conclusao': taxa_conclusao,
                'media_rede': media_saeb
            },
            
            # Hipóteses de escrita
            'hipoteses_escrita': hipoteses,
            
            # Alertas
            'alertas': alertas,
            
            # Desempenho por bimestre
            'desempenho_bimestre': desempenho_bimestre,
            
            # Top escolas
            'top_escolas': escolas_ranking
        }
        
    except SQLAlchemyError as e:
        logger.error(f"Erro de banco de dados ao carregar dashboard: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erro ao carregar estatísticas do dashboard"
        )
    except Exception as e:
        logger.error(f"Erro inesperado no dashboard: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro inesperado: {str(e)}"
        )


@router.get("/escolas/{escola_id}/stats")
async def get_escola_stats(
    escola_id: int,
    ano_letivo: int = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna estatísticas detalhadas de uma escola específica (Drill-Down).
    """
    try:
        if not ano_letivo:
            ano_letivo = datetime.now().year
        
        # Verificar se escola existe
        escola = db.query(Escola).filter(Escola.id == escola_id).first()
        if not escola:
            raise HTTPException(status_code=404, detail="Escola não encontrada")
        
        # Turmas da escola
        turmas = db.query(Turma).filter(
            Turma.escola_id == escola_id,
            Turma.ano_letivo == ano_letivo,
            Turma.ativo == True
        ).all()
        
        turmas_stats = []
        for turma in turmas:
            # Contar alunos
            total_alunos = db.query(func.count(Aluno.id)).filter(
                Aluno.turma_id == turma.id,
                Aluno.ativo == True
            ).scalar() or 0
            
            # Média SAEB da turma
            media_saeb = None
            try:
                media_saeb = db.query(func.avg(ResultadoSAEB.nota_percentual)).join(
                    Aluno
                ).filter(
                    Aluno.turma_id == turma.id
                ).scalar()
            except Exception:
                pass
            
            # Diagnósticos aplicados
            diagnosticos = db.query(func.count(DiagnosticoResultado.id)).join(
                Aluno
            ).filter(
                Aluno.turma_id == turma.id
            ).scalar() or 0
            
            # Professor
            professor_nome = 'Sem professor'
            if turma.professor and turma.professor.usuario:
                professor_nome = turma.professor.usuario.nome
            
            turmas_stats.append({
                'id': turma.id,
                'nome': turma.nome,
                'ano_escolar': turma.ano_escolar,
                'professor': professor_nome,
                'alunos': total_alunos,
                'media_saeb': round(float(media_saeb), 1) if media_saeb else 0.0,
                'diagnosticos': diagnosticos,
                'percentual_diagnostico': round((diagnosticos / total_alunos) * 100, 0) if total_alunos > 0 else 0
            })
        
        # Totais da escola
        total_alunos_escola = sum(t['alunos'] for t in turmas_stats)
        media_saeb_escola = None
        try:
            media_saeb_escola = db.query(func.avg(ResultadoSAEB.nota_percentual)).join(
                Aluno
            ).join(
                Turma
            ).filter(
                Turma.escola_id == escola_id,
                Turma.ano_letivo == ano_letivo
            ).scalar()
        except Exception:
            pass
        
        return {
            'escola': {
                'id': escola.id,
                'nome': escola.nome
            },
            'ano_letivo': ano_letivo,
            'resumo': {
                'turmas': len(turmas_stats),
                'alunos': total_alunos_escola,
                'media_saeb': round(float(media_saeb_escola), 1) if media_saeb_escola else 0.0
            },
            'turmas': turmas_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao carregar stats da escola {escola_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Erro ao carregar estatísticas da escola"
        )
