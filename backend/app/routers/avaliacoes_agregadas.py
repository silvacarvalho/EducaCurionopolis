"""
Avaliação Agregada Module Router
Aggregated evaluation system for Directors/Coordinators
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from ..database import get_db
from ..models import (
    AvaliacaoAgregada, Turma, Disciplina, Usuario, PerfilUsuario, Escola, Bimestre
)
from ..schemas import (
    AvaliacaoAgregadaCreate,
    AvaliacaoAgregadaUpdate,
    AvaliacaoAgregadaResponse
)
from ..auth import get_current_active_user

router = APIRouter()


def require_diretor_or_gestao(current_user: Usuario = Depends(get_current_active_user)):
    """Dependency to require DIRETOR_COORDENADOR or GESTAO_MUNICIPAL role"""
    if current_user.perfil not in [PerfilUsuario.DIRETOR_COORDENADOR, PerfilUsuario.GESTAO_MUNICIPAL]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso permitido apenas para Diretor/Coordenador ou Gestão Municipal"
        )
    return current_user


def verify_turma_access(turma_id: int, current_user: Usuario, db: Session):
    """Verify that user has access to this turma"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # DIRETOR can only access their own school's turmas
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            if turma.escola_id != current_user.escola_dirigida.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem acesso a esta turma"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não está associado a nenhuma escola"
            )


@router.post("/", response_model=AvaliacaoAgregadaResponse, status_code=status.HTTP_201_CREATED)
async def create_avaliacao_agregada(
    avaliacao_data: AvaliacaoAgregadaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Create aggregated evaluation
    Only DIRETOR_COORDENADOR or GESTAO_MUNICIPAL can create
    """
    # Verify turma access
    verify_turma_access(avaliacao_data.turma_id, current_user, db)

    # Verify disciplina exists and belongs to turma
    disciplina = db.query(Disciplina).filter(
        Disciplina.id == avaliacao_data.disciplina_id,
        Disciplina.turma_id == avaliacao_data.turma_id
    ).first()

    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada ou não pertence a esta turma"
        )

    # Check if evaluation already exists
    existing = db.query(AvaliacaoAgregada).filter(
        AvaliacaoAgregada.turma_id == avaliacao_data.turma_id,
        AvaliacaoAgregada.disciplina_id == avaliacao_data.disciplina_id,
        AvaliacaoAgregada.bimestre == avaliacao_data.bimestre,
        AvaliacaoAgregada.ano_letivo == avaliacao_data.ano_letivo
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma avaliação agregada para esta turma/disciplina/bimestre"
        )

    # Create aggregated evaluation
    db_avaliacao = AvaliacaoAgregada(
        turma_id=avaliacao_data.turma_id,
        disciplina_id=avaliacao_data.disciplina_id,
        bimestre=avaliacao_data.bimestre,
        ano_letivo=avaliacao_data.ano_letivo,
        qtd_abaixo_media=avaliacao_data.qtd_abaixo_media,
        qtd_na_media=avaliacao_data.qtd_na_media,
        qtd_acima_media=avaliacao_data.qtd_acima_media,
        observacoes=avaliacao_data.observacoes
    )

    db.add(db_avaliacao)
    db.commit()
    db.refresh(db_avaliacao)

    return db_avaliacao


@router.get("/", response_model=List[AvaliacaoAgregadaResponse])
async def list_avaliacoes_agregadas(
    turma_id: int = None,
    disciplina_id: int = None,
    bimestre: int = None,
    ano_letivo: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """List aggregated evaluations with filters"""
    query = db.query(AvaliacaoAgregada)

    # DIRETOR can only see their school's evaluations
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.join(Turma).filter(Turma.escola_id == current_user.escola_dirigida.id)
        else:
            # No escola = no results
            return []

    if turma_id:
        query = query.filter(AvaliacaoAgregada.turma_id == turma_id)

    if disciplina_id:
        query = query.filter(AvaliacaoAgregada.disciplina_id == disciplina_id)

    if bimestre:
        query = query.filter(AvaliacaoAgregada.bimestre == bimestre)

    if ano_letivo:
        query = query.filter(AvaliacaoAgregada.ano_letivo == ano_letivo)

    avaliacoes = query.offset(skip).limit(limit).all()
    return avaliacoes


@router.get("/{avaliacao_id}", response_model=AvaliacaoAgregadaResponse)
async def get_avaliacao_agregada(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Get aggregated evaluation by ID"""
    query = db.query(AvaliacaoAgregada).options(
        joinedload(AvaliacaoAgregada.turma)
    )

    avaliacao = query.filter(AvaliacaoAgregada.id == avaliacao_id).first()

    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação agregada não encontrada"
        )

    # DIRETOR can only see their school's evaluations
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            if avaliacao.turma.escola_id != current_user.escola_dirigida.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem acesso a esta avaliação"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não está associado a nenhuma escola"
            )

    return avaliacao


@router.put("/{avaliacao_id}", response_model=AvaliacaoAgregadaResponse)
async def update_avaliacao_agregada(
    avaliacao_id: int,
    avaliacao_data: AvaliacaoAgregadaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Update aggregated evaluation
    """
    query = db.query(AvaliacaoAgregada).options(
        joinedload(AvaliacaoAgregada.turma)
    )

    avaliacao = query.filter(AvaliacaoAgregada.id == avaliacao_id).first()

    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação agregada não encontrada"
        )

    # Verify access
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            if avaliacao.turma.escola_id != current_user.escola_dirigida.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não pode editar esta avaliação"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não está associado a nenhuma escola"
            )

    # Update fields
    if avaliacao_data.qtd_abaixo_media is not None:
        avaliacao.qtd_abaixo_media = avaliacao_data.qtd_abaixo_media
    if avaliacao_data.qtd_na_media is not None:
        avaliacao.qtd_na_media = avaliacao_data.qtd_na_media
    if avaliacao_data.qtd_acima_media is not None:
        avaliacao.qtd_acima_media = avaliacao_data.qtd_acima_media
    if avaliacao_data.observacoes is not None:
        avaliacao.observacoes = avaliacao_data.observacoes

    db.commit()
    db.refresh(avaliacao)

    return avaliacao


@router.delete("/{avaliacao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avaliacao_agregada(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Delete aggregated evaluation"""
    query = db.query(AvaliacaoAgregada).options(
        joinedload(AvaliacaoAgregada.turma)
    )

    avaliacao = query.filter(AvaliacaoAgregada.id == avaliacao_id).first()

    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação agregada não encontrada"
        )

    # Verify access
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            if avaliacao.turma.escola_id != current_user.escola_dirigida.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não pode deletar esta avaliação"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário não está associado a nenhuma escola"
            )

    db.delete(avaliacao)
    db.commit()

    return None
