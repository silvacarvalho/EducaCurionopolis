"""
Classes/Grades Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from ..database import get_db
from ..models import Turma, Usuario, PerfilUsuario, Professor, Disciplina
from ..schemas import TurmaCreate, TurmaUpdate, TurmaResponse, VincularDisciplinasTurma
from ..auth import get_current_active_user, require_diretor_or_gestao
from ..dependencies import verify_escola_access

router = APIRouter()


@router.post("/", response_model=TurmaResponse, status_code=status.HTTP_201_CREATED)
async def create_turma(
    turma_data: TurmaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Create a new class"""
    # Verify escola access
    verify_escola_access(turma_data.escola_id, current_user, db)

    # Auto-fill ano_letivo if not provided
    ano_letivo = turma_data.ano_letivo if turma_data.ano_letivo else datetime.now().year

    # Check uniqueness
    existing = db.query(Turma).filter(
        Turma.nome == turma_data.nome,
        Turma.escola_id == turma_data.escola_id,
        Turma.ano_letivo == ano_letivo
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma turma com este nome nesta escola para este ano letivo"
        )

    # Create turma with auto-filled ano_letivo
    turma_dict = turma_data.dict(exclude_unset=True)
    turma_dict['ano_letivo'] = ano_letivo

    db_turma = Turma(**turma_dict)
    db.add(db_turma)
    db.commit()
    db.refresh(db_turma)

    return db_turma


@router.get("/", response_model=List[TurmaResponse])
async def list_turmas(
    escola_id: int = None,
    ano_letivo: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List classes with optional filters"""
    from ..models import Aluno

    query = db.query(Turma).options(
        joinedload(Turma.professor).joinedload(Professor.usuario),
        joinedload(Turma.escola)
    )

    # DIRETOR sees only their school's classes
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if current_user.escola_dirigida:
            query = query.filter(Turma.escola_id == current_user.escola_dirigida.id)

    # PROFESSOR sees only their own classes
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        professor = db.query(Professor).filter(Professor.usuario_id == current_user.id).first()
        if professor:
            query = query.filter(Turma.professor_id == professor.id)
        else:
            # Se não encontrou professor associado, retorna lista vazia
            return []

    if escola_id:
        query = query.filter(Turma.escola_id == escola_id)
    if ano_letivo:
        query = query.filter(Turma.ano_letivo == ano_letivo)

    turmas = query.filter(Turma.ativo == True).offset(skip).limit(limit).all()

    # Add total_alunos count to each turma
    result = []
    for turma in turmas:
        turma_dict = TurmaResponse.from_orm(turma).dict()
        # Count active students in this turma
        total_alunos = db.query(Aluno).filter(
            Aluno.turma_id == turma.id,
            Aluno.ativo == True
        ).count()
        turma_dict['total_alunos'] = total_alunos
        result.append(turma_dict)

    return result


@router.get("/{turma_id}", response_model=TurmaResponse)
async def get_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get class by ID"""
    from ..models import Aluno

    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # Authorization
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or turma.escola_id != current_user.escola_dirigida.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado"
            )

    # Add total_alunos count
    turma_dict = TurmaResponse.from_orm(turma).dict()
    total_alunos = db.query(Aluno).filter(
        Aluno.turma_id == turma.id,
        Aluno.ativo == True
    ).count()
    turma_dict['total_alunos'] = total_alunos

    return turma_dict


@router.put("/{turma_id}", response_model=TurmaResponse)
async def update_turma(
    turma_id: int,
    turma_data: TurmaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Update class data"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # Authorization
    verify_escola_access(turma.escola_id, current_user, db)

    # Update fields
    if turma_data.nome is not None:
        turma.nome = turma_data.nome
    if turma_data.turno is not None:
        turma.turno = turma_data.turno
    if turma_data.professor_id is not None:
        turma.professor_id = turma_data.professor_id
    if turma_data.ativo is not None:
        turma.ativo = turma_data.ativo
    if hasattr(turma_data, 'ano_escolar') and turma_data.ano_escolar is not None:
        turma.ano_escolar = turma_data.ano_escolar

    db.commit()
    db.refresh(turma)

    return turma


@router.delete("/{turma_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_turma(
    turma_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Soft delete class"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()

    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    verify_escola_access(turma.escola_id, current_user, db)

    turma.ativo = False
    db.commit()

    return None


# ============================================
# DISCIPLINAS VINCULAÇÃO ENDPOINTS
# ============================================

@router.post("/{turma_id}/disciplinas", status_code=status.HTTP_200_OK)
async def vincular_disciplinas(
    turma_id: int,
    vinculo_data: VincularDisciplinasTurma,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """
    Vincular múltiplas disciplinas a uma turma
    Substitui todas as disciplinas anteriores pelas novas
    """
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )
    
    # Verificar acesso
    verify_escola_access(turma.escola_id, current_user, db)
    
    # Buscar disciplinas e validar se existem
    disciplinas = []
    for disciplina_id in vinculo_data.disciplina_ids:
        disciplina = db.query(Disciplina).filter(
            Disciplina.id == disciplina_id,
            Disciplina.ativo == True
        ).first()
        
        if not disciplina:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Disciplina com ID {disciplina_id} não encontrada"
            )
        
        disciplinas.append(disciplina)
    
    # Limpar disciplinas antigas e adicionar novas
    turma.disciplinas.clear()
    turma.disciplinas.extend(disciplinas)
    
    db.commit()
    db.refresh(turma)
    
    return {
        "message": "Disciplinas vinculadas com sucesso",
        "turma_id": turma.id,
        "disciplinas_ids": [d.id for d in turma.disciplinas],
        "total_disciplinas": len(turma.disciplinas)
    }


@router.post("/{turma_id}/disciplinas/{disciplina_id}", status_code=status.HTTP_200_OK)
async def adicionar_disciplina(
    turma_id: int,
    disciplina_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Adicionar uma disciplina à turma (sem remover as existentes)"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )
    
    verify_escola_access(turma.escola_id, current_user, db)
    
    disciplina = db.query(Disciplina).filter(
        Disciplina.id == disciplina_id,
        Disciplina.ativo == True
    ).first()
    
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )
    
    # Verificar se já está vinculada
    if disciplina in turma.disciplinas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disciplina já está vinculada a esta turma"
        )
    
    turma.disciplinas.append(disciplina)
    db.commit()
    
    return {
        "message": "Disciplina adicionada com sucesso",
        "turma_id": turma.id,
        "disciplina_id": disciplina.id
    }


@router.delete("/{turma_id}/disciplinas/{disciplina_id}", status_code=status.HTTP_200_OK)
async def desvincular_disciplina(
    turma_id: int,
    disciplina_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_diretor_or_gestao)
):
    """Remover uma disciplina da turma"""
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )
    
    verify_escola_access(turma.escola_id, current_user, db)
    
    disciplina = db.query(Disciplina).filter(Disciplina.id == disciplina_id).first()
    
    if not disciplina:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Disciplina não encontrada"
        )
    
    # Verificar se está vinculada
    if disciplina not in turma.disciplinas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disciplina não está vinculada a esta turma"
        )
    
    turma.disciplinas.remove(disciplina)
    db.commit()
    
    return {
        "message": "Disciplina removida com sucesso",
        "turma_id": turma.id,
        "disciplina_id": disciplina.id
    }

    return None
