"""
Schools Router
School management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from ..database import get_db
from ..models import Escola, Usuario, PerfilUsuario
from ..schemas import EscolaCreate, EscolaUpdate, EscolaResponse
from ..auth import get_current_active_user, require_gestao_municipal

router = APIRouter()


@router.post("/", response_model=EscolaResponse, status_code=status.HTTP_201_CREATED)
async def create_escola(
    escola_data: EscolaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Create a new school (GESTÃO MUNICIPAL only)
    """
    # Check if nome already exists
    if db.query(Escola).filter(Escola.nome == escola_data.nome).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma escola com este nome"
        )

    # Check if codigo_inep already exists
    if escola_data.codigo_inep:
        if db.query(Escola).filter(Escola.codigo_inep == escola_data.codigo_inep).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código INEP já cadastrado"
            )

    # Verify diretor exists and has correct perfil
    diretor = db.query(Usuario).filter(Usuario.id == escola_data.diretor_id).first()
    if not diretor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diretor não encontrado"
        )

    if diretor.perfil != PerfilUsuario.DIRETOR_COORDENADOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário selecionado não é um Diretor/Coordenador"
        )

    # Check if diretor already manages another school
    if diretor.escola_dirigida:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este diretor já gerencia outra escola"
        )

    # Create escola
    db_escola = Escola(
        nome=escola_data.nome,
        endereco=escola_data.endereco,
        telefone=escola_data.telefone,
        email=escola_data.email,
        codigo_inep=escola_data.codigo_inep,
        diretor_id=escola_data.diretor_id
    )

    db.add(db_escola)
    db.commit()
    db.refresh(db_escola)

    return db_escola


@router.get("/", response_model=List[EscolaResponse])
async def list_escolas(
    skip: int = 0,
    limit: int = 100,
    ativo: bool = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    List all schools
    GESTÃO MUNICIPAL sees all schools
    DIRETOR sees only their school
    """
    try:
        query = db.query(Escola)

        # Filter by access level
        if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
            if current_user.escola_dirigida:
                query = query.filter(Escola.id == current_user.escola_dirigida.id)
            else:
                return []

        # Filter by ativo status
        if ativo is not None:
            query = query.filter(Escola.ativo == ativo)

        escolas = query.offset(skip).limit(limit).all()
        return escolas
    except Exception as e:
        print(f">> ERRO ao listar escolas: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar escolas: {str(e)}"
        )


@router.get("/{escola_id}", response_model=EscolaResponse)
async def get_escola(
    escola_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Get school by ID
    """
    escola = db.query(Escola).filter(Escola.id == escola_id).first()

    if not escola:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )

    # Authorization check
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        if not current_user.escola_dirigida or current_user.escola_dirigida.id != escola_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem acesso a esta escola"
            )

    return escola


@router.put("/{escola_id}", response_model=EscolaResponse)
async def update_escola(
    escola_id: int,
    escola_data: EscolaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Update school data (GESTÃO MUNICIPAL only)
    """
    escola = db.query(Escola).filter(Escola.id == escola_id).first()

    if not escola:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )

    # Update fields
    if escola_data.nome:
        # Check nome uniqueness
        existing = db.query(Escola).filter(
            Escola.nome == escola_data.nome,
            Escola.id != escola_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Já existe outra escola com este nome"
            )
        escola.nome = escola_data.nome

    if escola_data.endereco is not None:
        escola.endereco = escola_data.endereco
    if escola_data.telefone is not None:
        escola.telefone = escola_data.telefone
    if escola_data.email is not None:
        escola.email = escola_data.email

    if escola_data.diretor_id:
        diretor = db.query(Usuario).filter(Usuario.id == escola_data.diretor_id).first()
        if not diretor or diretor.perfil != PerfilUsuario.DIRETOR_COORDENADOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Diretor inválido"
            )
        escola.diretor_id = escola_data.diretor_id

    if escola_data.ativo is not None:
        escola.ativo = escola_data.ativo

    db.commit()
    db.refresh(escola)

    return escola


@router.delete("/{escola_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_escola(
    escola_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Delete school (soft delete)
    """
    escola = db.query(Escola).filter(Escola.id == escola_id).first()

    if not escola:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Escola não encontrada"
        )

    escola.ativo = False
    db.commit()

    return None


@router.post("/import-csv")
async def import_escolas_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Import schools from CSV file
    Expected columns: nome,endereco,telefone,email,codigo_inep,diretor_cpf
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser um CSV"
        )

    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))

    results = []
    row_number = 0

    for row in csv_reader:
        row_number += 1
        try:
            # Find diretor by CPF
            diretor = db.query(Usuario).filter(Usuario.cpf == row['diretor_cpf']).first()

            if not diretor:
                results.append({
                    "row": row_number,
                    "nome": row.get('nome'),
                    "success": False,
                    "error": f"Diretor com CPF {row['diretor_cpf']} não encontrado"
                })
                continue

            # Check if escola already exists
            if db.query(Escola).filter(Escola.nome == row['nome']).first():
                results.append({
                    "row": row_number,
                    "nome": row['nome'],
                    "success": False,
                    "error": "Escola já existe"
                })
                continue

            # Create escola
            db_escola = Escola(
                nome=row['nome'],
                endereco=row.get('endereco'),
                telefone=row.get('telefone'),
                email=row.get('email'),
                codigo_inep=row.get('codigo_inep'),
                diretor_id=diretor.id
            )

            db.add(db_escola)
            db.commit()
            db.refresh(db_escola)

            results.append({
                "row": row_number,
                "nome": row['nome'],
                "success": True,
                "escola_id": db_escola.id
            })

        except Exception as e:
            results.append({
                "row": row_number,
                "nome": row.get('nome', 'N/A'),
                "success": False,
                "error": str(e)
            })

    return {
        "message": f"Importação concluída. {row_number} linhas processadas",
        "results": results
    }
