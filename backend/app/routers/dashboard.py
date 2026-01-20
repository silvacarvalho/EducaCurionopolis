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
    ProvaSimuladoSAEB, ResultadoSAEB, AvaliacaoAgregada, PerfilUsuario
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
        # DETERMINAR ESCOPO BASEADO NO PERFIL
        # ============================================
        
        # IDs de escolas e turmas que o usuário pode ver
        escola_ids = None  # None = todas
        turma_ids = None   # None = todas
        professor_id = None
        
        if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
            # Diretor vê apenas sua escola
            if current_user.escola_dirigida:
                escola_ids = [current_user.escola_dirigida.id]
            else:
                # Sem escola associada, não vê nada
                escola_ids = []
                
        elif current_user.perfil == PerfilUsuario.PROFESSOR:
            # Professor vê apenas suas turmas
            professor = db.query(Professor).filter(Professor.usuario_id == current_user.id).first()
            if professor:
                professor_id = professor.id
                turmas_professor = db.query(Turma.id).filter(
                    Turma.professor_id == professor.id,
                    Turma.ano_letivo == ano_letivo
                ).all()
                turma_ids = [t.id for t in turmas_professor]
                # Descobrir escola(s) do professor
                escola_ids_query = db.query(distinct(Turma.escola_id)).filter(
                    Turma.professor_id == professor.id,
                    Turma.ano_letivo == ano_letivo
                ).all()
                escola_ids = [e[0] for e in escola_ids_query]
            else:
                turma_ids = []
                escola_ids = []
        
        # Para GESTAO_MUNICIPAL e COMUNIDADE, escola_ids e turma_ids permanecem None (vê tudo)
        
        # ============================================
        # CONTADORES GERAIS
        # ============================================
        
        # Escolas ativas (baseado no escopo do usuário)
        query_escolas = db.query(func.count(Escola.id)).filter(Escola.ativo == True)
        if escola_ids is not None:
            query_escolas = query_escolas.filter(Escola.id.in_(escola_ids))
        total_escolas = query_escolas.scalar() or 0
        
        # Professores ativos (baseado no escopo)
        query_professores = db.query(func.count(Professor.id)).filter(Professor.ativo == True)
        if escola_ids is not None:
            query_professores = query_professores.filter(Professor.escola_id.in_(escola_ids))
        if professor_id is not None:
            # Professor vê apenas ele mesmo
            query_professores = query_professores.filter(Professor.id == professor_id)
        total_professores = query_professores.scalar() or 0
        
        # Turmas do ano letivo (baseado no escopo)
        query_turmas = db.query(func.count(Turma.id)).filter(
            Turma.ano_letivo == ano_letivo,
            Turma.ativo == True
        )
        if turma_ids is not None:
            query_turmas = query_turmas.filter(Turma.id.in_(turma_ids))
        elif escola_ids is not None:
            query_turmas = query_turmas.filter(Turma.escola_id.in_(escola_ids))
        total_turmas = query_turmas.scalar() or 0
        
        # Alunos ativos do ano letivo (via turma, baseado no escopo)
        query_alunos = db.query(func.count(Aluno.id)).join(
            Turma, Aluno.turma_id == Turma.id
        ).filter(
            Aluno.ativo == True,
            Turma.ano_letivo == ano_letivo
        )
        if turma_ids is not None:
            query_alunos = query_alunos.filter(Turma.id.in_(turma_ids))
        elif escola_ids is not None:
            query_alunos = query_alunos.filter(Turma.escola_id.in_(escola_ids))
        total_alunos = query_alunos.scalar() or 0
        
        # Total de avaliações registradas no ano (baseado no escopo)
        query_avaliacoes = db.query(func.count(AvaliacaoAgregada.id)).filter(
            AvaliacaoAgregada.ano_letivo == ano_letivo
        )
        if turma_ids is not None:
            query_avaliacoes = query_avaliacoes.filter(AvaliacaoAgregada.turma_id.in_(turma_ids))
        elif escola_ids is not None:
            query_avaliacoes = query_avaliacoes.join(Turma, AvaliacaoAgregada.turma_id == Turma.id).filter(
                Turma.escola_id.in_(escola_ids)
            )
        total_avaliacoes = query_avaliacoes.scalar() or 0
        
        # Total de diagnósticos cadastrados no ano (não filtra por escopo - são templates globais)
        total_diagnosticos = db.query(func.count(Diagnostico.id)).filter(
            Diagnostico.ano_letivo == ano_letivo,
            Diagnostico.ativo == True
        ).scalar() or 0
        
        # ============================================
        # MÉTRICAS SAEB
        # ============================================
        
        # Simulados ativos no ano (não filtra por escopo - são templates globais)
        total_simulados = db.query(func.count(ProvaSimuladoSAEB.id)).filter(
            ProvaSimuladoSAEB.ano_letivo == ano_letivo,
            ProvaSimuladoSAEB.ativo == True
        ).scalar() or 0
        
        # Participantes únicos em simulados (baseado no escopo)
        participantes_saeb = 0
        total_participacoes = 0
        media_saeb = 0.0
        
        try:
            query_participantes = db.query(func.count(distinct(ResultadoSAEB.aluno_id))).join(
                ProvaSimuladoSAEB
            ).join(
                Aluno, ResultadoSAEB.aluno_id == Aluno.id
            ).join(
                Turma, Aluno.turma_id == Turma.id
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            )
            if turma_ids is not None:
                query_participantes = query_participantes.filter(Turma.id.in_(turma_ids))
            elif escola_ids is not None:
                query_participantes = query_participantes.filter(Turma.escola_id.in_(escola_ids))
            participantes_saeb = query_participantes.scalar() or 0
            
            # Total de participações (resultados)
            query_participacoes = db.query(func.count(ResultadoSAEB.id)).join(
                ProvaSimuladoSAEB
            ).join(
                Aluno, ResultadoSAEB.aluno_id == Aluno.id
            ).join(
                Turma, Aluno.turma_id == Turma.id
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            )
            if turma_ids is not None:
                query_participacoes = query_participacoes.filter(Turma.id.in_(turma_ids))
            elif escola_ids is not None:
                query_participacoes = query_participacoes.filter(Turma.escola_id.in_(escola_ids))
            total_participacoes = query_participacoes.scalar() or 0
            
            # Média geral SAEB (baseado no escopo)
            query_media = db.query(func.avg(ResultadoSAEB.nota_percentual)).join(
                ProvaSimuladoSAEB
            ).join(
                Aluno, ResultadoSAEB.aluno_id == Aluno.id
            ).join(
                Turma, Aluno.turma_id == Turma.id
            ).filter(
                ProvaSimuladoSAEB.ano_letivo == ano_letivo
            )
            if turma_ids is not None:
                query_media = query_media.filter(Turma.id.in_(turma_ids))
            elif escola_ids is not None:
                query_media = query_media.filter(Turma.escola_id.in_(escola_ids))
            media_result = query_media.scalar()
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
            query_hipoteses = db.query(
                DiagnosticoResultado.hipotese_escrita,
                func.count(DiagnosticoResultado.id).label('quantidade')
            ).join(
                Diagnostico, DiagnosticoResultado.diagnostico_id == Diagnostico.id
            ).join(
                Aluno, DiagnosticoResultado.aluno_id == Aluno.id
            ).join(
                Turma, Aluno.turma_id == Turma.id
            ).filter(
                Diagnostico.ano_letivo == ano_letivo
            )
            if turma_ids is not None:
                query_hipoteses = query_hipoteses.filter(Turma.id.in_(turma_ids))
            elif escola_ids is not None:
                query_hipoteses = query_hipoteses.filter(Turma.escola_id.in_(escola_ids))
            
            hipoteses_count = query_hipoteses.group_by(
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
        
        # Turmas sem professor (baseado no escopo)
        query_turmas_sem_prof = db.query(func.count(Turma.id)).filter(
            Turma.ano_letivo == ano_letivo,
            Turma.ativo == True,
            Turma.professor_id == None
        )
        if turma_ids is not None:
            query_turmas_sem_prof = query_turmas_sem_prof.filter(Turma.id.in_(turma_ids))
        elif escola_ids is not None:
            query_turmas_sem_prof = query_turmas_sem_prof.filter(Turma.escola_id.in_(escola_ids))
        turmas_sem_professor = query_turmas_sem_prof.scalar() or 0
        
        if turmas_sem_professor > 0:
            alertas.append({
                'tipo': 'danger',
                'titulo': f'{turmas_sem_professor} turma(s) sem professor',
                'descricao': 'Precisam de atribuição',
                'icone': 'warning',
                'modal': 'turmas-sem-professor',
                'acao': 'Ver detalhes'
            })
        
        # Escolas abaixo da média SAEB (< 50%) - apenas para gestão/diretor
        escolas_baixo_saeb = 0
        if current_user.perfil != PerfilUsuario.PROFESSOR:
            try:
                query_escolas_saeb = db.query(
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
                )
                if escola_ids is not None:
                    query_escolas_saeb = query_escolas_saeb.filter(Turma.escola_id.in_(escola_ids))
                
                escolas_com_saeb = query_escolas_saeb.group_by(Turma.escola_id).all()
                escolas_baixo_saeb = sum(1 for e in escolas_com_saeb if e.media and e.media < 50)
            except Exception as e:
                logger.warning(f"Erro ao calcular escolas SAEB: {str(e)}")
        
        if escolas_baixo_saeb > 0:
            alertas.append({
                'tipo': 'warning',
                'titulo': f'{escolas_baixo_saeb} escola(s) abaixo da média',
                'descricao': 'SAEB menor que 50%',
                'icone': 'trending_down',
                'modal': 'escolas-baixo-saeb',
                'acao': 'Ver detalhes'
            })
        
        # Alunos sem diagnóstico (baseado no escopo)
        alunos_sem_diagnostico = 0
        try:
            # Subquery para pegar IDs de alunos com diagnóstico no ano
            alunos_com_diagnostico = db.query(DiagnosticoResultado.aluno_id).join(
                Diagnostico, DiagnosticoResultado.diagnostico_id == Diagnostico.id
            ).filter(
                Diagnostico.ano_letivo == ano_letivo
            ).subquery()
            
            # Contar alunos do ano sem diagnóstico
            query_alunos_sem_diag = db.query(func.count(Aluno.id)).join(
                Turma, Aluno.turma_id == Turma.id
            ).filter(
                Aluno.ativo == True,
                Turma.ano_letivo == ano_letivo,
                ~Aluno.id.in_(db.query(alunos_com_diagnostico.c.aluno_id))
            )
            if turma_ids is not None:
                query_alunos_sem_diag = query_alunos_sem_diag.filter(Turma.id.in_(turma_ids))
            elif escola_ids is not None:
                query_alunos_sem_diag = query_alunos_sem_diag.filter(Turma.escola_id.in_(escola_ids))
            alunos_sem_diagnostico = query_alunos_sem_diag.scalar() or 0
        except Exception as e:
            logger.warning(f"Erro ao calcular diagnósticos pendentes: {str(e)}")
        
        if alunos_sem_diagnostico > 0:
            # Professor: navega para aplicar diagnóstico
            # Diretor/Gestão: abre modal com lista
            if current_user.perfil == PerfilUsuario.PROFESSOR:
                alertas.append({
                    'tipo': 'info',
                    'titulo': 'Diagnósticos pendentes',
                    'descricao': f'{alunos_sem_diagnostico} aluno(s) aguardam',
                    'icone': 'schedule',
                    'link': '/diagnostico-avaliar',
                    'acao': 'Aplicar diagnóstico'
                })
            else:
                alertas.append({
                    'tipo': 'info',
                    'titulo': 'Diagnósticos pendentes',
                    'descricao': f'{alunos_sem_diagnostico} aluno(s) aguardam',
                    'icone': 'schedule',
                    'modal': 'alunos-sem-diagnostico',
                    'acao': 'Ver detalhes'
                })
        
        # Progresso de avaliações lançadas (baseado no escopo)
        query_turmas_aval = db.query(func.count(distinct(AvaliacaoAgregada.turma_id))).filter(
            AvaliacaoAgregada.ano_letivo == ano_letivo
        )
        if turma_ids is not None:
            query_turmas_aval = query_turmas_aval.filter(AvaliacaoAgregada.turma_id.in_(turma_ids))
        elif escola_ids is not None:
            query_turmas_aval = query_turmas_aval.join(Turma, AvaliacaoAgregada.turma_id == Turma.id).filter(
                Turma.escola_id.in_(escola_ids)
            )
        turmas_com_avaliacao = query_turmas_aval.scalar() or 0
        
        if total_turmas > 0:
            percentual_avaliacoes = round((turmas_com_avaliacao / total_turmas) * 100, 0)
            if percentual_avaliacoes >= 80:
                alertas.append({
                    'tipo': 'success',
                    'titulo': 'Meta atingida!',
                    'descricao': f'{int(percentual_avaliacoes)}% avaliações lançadas',
                    'icone': 'check_circle',
                    'link': '/relatorios',
                    'acao': 'Ver relatórios'
                })
        
        # ============================================
        # DESEMPENHO POR BIMESTRE
        # ============================================
        
        desempenho_bimestre = []
        
        for bim in [1, 2, 3, 4]:
            try:
                # Query para somar quantidades de cada nível de desempenho
                query_bimestre = db.query(
                    func.sum(AvaliacaoAgregada.qtd_abaixo_media).label('total_abaixo'),
                    func.sum(AvaliacaoAgregada.qtd_na_media).label('total_na_media'),
                    func.sum(AvaliacaoAgregada.qtd_acima_media).label('total_acima')
                ).filter(
                    AvaliacaoAgregada.ano_letivo == ano_letivo,
                    AvaliacaoAgregada.bimestre == bim
                )
                
                # Aplicar filtros de escopo (escola ou turma)
                if turma_ids is not None:
                    query_bimestre = query_bimestre.filter(AvaliacaoAgregada.turma_id.in_(turma_ids))
                elif escola_ids is not None:
                    query_bimestre = query_bimestre.join(Turma, AvaliacaoAgregada.turma_id == Turma.id).filter(
                        Turma.escola_id.in_(escola_ids)
                    )
                
                resultado = query_bimestre.first()
                
                total_abaixo = resultado.total_abaixo or 0
                total_na_media = resultado.total_na_media or 0
                total_acima = resultado.total_acima or 0
                
                # Calcular média de cada categoria (assumindo: abaixo=5, na_media=7, acima=9)
                # Ou simplesmente retornar as quantidades para o frontend calcular percentuais
                total_alunos = total_abaixo + total_na_media + total_acima
                
                # Calcular percentual de cada categoria
                perc_abaixo = round((total_abaixo / total_alunos * 100), 1) if total_alunos > 0 else 0.0
                perc_na_media = round((total_na_media / total_alunos * 100), 1) if total_alunos > 0 else 0.0
                perc_acima = round((total_acima / total_alunos * 100), 1) if total_alunos > 0 else 0.0
                
                # Calcular média geral ponderada (abaixo=5, na_media=7, acima=9)
                media_geral = 0.0
                if total_alunos > 0:
                    media_geral = round(
                        (total_abaixo * 5.0 + total_na_media * 7.0 + total_acima * 9.0) / total_alunos,
                        1
                    )
                
                desempenho_bimestre.append({
                    'bimestre': bim,
                    'label': f'{bim}º Bim',
                    'abaixo_media': perc_abaixo,
                    'na_media': perc_na_media,
                    'acima_media': perc_acima,
                    'qtd_abaixo_media': total_abaixo,
                    'qtd_na_media': total_na_media,
                    'qtd_acima_media': total_acima,
                    'media_geral': media_geral,
                    'total_alunos': total_alunos
                })
            except Exception as e:
                logger.error(f"Erro ao calcular desempenho bimestre {bim}: {e}")
                desempenho_bimestre.append({
                    'bimestre': bim,
                    'label': f'{bim}º Bim',
                    'abaixo_media': 0.0,
                    'na_media': 0.0,
                    'acima_media': 0.0,
                    'qtd_abaixo_media': 0,
                    'qtd_na_media': 0,
                    'qtd_acima_media': 0,
                    'media_geral': 0.0,
                    'total_alunos': 0
                })
        
        # ============================================
        # TOP 5 ESCOLAS (por média SAEB) - Apenas para gestão municipal
        # ============================================
        
        escolas_ranking = []
        if current_user.perfil == PerfilUsuario.GESTAO_MUNICIPAL:
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
        elif current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR and escola_ids:
            # Diretor vê ranking das turmas da sua escola
            try:
                top_turmas = db.query(
                    Turma.id,
                    Turma.nome,
                    func.count(distinct(Aluno.id)).label('alunos'),
                    func.avg(ResultadoSAEB.nota_percentual).label('media_saeb')
                ).join(
                    Aluno, Turma.id == Aluno.turma_id
                ).outerjoin(
                    ResultadoSAEB, Aluno.id == ResultadoSAEB.aluno_id
                ).filter(
                    Turma.escola_id.in_(escola_ids),
                    Turma.ano_letivo == ano_letivo,
                    Turma.ativo == True
                ).group_by(
                    Turma.id, Turma.nome
                ).order_by(
                    func.avg(ResultadoSAEB.nota_percentual).desc().nullslast()
                ).limit(5).all()
                
                for turma in top_turmas:
                    escolas_ranking.append({
                        'id': turma.id,
                        'nome': turma.nome,
                        'turmas': 1,
                        'alunos': turma.alunos or 0,
                        'media_saeb': round(float(turma.media_saeb), 1) if turma.media_saeb else 0.0
                    })
            except Exception as e:
                logger.warning(f"Erro ao calcular ranking turmas: {str(e)}")
        
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


# ============================================
# ENDPOINTS DE ALERTAS DETALHADOS
# ============================================

@router.get("/alertas/turmas-sem-professor")
async def get_turmas_sem_professor(
    ano_letivo: int = Query(default=None, description="Ano letivo para filtrar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna lista detalhada de turmas sem professor atribuído.
    """
    if not ano_letivo:
        ano_letivo = datetime.now().year
    
    # Determinar escopo baseado no perfil
    query = db.query(
        Turma.id,
        Turma.nome,
        Turma.ano_escolar,
        Escola.id.label('escola_id'),
        Escola.nome.label('escola_nome')
    ).join(Escola, Turma.escola_id == Escola.id).filter(
        Turma.ano_letivo == ano_letivo,
        Turma.ativo == True,
        Turma.professor_id == None
    )
    
    # Aplicar filtro por perfil
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Escola.id == current_user.escola_dirigida.id)
    elif current_user.perfil == PerfilUsuario.PROFESSOR:
        # Professor não deveria ver este alerta, mas por segurança
        return {"turmas": [], "total": 0}
    
    turmas = query.order_by(Escola.nome, Turma.ano_escolar, Turma.nome).all()
    
    # Agrupar por escola
    escolas_dict = {}
    for turma in turmas:
        if turma.escola_id not in escolas_dict:
            escolas_dict[turma.escola_id] = {
                'escola_id': turma.escola_id,
                'escola_nome': turma.escola_nome,
                'turmas': []
            }
        escolas_dict[turma.escola_id]['turmas'].append({
            'id': turma.id,
            'nome': turma.nome,
            'ano_escolar': turma.ano_escolar,
            'serie_ano': f"{turma.ano_escolar}º Ano"
        })
    
    return {
        "escolas": list(escolas_dict.values()),
        "total": len(turmas)
    }


@router.get("/alertas/alunos-sem-diagnostico")
async def get_alunos_sem_diagnostico(
    ano_letivo: int = Query(default=None, description="Ano letivo para filtrar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna lista detalhada de alunos sem diagnóstico aplicado.
    """
    if not ano_letivo:
        ano_letivo = datetime.now().year
    
    # Subquery para pegar IDs de alunos com diagnóstico no ano
    alunos_com_diagnostico = db.query(DiagnosticoResultado.aluno_id).join(
        Diagnostico, DiagnosticoResultado.diagnostico_id == Diagnostico.id
    ).filter(
        Diagnostico.ano_letivo == ano_letivo
    ).subquery()
    
    # Query principal
    query = db.query(
        Aluno.id,
        Aluno.nome_completo,
        Turma.id.label('turma_id'),
        Turma.nome.label('turma_nome'),
        Turma.ano_escolar,
        Escola.id.label('escola_id'),
        Escola.nome.label('escola_nome')
    ).join(Turma, Aluno.turma_id == Turma.id).join(
        Escola, Turma.escola_id == Escola.id
    ).filter(
        Aluno.ativo == True,
        Turma.ano_letivo == ano_letivo,
        ~Aluno.id.in_(db.query(alunos_com_diagnostico.c.aluno_id))
    )
    
    # Aplicar filtro por perfil
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Escola.id == current_user.escola_dirigida.id)
    elif current_user.perfil == PerfilUsuario.PROFESSOR:
        # Professor vê apenas alunos das suas turmas
        query = query.filter(Turma.professor_id == current_user.id)
    
    alunos = query.order_by(Escola.nome, Turma.nome, Aluno.nome_completo).all()
    
    # Agrupar por escola e turma
    escolas_dict = {}
    for aluno in alunos:
        if aluno.escola_id not in escolas_dict:
            escolas_dict[aluno.escola_id] = {
                'escola_id': aluno.escola_id,
                'escola_nome': aluno.escola_nome,
                'turmas': {}
            }
        
        if aluno.turma_id not in escolas_dict[aluno.escola_id]['turmas']:
            escolas_dict[aluno.escola_id]['turmas'][aluno.turma_id] = {
                'turma_id': aluno.turma_id,
                'turma_nome': aluno.turma_nome,
                'ano_escolar': aluno.ano_escolar,
                'alunos': []
            }
        
        escolas_dict[aluno.escola_id]['turmas'][aluno.turma_id]['alunos'].append({
            'id': aluno.id,
            'nome': aluno.nome_completo
        })
    
    # Converter para lista
    result = []
    for escola in escolas_dict.values():
        escola_item = {
            'escola_id': escola['escola_id'],
            'escola_nome': escola['escola_nome'],
            'turmas': list(escola['turmas'].values())
        }
        result.append(escola_item)
    
    return {
        "escolas": result,
        "total": len(alunos),
        "perfil": current_user.perfil.value
    }


@router.get("/alertas/escolas-baixo-saeb")
async def get_escolas_baixo_saeb(
    ano_letivo: int = Query(default=None, description="Ano letivo para filtrar"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna lista de escolas com média SAEB abaixo de 50%.
    """
    if not ano_letivo:
        ano_letivo = datetime.now().year
    
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        return {"escolas": [], "total": 0}
    
    query = db.query(
        Escola.id,
        Escola.nome,
        func.avg(ResultadoSAEB.nota_percentual).label('media'),
        func.count(distinct(Aluno.id)).label('total_alunos')
    ).join(Turma, Escola.id == Turma.escola_id).join(
        Aluno, Turma.id == Aluno.turma_id
    ).join(
        ResultadoSAEB, Aluno.id == ResultadoSAEB.aluno_id
    ).join(
        ProvaSimuladoSAEB, ResultadoSAEB.prova_id == ProvaSimuladoSAEB.id
    ).filter(
        ProvaSimuladoSAEB.ano_letivo == ano_letivo
    )
    
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Escola.id == current_user.escola_dirigida.id)
    
    escolas = query.group_by(Escola.id, Escola.nome).having(
        func.avg(ResultadoSAEB.nota_percentual) < 50
    ).order_by(func.avg(ResultadoSAEB.nota_percentual)).all()
    
    return {
        "escolas": [
            {
                "id": e.id,
                "nome": e.nome,
                "media_saeb": round(float(e.media), 1) if e.media else 0,
                "total_alunos": e.total_alunos
            }
            for e in escolas
        ],
        "total": len(escolas)
    }
