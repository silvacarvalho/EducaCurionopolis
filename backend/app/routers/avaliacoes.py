"""
Avaliação Module Router
Bimestral evaluation system
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..database import get_db
from ..models import AvaliacaoBimestral, Aluno, Disciplina, Professor, Usuario, PerfilUsuario, Bimestre
from ..schemas import (
    AvaliacaoBimestralCreate,
    AvaliacaoBimestralUpdate,
    AvaliacaoBimestralResponse,
    AvaliacaoBimestralBulk
)
from ..auth import get_current_active_user
from ..dependencies import get_current_professor, verify_professor_disciplina

router = APIRouter()


@router.post("/", response_model=AvaliacaoBimestralResponse, status_code=status.HTTP_201_CREATED)
async def create_avaliacao(
    avaliacao_data: AvaliacaoBimestralCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Create a bimestral evaluation
    Only PROFESSOR can create evaluations for their disciplines
    """
    # Verify professor teaches this disciplina
    verify_professor_disciplina(avaliacao_data.disciplina_id, current_professor, db)

    # Verify aluno exists
    aluno = db.query(Aluno).filter(Aluno.id == avaliacao_data.aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )
    
    # Verify disciplina exists
    disciplina = db.query(Disciplina).filter(Disciplina.id == avaliacao_data.disciplina_id).first()
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )
    
    # NEW VALIDATION: Verify disciplina is linked to the aluno's turma
    turma = aluno.turma
    if disciplina not in turma.disciplinas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A disciplina não está vinculada à turma do aluno"
        )

    # Check if evaluation already exists
    existing = db.query(AvaliacaoBimestral).filter(
        AvaliacaoBimestral.aluno_id == avaliacao_data.aluno_id,
        AvaliacaoBimestral.disciplina_id == avaliacao_data.disciplina_id,
        AvaliacaoBimestral.bimestre == avaliacao_data.bimestre,
        AvaliacaoBimestral.ano_letivo == avaliacao_data.ano_letivo
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma avaliação para este aluno nesta disciplina e bimestre"
        )

    # Create evaluation
    db_avaliacao = AvaliacaoBimestral(
        aluno_id=avaliacao_data.aluno_id,
        disciplina_id=avaliacao_data.disciplina_id,
        professor_id=current_professor.id,
        bimestre=avaliacao_data.bimestre,
        ano_letivo=avaliacao_data.ano_letivo,
        nivel_desempenho=avaliacao_data.nivel_desempenho,
        observacoes=avaliacao_data.observacoes
    )

    db.add(db_avaliacao)
    db.commit()
    db.refresh(db_avaliacao)

    return db_avaliacao


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_avaliacoes_bulk(
    bulk_data: AvaliacaoBimestralBulk,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Create multiple evaluations at once
    Useful for evaluating an entire class
    """
    results = []

    for avaliacao_data in bulk_data.avaliacoes:
        try:
            # Verify professor teaches this disciplina
            verify_professor_disciplina(avaliacao_data.disciplina_id, current_professor, db)

            # Check if evaluation already exists
            existing = db.query(AvaliacaoBimestral).filter(
                AvaliacaoBimestral.aluno_id == avaliacao_data.aluno_id,
                AvaliacaoBimestral.disciplina_id == avaliacao_data.disciplina_id,
                AvaliacaoBimestral.bimestre == avaliacao_data.bimestre,
                AvaliacaoBimestral.ano_letivo == avaliacao_data.ano_letivo
            ).first()

            if existing:
                # Update existing
                existing.nivel_desempenho = avaliacao_data.nivel_desempenho
                existing.observacoes = avaliacao_data.observacoes
                results.append({"aluno_id": avaliacao_data.aluno_id, "action": "updated"})
            else:
                # Create new
                db_avaliacao = AvaliacaoBimestral(
                    aluno_id=avaliacao_data.aluno_id,
                    disciplina_id=avaliacao_data.disciplina_id,
                    professor_id=current_professor.id,
                    bimestre=avaliacao_data.bimestre,
                    ano_letivo=avaliacao_data.ano_letivo,
                    nivel_desempenho=avaliacao_data.nivel_desempenho,
                    observacoes=avaliacao_data.observacoes
                )
                db.add(db_avaliacao)
                results.append({"aluno_id": avaliacao_data.aluno_id, "action": "created"})

        except Exception as e:
            results.append({"aluno_id": avaliacao_data.aluno_id, "error": str(e)})

    db.commit()

    return {
        "message": f"Processadas {len(results)} avaliações",
        "results": results
    }


@router.get("/", response_model=List[AvaliacaoBimestralResponse])
async def list_avaliacoes(
    disciplina_id: int = None,
    turma_id: int = None,
    bimestre: Bimestre = None,
    ano_letivo: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List evaluations with filters"""
    query = db.query(AvaliacaoBimestral)

    # Filter by professor if current user is professor
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        if current_user.professor:
            query = query.filter(AvaliacaoBimestral.professor_id == current_user.professor.id)

    if disciplina_id:
        query = query.filter(AvaliacaoBimestral.disciplina_id == disciplina_id)

    if turma_id:
        query = query.join(Disciplina).filter(Disciplina.turma_id == turma_id)

    if bimestre:
        query = query.filter(AvaliacaoBimestral.bimestre == bimestre)

    if ano_letivo:
        query = query.filter(AvaliacaoBimestral.ano_letivo == ano_letivo)

    avaliacoes = query.offset(skip).limit(limit).all()
    return avaliacoes


@router.get("/{avaliacao_id}", response_model=AvaliacaoBimestralResponse)
async def get_avaliacao(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get evaluation by ID"""
    avaliacao = db.query(AvaliacaoBimestral).filter(AvaliacaoBimestral.id == avaliacao_id).first()

    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada"
        )

    return avaliacao


@router.put("/{avaliacao_id}", response_model=AvaliacaoBimestralResponse)
async def update_avaliacao(
    avaliacao_id: int,
    avaliacao_data: AvaliacaoBimestralUpdate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Update evaluation
    Only the professor who created it can update
    """
    avaliacao = db.query(AvaliacaoBimestral).filter(AvaliacaoBimestral.id == avaliacao_id).first()

    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada"
        )

    # Verify ownership
    if avaliacao.professor_id != current_professor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode editar esta avaliação"
        )

    # Update fields
    if avaliacao_data.nivel_desempenho:
        avaliacao.nivel_desempenho = avaliacao_data.nivel_desempenho
    if avaliacao_data.observacoes is not None:
        avaliacao.observacoes = avaliacao_data.observacoes

    db.commit()
    db.refresh(avaliacao)

    return avaliacao


@router.delete("/{avaliacao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avaliacao(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Delete evaluation (only by the professor who created it)"""
    avaliacao = db.query(AvaliacaoBimestral).filter(AvaliacaoBimestral.id == avaliacao_id).first()

    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada"
        )

    # Verify ownership
    if avaliacao.professor_id != current_professor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode deletar esta avaliação"
        )

    db.delete(avaliacao)
    db.commit()

    return None
