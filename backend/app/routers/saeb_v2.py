"""
SAEB V2 Router - Complete System
Handles descriptors, questions, simulados, student answers, and reports
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Union
from datetime import datetime, timedelta
import openpyxl
import io

from ..database import get_db
from ..config import get_settings
from ..models import (
    DescritorSAEB, QuestaoSAEB, SimuladoSAEB, SimuladoQuestao,
    ParticipacaoSimulado, RespostaAlunoSAEB, ResultadoSimuladoAluno,
    Aluno, Turma, Professor, Usuario, PerfilUsuario,
    DisciplinaSAEB as ModelDisciplina, SituacaoSAEB as ModelSituacao,
    StatusSimulado as ModelStatus, ConfiguracaoSAEB, TokenAcessoSimulado
)
from ..schemas import (
    DescritorSAEBCreate, DescritorSAEBUpdate, DescritorSAEBResponse,
    DescritorSAEBBulkImport, DescritorSAEBBulkImportResponse,
    QuestaoSAEBCreate, QuestaoSAEBUpdate, QuestaoSAEBResponse, QuestaoSAEBComDescritor,
    QuestaoSAEBSimulado,
    SimuladoSAEBCreate, SimuladoSAEBUpdate, SimuladoSAEBResponse, SimuladoSAEBDetalhado,
    ParticipacaoSimuladoCreate, ParticipacaoSimuladoResponse,
    RespostaAlunoSAEBCreate, RespostaAlunoSAEBBulk, RespostaAlunoSAEBResponse,
    ResultadoSimuladoAlunoResponse, ResultadoSimuladoDetalhado,
    RelatorioDescritor, RelatorioSimulado,
    DisciplinaSAEB as SchemaDisciplina, SituacaoSAEB as SchemaSituacao,
    ConfiguracaoSAEBCreate, ConfiguracaoSAEBUpdate, ConfiguracaoSAEBResponse,
    TokenAcessoResponse, TokenAcessoListResponse, TokenAuthRequest, TokenAuthResponse,
    LancamentoManualCreate, LancamentoManualBulkCreate
)
from ..auth import get_current_active_user, require_gestao_municipal
from ..dependencies import get_current_professor, get_current_student_from_token, get_user_or_student

router = APIRouter()


# ============================================
# HELPER FUNCTIONS
# ============================================

def calcular_situacao(porcentagem: int) -> ModelSituacao:
    """Calculate student situation based on percentage"""
    if porcentagem > 89:
        return ModelSituacao.ADEQUADO
    elif porcentagem > 74:
        return ModelSituacao.INTERMEDIARIO_I
    elif porcentagem > 50:
        return ModelSituacao.INTERMEDIARIO_II
    elif porcentagem > 25:
        return ModelSituacao.CRITICO
    else:
        return ModelSituacao.MUITO_CRITICO


def gerar_token_unico(db: Session) -> str:
    """
    Generate unique 6-character token (3 letters + 3 numbers, shuffled, uppercase)
    Format: A9K2M5, 3T7B1H, K4N9A2
    Note: Excludes 0 (zero) to avoid confusion with O (letter)
    """
    import random
    import string

    while True:
        # Generate 3 letters and 3 numbers (excluding 0 to avoid confusion with O)
        letters = [random.choice(string.ascii_uppercase) for _ in range(3)]
        digits_without_zero = '123456789'
        numbers = [random.choice(digits_without_zero) for _ in range(3)]

        # Combine and shuffle
        chars = letters + numbers
        random.shuffle(chars)
        token = ''.join(chars)

        # Check if token already exists
        existing = db.query(TokenAcessoSimulado).filter(TokenAcessoSimulado.token == token).first()
        if not existing:
            return token


def verificar_encerramento_automatico(db: Session, simulado_id: int):
    """
    Check if all students with tokens have finished the simulado
    If so, automatically set status to ENCERRADO
    """
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado or simulado.status == ModelStatus.ENCERRADO:
        return False

    # Get all active tokens for this simulado
    tokens_ativos = db.query(TokenAcessoSimulado).join(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.simulado_id == simulado_id,
        TokenAcessoSimulado.ativo == True
    ).all()

    if not tokens_ativos:
        return False

    # Get all aluno_ids that have tokens
    aluno_ids_com_token = [t.aluno_id for t in tokens_ativos]

    # Count how many have finished
    finalizados = db.query(ResultadoSimuladoAluno).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.aluno_id.in_(aluno_ids_com_token),
        ResultadoSimuladoAluno.finalizado == True
    ).count()

    # If all students with tokens have finished, close the simulado
    if finalizados >= len(aluno_ids_com_token):
        simulado.status = ModelStatus.ENCERRADO
        db.commit()
        return True

    return False


def atualizar_resultado_aluno(db: Session, simulado_id: int, aluno_id: int, verificar_encerramento: bool = True):
    """
    Calculate and update student's result for a simulado
    Called after student submits answers
    
    Args:
        verificar_encerramento: If True, checks if all students finished and auto-closes simulado
    """
    # Get all questions in simulado
    simulado_questoes = db.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).all()

    total_questoes = len(simulado_questoes)
    if total_questoes == 0:
        return None

    # Get student's answers
    respostas = db.query(RespostaAlunoSAEB).join(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id,
        RespostaAlunoSAEB.aluno_id == aluno_id
    ).all()

    total_acertos = sum(1 for r in respostas if r.correta)
    total_erros = len(respostas) - total_acertos
    porcentagem = int((total_acertos / total_questoes) * 100)
    situacao = calcular_situacao(porcentagem)

    # Check if result exists
    resultado = db.query(ResultadoSimuladoAluno).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.aluno_id == aluno_id
    ).first()

    if resultado:
        # Update existing
        resultado.total_questoes = total_questoes
        resultado.total_acertos = total_acertos
        resultado.total_erros = total_erros
        resultado.porcentagem = porcentagem
        resultado.situacao = situacao
        resultado.finalizado = len(respostas) == total_questoes
        if resultado.finalizado and not resultado.data_finalizacao:
            resultado.data_finalizacao = datetime.utcnow()
    else:
        # Create new
        resultado = ResultadoSimuladoAluno(
            simulado_id=simulado_id,
            aluno_id=aluno_id,
            total_questoes=total_questoes,
            total_acertos=total_acertos,
            total_erros=total_erros,
            porcentagem=porcentagem,
            situacao=situacao,
            finalizado=len(respostas) == total_questoes,
            data_finalizacao=datetime.utcnow() if len(respostas) == total_questoes else None
        )
        db.add(resultado)

    db.commit()

    # Check if all students have finished and auto-close simulado
    if verificar_encerramento and resultado.finalizado:
        verificar_encerramento_automatico(db, simulado_id)

    return resultado


# ============================================
# DESCRIPTORS (GESTÃO MUNICIPAL)
# ============================================

@router.post("/descritores", response_model=DescritorSAEBResponse, status_code=status.HTTP_201_CREATED)
async def create_descritor(
    descritor_data: DescritorSAEBCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Create SAEB descriptor (GESTÃO MUNICIPAL only)"""
    # Check if code already exists
    existing = db.query(DescritorSAEB).filter(DescritorSAEB.codigo == descritor_data.codigo).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Descritor com código '{descritor_data.codigo}' já existe"
        )

    db_descritor = DescritorSAEB(**descritor_data.dict())
    db.add(db_descritor)
    db.commit()
    db.refresh(db_descritor)

    return db_descritor


@router.get("/descritores", response_model=List[DescritorSAEBResponse])
async def list_descritores(
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List SAEB descriptors (simplified - no discipline/year/block filters)"""
    query = db.query(DescritorSAEB)

    if ativo is not None:
        query = query.filter(DescritorSAEB.ativo == ativo)

    descritores = query.offset(skip).limit(limit).all()
    return descritores


@router.get("/descritores/template")
async def download_template_descritores(
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Download template Excel para importação de descritores (GESTÃO MUNICIPAL only)
    """
    from fastapi.responses import FileResponse
    import os

    # Procurar pelo template mais recente ou o padrão
    template_dir = os.path.join(os.path.dirname(__file__), "..", "..")
    template_files = [
        f for f in os.listdir(template_dir)
        if f.startswith("template_descritores_saeb") and f.endswith(".xlsx")
    ]

    if not template_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template não encontrado. Execute o script gerar_template_descritores.py"
        )

    # Pegar o arquivo mais recente
    template_files.sort(reverse=True)
    template_path = os.path.join(template_dir, template_files[0])

    return FileResponse(
        path=template_path,
        filename="template_descritores_saeb.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/descritores/{descritor_id}", response_model=DescritorSAEBResponse)
async def get_descritor(
    descritor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get descriptor by ID"""
    descritor = db.query(DescritorSAEB).filter(DescritorSAEB.id == descritor_id).first()
    if not descritor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descritor não encontrado")
    return descritor


@router.put("/descritores/{descritor_id}", response_model=DescritorSAEBResponse)
async def update_descritor(
    descritor_id: int,
    descritor_data: DescritorSAEBUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Update descriptor"""
    descritor = db.query(DescritorSAEB).filter(DescritorSAEB.id == descritor_id).first()
    if not descritor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descritor não encontrado")

    if descritor_data.descricao is not None:
        descritor.descricao = descritor_data.descricao
    if descritor_data.ativo is not None:
        descritor.ativo = descritor_data.ativo

    db.commit()
    db.refresh(descritor)
    return descritor


@router.delete("/descritores/{descritor_id}")
async def delete_descritor(
    descritor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Delete descriptor (soft delete)"""
    descritor = db.query(DescritorSAEB).filter(DescritorSAEB.id == descritor_id).first()
    if not descritor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descritor não encontrado")

    descritor.ativo = False
    db.commit()
    return {"message": "Descritor desativado com sucesso"}


@router.post("/descritores/importar", response_model=DescritorSAEBBulkImportResponse)
async def bulk_import_descritores_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Bulk import descritores from Excel file (GESTÃO MUNICIPAL only)

    Expects Excel file with columns: disciplina, ano_escolar, codigo, descricao
    Skips descriptors with duplicate codes.
    """
    # Validar extensão do arquivo
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas arquivos Excel (.xlsx, .xls) são permitidos"
        )

    try:
        # Ler arquivo Excel
        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents))
        sheet = workbook.active

        # Validar cabeçalhos (primeira linha)
        headers = [cell.value for cell in sheet[1]]
        # Normalizar cabeçalhos para comparação (remover acentos e converter para lowercase)
        def normalize_header(h):
            if h is None:
                return ""
            h = str(h).lower().strip()
            # Remover acentos comuns
            h = h.replace('ó', 'o').replace('ã', 'a').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ú', 'u').replace('ç', 'c')
            return h
        
        normalized_headers = [normalize_header(h) for h in headers[:4]]
        expected_normalized = ["disciplina", "ano escolar", "codigo", "descricao"]

        print(f"[DEBUG] Headers recebidos: {headers[:4]}")
        print(f"[DEBUG] Headers normalizados: {normalized_headers}")
        print(f"[DEBUG] Headers esperados: {expected_normalized}")

        if normalized_headers != expected_normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cabeçalhos inválidos. Recebido: {headers[:4]}, Esperado: ['Disciplina', 'Ano Escolar', 'Código', 'Descrição']"
            )

        total = 0
        sucesso = 0
        falhas = 0
        duplicados = 0
        erros = []

        # Processar cada linha (começando da linha 2, pulando cabeçalho)
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            # Pular linhas vazias
            if not any(row):
                continue

            total += 1

            try:
                disciplina_str, ano_escolar, codigo, descricao = row[:4]

                # Validar campos obrigatórios
                if not all([disciplina_str, ano_escolar, codigo, descricao]):
                    erros.append(f"Linha {row_idx}: Campos obrigatórios faltando")
                    falhas += 1
                    continue

                # Converter disciplina
                from ..models import DisciplinaSAEB
                if disciplina_str not in ['PORTUGUES', 'MATEMATICA']:
                    erros.append(f"Linha {row_idx}: Disciplina inválida '{disciplina_str}'")
                    falhas += 1
                    continue

                disciplina = DisciplinaSAEB[disciplina_str]

                # Validar ano escolar
                if int(ano_escolar) not in [5, 9]:
                    erros.append(f"Linha {row_idx}: Ano escolar deve ser 5 ou 9")
                    falhas += 1
                    continue

                # Verificar se descritor já existe (mesmo código + disciplina + ano escolar)
                existing = db.query(DescritorSAEB).filter(
                    DescritorSAEB.codigo == str(codigo).strip(),
                    DescritorSAEB.disciplina == disciplina,
                    DescritorSAEB.ano_escolar == int(ano_escolar)
                ).first()

                if existing:
                    # Se estiver inativo, reativar
                    if not existing.ativo:
                        existing.ativo = True
                        existing.descricao = str(descricao).strip()  # Atualiza descrição também
                        sucesso += 1
                    else:
                        duplicados += 1
                    continue

                # Criar novo descritor
                db_descritor = DescritorSAEB(
                    disciplina=disciplina,
                    ano_escolar=int(ano_escolar),
                    codigo=str(codigo).strip(),
                    descricao=str(descricao).strip()
                )
                db.add(db_descritor)
                sucesso += 1

            except Exception as e:
                erros.append(f"Linha {row_idx}: {str(e)}")
                falhas += 1

        # Commit todas as inserções e atualizações bem-sucedidas
        if sucesso > 0:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao salvar descritores: {str(e)}"
                )

        return DescritorSAEBBulkImportResponse(
            total=total,
            sucesso=sucesso,
            falha=falhas,
            duplicados=duplicados,
            erros=erros[:10]  # Limitar a 10 erros para não sobrecarregar a resposta
        )

    except openpyxl.utils.exceptions.InvalidFileException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo Excel inválido ou corrompido"
        )
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        import traceback
        error_msg = str(e) if str(e) else repr(e)
        print(f"[ERROR] Erro ao processar arquivo Excel: {error_msg}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar arquivo: {error_msg}"
        )


# ============================================
# CONFIGURAÇÕES SAEB (GESTÃO MUNICIPAL)
# ============================================

@router.get("/configuracoes", response_model=List[ConfiguracaoSAEBResponse])
async def list_configuracoes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List SAEB configurations (questions per block by year)"""
    configuracoes = db.query(ConfiguracaoSAEB).order_by(ConfiguracaoSAEB.ano_escolar).all()
    return configuracoes


@router.get("/configuracoes/{ano_escolar}", response_model=ConfiguracaoSAEBResponse)
async def get_configuracao(
    ano_escolar: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get configuration for specific school year"""
    config = db.query(ConfiguracaoSAEB).filter(ConfiguracaoSAEB.ano_escolar == ano_escolar).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração para ano escolar {ano_escolar} não encontrada"
        )
    return config


@router.post("/configuracoes", response_model=ConfiguracaoSAEBResponse, status_code=status.HTTP_201_CREATED)
async def create_configuracao(
    config_data: ConfiguracaoSAEBCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Create SAEB configuration (GESTÃO MUNICIPAL only)"""
    # Check if configuration already exists for this year
    existing = db.query(ConfiguracaoSAEB).filter(
        ConfiguracaoSAEB.ano_escolar == config_data.ano_escolar
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Configuração para ano escolar {config_data.ano_escolar} já existe"
        )

    db_config = ConfiguracaoSAEB(**config_data.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@router.put("/configuracoes/{ano_escolar}", response_model=ConfiguracaoSAEBResponse)
async def update_configuracao(
    ano_escolar: int,
    config_data: ConfiguracaoSAEBUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Update SAEB configuration (GESTÃO MUNICIPAL only)"""
    config = db.query(ConfiguracaoSAEB).filter(ConfiguracaoSAEB.ano_escolar == ano_escolar).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração para ano escolar {ano_escolar} não encontrada"
        )

    update_data = config_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return config


@router.delete("/configuracoes/{ano_escolar}")
async def delete_configuracao(
    ano_escolar: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Delete SAEB configuration (GESTÃO MUNICIPAL only)"""
    config = db.query(ConfiguracaoSAEB).filter(ConfiguracaoSAEB.ano_escolar == ano_escolar).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Configuração para ano escolar {ano_escolar} não encontrada"
        )

    db.delete(config)
    db.commit()
    return {"message": f"Configuração para ano escolar {ano_escolar} removida com sucesso"}


# ============================================
# QUESTIONS (GESTÃO MUNICIPAL)
# ============================================

@router.post("/questoes", response_model=QuestaoSAEBResponse, status_code=status.HTTP_201_CREATED)
async def create_questao(
    questao_data: QuestaoSAEBCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Create SAEB question (GESTÃO MUNICIPAL only)"""
    # Verify descriptor exists
    descritor = db.query(DescritorSAEB).filter(DescritorSAEB.id == questao_data.descritor_id).first()
    if not descritor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Descritor não encontrado")

    db_questao = QuestaoSAEB(**questao_data.dict())
    db.add(db_questao)
    db.commit()
    db.refresh(db_questao)

    return db_questao


@router.get("/questoes", response_model=List[QuestaoSAEBComDescritor])
async def list_questoes(
    descritor_id: Optional[int] = None,
    disciplina: Optional[SchemaDisciplina] = None,
    ano_escolar: Optional[int] = None,
    bloco: Optional[int] = None,
    ativo: Optional[bool] = True,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """List SAEB questions with filters (filters now on question, not descriptor)"""
    query = db.query(QuestaoSAEB).join(DescritorSAEB)

    if descritor_id:
        query = query.filter(QuestaoSAEB.descritor_id == descritor_id)
    if disciplina:
        query = query.filter(QuestaoSAEB.disciplina == disciplina.value)
    if ano_escolar:
        query = query.filter(QuestaoSAEB.ano_escolar == ano_escolar)
    if bloco:
        query = query.filter(QuestaoSAEB.bloco == bloco)
    
    # Por padrão, filtra apenas questões ativas (ativo=True)
    # Se ativo=None, não aplica filtro (retorna todas)
    # Se ativo=False, retorna apenas inativas
    if ativo is not None:
        query = query.filter(QuestaoSAEB.ativo == ativo)

    questoes = query.offset(skip).limit(limit).all()

    # Build response with descritor
    result = []
    for q in questoes:
        result.append({
            "id": q.id,
            "descritor_id": q.descritor_id,
            "enunciado": q.enunciado,
            "disciplina": q.disciplina.value,
            "bloco": q.bloco.value,
            "ano_escolar": q.ano_escolar,
            "alternativa_a": q.alternativa_a,
            "alternativa_b": q.alternativa_b,
            "alternativa_c": q.alternativa_c,
            "alternativa_d": q.alternativa_d,
            "alternativa_e": q.alternativa_e,
            "gabarito": q.gabarito,
            "ativo": q.ativo,
            "created_at": q.created_at,
            "descritor": {
                "id": q.descritor.id,
                "disciplina": q.descritor.disciplina.value,
                "ano_escolar": q.descritor.ano_escolar,
                "codigo": q.descritor.codigo,
                "descricao": q.descritor.descricao,
                "ativo": q.descritor.ativo,
                "created_at": q.descritor.created_at
            }
        })

    return result


@router.get("/questoes/{questao_id}", response_model=QuestaoSAEBComDescritor)
async def get_questao(
    questao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Get question by ID"""
    questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questão não encontrada")

    return {
        "id": questao.id,
        "descritor_id": questao.descritor_id,
        "enunciado": questao.enunciado,
        "disciplina": questao.disciplina.value,
        "bloco": questao.bloco.value,
        "ano_escolar": questao.ano_escolar,
        "alternativa_a": questao.alternativa_a,
        "alternativa_b": questao.alternativa_b,
        "alternativa_c": questao.alternativa_c,
        "alternativa_d": questao.alternativa_d,
        "alternativa_e": questao.alternativa_e,
        "gabarito": questao.gabarito,
        "ativo": questao.ativo,
        "created_at": questao.created_at,
        "descritor": {
            "id": questao.descritor.id,
            "codigo": questao.descritor.codigo,
            "descricao": questao.descritor.descricao,
            "ativo": questao.descritor.ativo,
            "created_at": questao.descritor.created_at
        }
    }


@router.put("/questoes/{questao_id}", response_model=QuestaoSAEBResponse)
async def update_questao(
    questao_id: int,
    questao_data: QuestaoSAEBUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Update question"""
    questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questão não encontrada")

    update_data = questao_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(questao, field, value)

    db.commit()
    db.refresh(questao)
    return questao


@router.delete("/questoes/{questao_id}")
async def delete_questao(
    questao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Delete question (soft delete)"""
    questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questão não encontrada")

    questao.ativo = False
    db.commit()
    return {"message": "Questão desativada com sucesso"}


@router.post("/questoes/importar")
async def bulk_import_questoes_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Bulk import questões from Excel file (GESTÃO MUNICIPAL only)
    
    Expects Excel file with columns: 
    Código Descritor, Enunciado, Alternativa A, Alternativa B, 
    Alternativa C, Alternativa D, Alternativa E, Gabarito, Bloco
    
    The disciplina and ano_escolar are inferred from the sheet name or descritor.
    """
    # Validar extensão do arquivo
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas arquivos Excel (.xlsx, .xls) são permitidos"
        )

    try:
        # Ler arquivo Excel
        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents))
        
        total = 0
        sucesso = 0
        falhas = 0
        erros = []
        
        # Processar cada aba (sheet)
        for sheet_name in workbook.sheetnames:
            sheet = workbook[sheet_name]
            
            # Determinar disciplina e ano do nome da aba
            sheet_lower = sheet_name.lower()
            if 'portugu' in sheet_lower or 'língua' in sheet_lower:
                disciplina = ModelDisciplina.PORTUGUES
            elif 'matemat' in sheet_lower or 'matem' in sheet_lower:
                disciplina = ModelDisciplina.MATEMATICA
            else:
                erros.append(f"Aba '{sheet_name}': Não foi possível determinar a disciplina")
                continue
            
            if '5' in sheet_name:
                ano_escolar = 5
            elif '9' in sheet_name:
                ano_escolar = 9
            else:
                erros.append(f"Aba '{sheet_name}': Não foi possível determinar o ano escolar (5 ou 9)")
                continue
            
            # Validar cabeçalhos
            headers = [cell.value for cell in sheet[1] if cell.value]
            
            # Processar cada linha
            for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                # Pular linhas vazias
                if not any(row):
                    continue
                
                total += 1
                
                try:
                    codigo_descritor = row[0]
                    enunciado = row[1]
                    alt_a = row[2]
                    alt_b = row[3]
                    alt_c = row[4]
                    alt_d = row[5]
                    alt_e = row[6]
                    gabarito = row[7]
                    bloco_str = row[8] if len(row) > 8 else "BLOCO_1"
                    
                    # Validar campos obrigatórios
                    if not all([codigo_descritor, enunciado, alt_a, alt_b, alt_c, alt_d, alt_e, gabarito]):
                        erros.append(f"Aba '{sheet_name}', Linha {row_idx}: Campos obrigatórios faltando")
                        falhas += 1
                        continue
                    
                    # Buscar descritor
                    descritor = db.query(DescritorSAEB).filter(
                        DescritorSAEB.codigo == str(codigo_descritor).strip(),
                        DescritorSAEB.disciplina == disciplina,
                        DescritorSAEB.ano_escolar == ano_escolar
                    ).first()
                    
                    if not descritor:
                        erros.append(f"Aba '{sheet_name}', Linha {row_idx}: Descritor '{codigo_descritor}' não encontrado para {disciplina.value} {ano_escolar}º ano")
                        falhas += 1
                        continue
                    
                    # Determinar bloco
                    from ..models import BlocoSAEB
                    if bloco_str and 'BLOCO_2' in str(bloco_str).upper():
                        bloco = BlocoSAEB.BLOCO_2
                    else:
                        bloco = BlocoSAEB.BLOCO_1
                    
                    # Validar gabarito
                    gabarito_upper = str(gabarito).strip().upper()
                    if gabarito_upper not in ['A', 'B', 'C', 'D', 'E']:
                        erros.append(f"Aba '{sheet_name}', Linha {row_idx}: Gabarito inválido '{gabarito}'")
                        falhas += 1
                        continue
                    
                    # Criar questão
                    db_questao = QuestaoSAEB(
                        descritor_id=descritor.id,
                        enunciado=str(enunciado).strip(),
                        disciplina=disciplina,
                        bloco=bloco,
                        ano_escolar=ano_escolar,
                        alternativa_a=str(alt_a).strip(),
                        alternativa_b=str(alt_b).strip(),
                        alternativa_c=str(alt_c).strip(),
                        alternativa_d=str(alt_d).strip(),
                        alternativa_e=str(alt_e).strip(),
                        gabarito=gabarito_upper
                    )
                    db.add(db_questao)
                    sucesso += 1
                    
                except Exception as e:
                    erros.append(f"Aba '{sheet_name}', Linha {row_idx}: {str(e)}")
                    falhas += 1
        
        # Commit todas as inserções bem-sucedidas
        if sucesso > 0:
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Erro ao salvar questões: {str(e)}"
                )
        
        return {
            "total": total,
            "sucesso": sucesso,
            "falha": falhas,
            "erros": erros[:20]  # Limitar a 20 erros
        }
    
    except openpyxl.utils.exceptions.InvalidFileException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo Excel inválido ou corrompido"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Erro ao processar arquivo Excel de questões: {str(e)}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )


# ============================================
# SIMULADOS (GESTÃO MUNICIPAL)
# ============================================

@router.post("/simulados", response_model=SimuladoSAEBResponse, status_code=status.HTTP_201_CREATED)
async def create_simulado(
    simulado_data: SimuladoSAEBCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Create SAEB simulado (GESTÃO MUNICIPAL only)"""
    # Create simulado
    db_simulado = SimuladoSAEB(
        nome=simulado_data.nome,
        descricao=simulado_data.descricao,
        ano_escolar=simulado_data.ano_escolar,
        ano_letivo=simulado_data.ano_letivo,
        data_disponivel=simulado_data.data_disponivel,
        data_limite=simulado_data.data_limite
    )
    db.add(db_simulado)
    db.flush()  # Get ID without committing

    # Add questions
    for idx, questao_id in enumerate(simulado_data.questoes_ids, start=1):
        questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == questao_id).first()
        if not questao:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Questão {questao_id} não encontrada"
            )

        simulado_questao = SimuladoQuestao(
            simulado_id=db_simulado.id,
            questao_id=questao_id,
            ordem=idx
        )
        db.add(simulado_questao)

    db.commit()
    db.refresh(db_simulado)

    # Add total_questoes to response
    response = SimuladoSAEBResponse(
        id=db_simulado.id,
        nome=db_simulado.nome,
        descricao=db_simulado.descricao,
        ano_escolar=db_simulado.ano_escolar,
        ano_letivo=db_simulado.ano_letivo,
        data_disponivel=db_simulado.data_disponivel,
        data_limite=db_simulado.data_limite,
        status=db_simulado.status,
        ativo=db_simulado.ativo,
        created_at=db_simulado.created_at,
        total_questoes=len(simulado_data.questoes_ids)
    )

    return response


@router.get("/simulados", response_model=List[SimuladoSAEBResponse])
async def list_simulados(
    ano_escolar: Optional[int] = None,
    ano_letivo: Optional[int] = None,
    status_filter: Optional[str] = None,
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    List SAEB simulados with filters.
    For PROFESSOR users, only shows simulados for years they teach (5º or 9º ano).
    """
    query = db.query(SimuladoSAEB)

    # If user is a professor, filter by anos escolares of their turmas
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        professor = db.query(Professor).filter(Professor.usuario_id == current_user.id).first()
        if professor:
            # Get distinct anos escolares from professor's turmas (only 5 and 9)
            anos_professor = db.query(Turma.ano_escolar).filter(
                Turma.professor_id == professor.id,
                Turma.ativo == True,
                Turma.ano_escolar.in_([5, 9])  # Only SAEB years
            ).distinct().all()
            
            anos_list = [a[0] for a in anos_professor]
            
            if not anos_list:
                # Professor has no 5º/9º ano classes, return empty
                return []
            
            query = query.filter(SimuladoSAEB.ano_escolar.in_(anos_list))

    if ano_escolar:
        query = query.filter(SimuladoSAEB.ano_escolar == ano_escolar)
    if ano_letivo:
        query = query.filter(SimuladoSAEB.ano_letivo == ano_letivo)
    if status_filter:
        query = query.filter(SimuladoSAEB.status == status_filter)
    if ativo is not None:
        query = query.filter(SimuladoSAEB.ativo == ativo)

    simulados = query.offset(skip).limit(limit).all()

    # Add total_questoes to each
    result = []
    for s in simulados:
        total_questoes = db.query(func.count(SimuladoQuestao.id)).filter(
            SimuladoQuestao.simulado_id == s.id
        ).scalar()

        result.append(SimuladoSAEBResponse(
            id=s.id,
            nome=s.nome,
            descricao=s.descricao,
            ano_escolar=s.ano_escolar,
            ano_letivo=s.ano_letivo,
            data_disponivel=s.data_disponivel,
            data_limite=s.data_limite,
            status=s.status,
            ativo=s.ativo,
            created_at=s.created_at,
            total_questoes=total_questoes or 0
        ))

    return result


@router.get("/simulados/{simulado_id}", response_model=SimuladoSAEBDetalhado)
async def get_simulado(
    simulado_id: int,
    include_gabarito: bool = False,
    db: Session = Depends(get_db),
    current_user_or_student: Union[Usuario, dict] = Depends(get_user_or_student)
):
    """Get simulado by ID with questions - Accessible by both users and students"""
    # If student token, validate they can only access their assigned simulado
    if isinstance(current_user_or_student, dict) and current_user_or_student.get("type") == "student_token":
        if current_user_or_student["simulado_id"] != simulado_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem acesso a este simulado"
            )
    
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Get questions in order
    simulado_questoes = db.query(SimuladoQuestao).options(
        joinedload(SimuladoQuestao.questao).joinedload(QuestaoSAEB.descritor)
    ).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).order_by(SimuladoQuestao.ordem).all()

    questoes_data = []
    for sq in simulado_questoes:
        q = sq.questao
        
        # Skip questions without descritor
        if not q.descritor:
            continue
        
        # Safely handle None values and convert enums
        try:
            disciplina_value = q.disciplina.value if q.disciplina else ""
            bloco_value = q.bloco.value if q.bloco else 1
        except Exception as e:
            print(f"Erro ao processar questão {q.id}: {e}")
            continue
            
        questao_dict = {
            "id": q.id,
            "descritor_id": q.descritor_id,
            "enunciado": q.enunciado or "",
            "disciplina": disciplina_value,
            "bloco": bloco_value,
            "ano_escolar": q.ano_escolar or 0,
            "alternativa_a": q.alternativa_a or "",
            "alternativa_b": q.alternativa_b or "",
            "alternativa_c": q.alternativa_c or "",
            "alternativa_d": q.alternativa_d or "",
            "alternativa_e": q.alternativa_e or "",
            "ativo": q.ativo,
            "created_at": q.created_at,
            "descritor": {
                "id": q.descritor.id,
                "disciplina": q.descritor.disciplina.value if q.descritor.disciplina else "",
                "ano_escolar": q.descritor.ano_escolar or 0,
                "codigo": q.descritor.codigo or "",
                "descricao": q.descritor.descricao or "",
                "ativo": q.descritor.ativo,
                "created_at": q.descritor.created_at
            }
        }

        # Determine if gabarito should be shown
        # Users (gestores, professores) can always see gabarito if requested
        # Students never see gabarito unless explicitly allowed
        is_student = isinstance(current_user_or_student, dict) and current_user_or_student.get("type") == "student_token"
        
        if include_gabarito and not is_student:
            # Se gabarito está vazio ou None, retornar None
            questao_dict["gabarito"] = q.gabarito if q.gabarito and q.gabarito.strip() else None
        else:
            questao_dict["gabarito"] = None  # Hide gabarito from students

        questoes_data.append(questao_dict)

    return {
        "id": simulado.id,
        "nome": simulado.nome,
        "descricao": simulado.descricao,
        "ano_escolar": simulado.ano_escolar,
        "ano_letivo": simulado.ano_letivo,
        "data_disponivel": simulado.data_disponivel,
        "data_limite": simulado.data_limite,
        "status": simulado.status,
        "ativo": simulado.ativo,
        "created_at": simulado.created_at,
        "total_questoes": len(questoes_data),
        "questoes": questoes_data
    }


@router.put("/simulados/{simulado_id}", response_model=SimuladoSAEBResponse)
async def update_simulado(
    simulado_id: int,
    simulado_data: SimuladoSAEBUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Update simulado - including questions if provided"""
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Extract questoes_ids before updating (as it's not a model field)
    questoes_ids = None
    update_data = simulado_data.dict(exclude_unset=True)
    if "questoes_ids" in update_data:
        questoes_ids = update_data.pop("questoes_ids")

    # Update simulado fields
    for field, value in update_data.items():
        setattr(simulado, field, value)

    # Update questions if provided
    if questoes_ids is not None:
        # Remove existing questions
        db.query(SimuladoQuestao).filter(SimuladoQuestao.simulado_id == simulado_id).delete()

        # Add new questions in order
        for idx, questao_id in enumerate(questoes_ids):
            questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == questao_id).first()
            if not questao:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Questão {questao_id} não encontrada"
                )

            simulado_questao = SimuladoQuestao(
                simulado_id=simulado_id,
                questao_id=questao_id,
                ordem=idx
            )
            db.add(simulado_questao)

    db.commit()
    db.refresh(simulado)

    total_questoes = db.query(func.count(SimuladoQuestao.id)).filter(
        SimuladoQuestao.simulado_id == simulado.id
    ).scalar()

    return SimuladoSAEBResponse(
        id=simulado.id,
        nome=simulado.nome,
        descricao=simulado.descricao,
        ano_escolar=simulado.ano_escolar,
        ano_letivo=simulado.ano_letivo,
        data_disponivel=simulado.data_disponivel,
        data_limite=simulado.data_limite,
        status=simulado.status,
        ativo=simulado.ativo,
        created_at=simulado.created_at,
        total_questoes=total_questoes or 0
    )


@router.get("/simulados/{simulado_id}/questoes")
async def listar_questoes_simulado(
    simulado_id: int,
    db: Session = Depends(get_db),
    student_session: dict = Depends(get_current_student_from_token)
):
    """Lista todas as questões de um simulado específico - Student access only"""
    # Validate that student is accessing their assigned simulado
    if student_session["simulado_id"] != simulado_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso a este simulado"
        )
    
    # Get aluno_id from student token
    aluno_id = student_session["aluno_id"]
    
    # Verificar se aluno finalizou o simulado
    resultado_aluno = db.query(ResultadoSimuladoAluno).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.aluno_id == aluno_id
    ).first()
    
    show_gabarito = resultado_aluno is not None and resultado_aluno.finalizado
    
    # Verificar se simulado existe
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Buscar questões do simulado ordenadas
    simulado_questoes = db.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).order_by(SimuladoQuestao.ordem).all()

    resultado = []
    for sq in simulado_questoes:
        questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == sq.questao_id).first()
        if questao:
            descritor = db.query(DescritorSAEB).filter(DescritorSAEB.id == questao.descritor_id).first()
            resultado.append({
                "id": sq.id,
                "simulado_id": sq.simulado_id,
                "questao_id": sq.questao_id,
                "ordem": sq.ordem,
                "questao": {
                    "id": questao.id,
                    "enunciado": questao.enunciado,
                    "disciplina": questao.disciplina,
                    "bloco": questao.bloco,
                    "ano_escolar": questao.ano_escolar,
                    "gabarito": questao.gabarito if show_gabarito else None,  # Só mostra gabarito se finalizou
                    "ativo": questao.ativo,
                    "alternativa_a": questao.alternativa_a,
                    "alternativa_b": questao.alternativa_b,
                    "alternativa_c": questao.alternativa_c,
                    "alternativa_d": questao.alternativa_d,
                    "alternativa_e": questao.alternativa_e,
                    "descritor": {
                        "id": descritor.id if descritor else None,
                        "codigo": descritor.codigo if descritor else None,
                        "descricao": descritor.descricao if descritor else None
                    } if descritor else None
                }
            })
        else:
            # Questão foi deletada do banco
            resultado.append({
                "id": sq.id,
                "simulado_id": sq.simulado_id,
                "questao_id": sq.questao_id,
                "ordem": sq.ordem,
                "questao": None,  # Questão não existe mais
                "questao_removida": True
            })

    return resultado


@router.post("/simulados/{simulado_id}/questoes/{questao_id}")
async def adicionar_questao_simulado(
    simulado_id: int,
    questao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Adiciona uma questão ao simulado (no final da ordem)"""
    # Verificar se simulado existe
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Verificar se questão existe
    questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == questao_id).first()
    if not questao:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questão não encontrada")

    # Verificar se o ano escolar da questão corresponde ao do simulado
    if questao.ano_escolar != simulado.ano_escolar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"A questão é do {questao.ano_escolar}º ano, mas o simulado é do {simulado.ano_escolar}º ano"
        )

    # Buscar configuração de questões por bloco para o ano escolar
    config = db.query(ConfiguracaoSAEB).filter(ConfiguracaoSAEB.ano_escolar == simulado.ano_escolar).first()
    if not config:
        # Valores padrão se não houver configuração
        questoes_por_bloco = 11 if simulado.ano_escolar == 5 else 13
    else:
        questoes_por_bloco = config.questoes_por_bloco

    # Contar quantas questões já existem no simulado para a mesma disciplina e bloco
    questoes_mesmo_bloco = db.query(SimuladoQuestao).join(QuestaoSAEB).filter(
        SimuladoQuestao.simulado_id == simulado_id,
        QuestaoSAEB.disciplina == questao.disciplina,
        QuestaoSAEB.bloco == questao.bloco
    ).count()

    if questoes_mesmo_bloco >= questoes_por_bloco:
        bloco_nome = "Bloco 1" if questao.bloco.value == 1 else "Bloco 2"
        disciplina_nome = "Português" if questao.disciplina.value == "portugues" else "Matemática"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Limite atingido! O {bloco_nome} de {disciplina_nome} já possui {questoes_por_bloco} questões (máximo permitido para o {simulado.ano_escolar}º ano)"
        )

    # Verificar se a questão já está no simulado
    existe = db.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id,
        SimuladoQuestao.questao_id == questao_id
    ).first()

    if existe:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Questão já está no simulado")

    # Pegar a próxima ordem disponível
    max_ordem = db.query(func.max(SimuladoQuestao.ordem)).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).scalar()

    nova_ordem = (max_ordem + 1) if max_ordem is not None else 0

    # Adicionar a questão
    simulado_questao = SimuladoQuestao(
        simulado_id=simulado_id,
        questao_id=questao_id,
        ordem=nova_ordem
    )
    db.add(simulado_questao)
    db.commit()
    db.refresh(simulado_questao)

    return {
        "success": True,
        "message": "Questão adicionada com sucesso",
        "simulado_questao_id": simulado_questao.id,
        "ordem": simulado_questao.ordem
    }


@router.delete("/simulados/{simulado_id}/questoes/{simulado_questao_id}")
async def remover_questao_simulado(
    simulado_id: int,
    simulado_questao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Remove uma questão do simulado e reorganiza a ordem"""
    # Buscar a questão no simulado
    simulado_questao = db.query(SimuladoQuestao).filter(
        SimuladoQuestao.id == simulado_questao_id,
        SimuladoQuestao.simulado_id == simulado_id
    ).first()

    if not simulado_questao:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Questão não encontrada no simulado")

    ordem_removida = simulado_questao.ordem

    # Remover a questão primeiro
    db.delete(simulado_questao)
    db.flush()  # Executar o delete antes de reorganizar

    # Reorganizar as ordens das questões seguintes
    # Usando update direto para evitar problemas com constraint única
    db.execute(
        SimuladoQuestao.__table__.update()
        .where(SimuladoQuestao.simulado_id == simulado_id)
        .where(SimuladoQuestao.ordem > ordem_removida)
        .values(ordem=SimuladoQuestao.ordem - 1)
    )

    db.commit()

    return {
        "success": True,
        "message": "Questão removida com sucesso"
    }


@router.put("/simulados/{simulado_id}/questoes/reordenar")
async def reordenar_questoes_simulado(
    simulado_id: int,
    ordem_questoes: list[int],  # Lista de simulado_questao_ids na nova ordem
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Reordena as questões do simulado"""
    # Verificar se simulado existe
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Buscar todas as questões do simulado
    todas_questoes = db.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).all()

    # Verificar se a lista contém todas as questões
    if len(ordem_questoes) != len(todas_questoes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A lista deve conter todas as questões do simulado"
        )

    # Atualizar as ordens
    for idx, simulado_questao_id in enumerate(ordem_questoes):
        questao = db.query(SimuladoQuestao).filter(
            SimuladoQuestao.id == simulado_questao_id,
            SimuladoQuestao.simulado_id == simulado_id
        ).first()

        if not questao:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Questão {simulado_questao_id} não encontrada no simulado"
            )

        questao.ordem = idx

    db.commit()

    return {
        "success": True,
        "message": "Questões reordenadas com sucesso"
    }


# ============================================
# PARTICIPAÇÃO (PROFESSOR)
# ============================================

@router.post("/participacoes", response_model=ParticipacaoSimuladoResponse, status_code=status.HTTP_201_CREATED)
async def liberar_simulado_turma(
    participacao_data: ParticipacaoSimuladoCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Teacher releases simulado to their class
    Creates participation record allowing students to take the exam
    Accepts simulados with status PUBLICADO or EM_ANDAMENTO (to allow multiple class releases)
    """
    # Verify simulado exists and is available for release
    simulado = db.query(SimuladoSAEB).filter(
        SimuladoSAEB.id == participacao_data.simulado_id,
        SimuladoSAEB.ativo == True
    ).first()

    if not simulado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulado não encontrado ou inativo"
        )

    # Allow liberation if simulado is PUBLICADO or EM_ANDAMENTO (already released to another class)
    if simulado.status not in [ModelStatus.PUBLICADO, ModelStatus.EM_ANDAMENTO]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulado ainda não foi publicado ou já foi encerrado"
        )

    # Verify turma exists and belongs to professor's school
    turma = db.query(Turma).filter(Turma.id == participacao_data.turma_id).first()
    if not turma:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turma não encontrada")

    if turma.escola_id != current_professor.escola_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta turma não pertence à sua escola"
        )

    # Check if already exists
    existing = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.simulado_id == participacao_data.simulado_id,
        ParticipacaoSimulado.turma_id == participacao_data.turma_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulado já liberado para esta turma"
        )

    # Create participation
    db_participacao = ParticipacaoSimulado(
        simulado_id=participacao_data.simulado_id,
        turma_id=participacao_data.turma_id,
        professor_id=current_professor.id,
        liberado=True,
        data_liberacao=datetime.utcnow()
    )

    db.add(db_participacao)
    db.commit()
    db.refresh(db_participacao)

    return db_participacao


@router.get("/participacoes/minhas-turmas", response_model=List[ParticipacaoSimuladoResponse])
async def list_participacoes_professor(
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """List all simulados released by current professor"""
    participacoes = db.query(ParticipacaoSimulado).options(
        joinedload(ParticipacaoSimulado.simulado),
        joinedload(ParticipacaoSimulado.turma)
    ).filter(
        ParticipacaoSimulado.professor_id == current_professor.id
    ).all()

    return participacoes


@router.get("/simulados/disponiveis", response_model=List[SimuladoSAEBResponse])
async def list_simulados_disponiveis_aluno(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    List simulados available for current student
    Based on their class participation
    """
    # Get student's aluno record
    aluno = db.query(Aluno).join(Usuario).filter(
        Aluno.turma_id.isnot(None)
    ).join(Turma).filter(
        Turma.id == Aluno.turma_id
    ).first()

    if not aluno:
        return []

    # Get simulados released to student's class
    participacoes = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.turma_id == aluno.turma_id,
        ParticipacaoSimulado.liberado == True
    ).all()

    simulados = []
    for p in participacoes:
        simulado = db.query(SimuladoSAEB).filter(
            SimuladoSAEB.id == p.simulado_id,
            SimuladoSAEB.ativo == True
        ).first()

        if simulado:
            total_questoes = db.query(func.count(SimuladoQuestao.id)).filter(
                SimuladoQuestao.simulado_id == simulado.id
            ).scalar()

            simulados.append(SimuladoSAEBResponse(
                id=simulado.id,
                nome=simulado.nome,
                descricao=simulado.descricao,
                ano_escolar=simulado.ano_escolar,
                ano_letivo=simulado.ano_letivo,
                data_disponivel=simulado.data_disponivel,
                data_limite=simulado.data_limite,
                status=simulado.status,
                ativo=simulado.ativo,
                created_at=simulado.created_at,
                total_questoes=total_questoes or 0
            ))

    return simulados


# ============================================
# RESPOSTAS DOS ALUNOS
# ============================================

@router.post("/respostas", response_model=RespostaAlunoSAEBResponse, status_code=status.HTTP_201_CREATED)
async def submit_resposta(
    resposta_data: RespostaAlunoSAEBCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Student submits answer to a question
    Automatically checks if answer is correct
    """
    # Get aluno record
    aluno = db.query(Aluno).filter(Aluno.id == current_user.id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de aluno não encontrado"
        )

    # Get simulado_questao with questao
    simulado_questao = db.query(SimuladoQuestao).options(
        joinedload(SimuladoQuestao.questao)
    ).filter(
        SimuladoQuestao.id == resposta_data.simulado_questao_id
    ).first()

    if not simulado_questao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Questão do simulado não encontrada"
        )

    # Check if student has access to this simulado
    participacao = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.simulado_id == simulado_questao.simulado_id,
        ParticipacaoSimulado.turma_id == aluno.turma_id,
        ParticipacaoSimulado.liberado == True
    ).first()

    if not participacao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso a este simulado"
        )

    # Check if answer is correct
    correta = resposta_data.resposta.upper() == simulado_questao.questao.gabarito.upper()

    # Check if answer already exists
    existing = db.query(RespostaAlunoSAEB).filter(
        RespostaAlunoSAEB.simulado_questao_id == resposta_data.simulado_questao_id,
        RespostaAlunoSAEB.aluno_id == aluno.id
    ).first()

    if existing:
        # Update existing answer
        existing.resposta = resposta_data.resposta.upper()
        existing.correta = correta
        db.commit()
        db.refresh(existing)

        # Recalculate result
        atualizar_resultado_aluno(db, simulado_questao.simulado_id, aluno.id)

        return existing

    # Create new answer
    db_resposta = RespostaAlunoSAEB(
        simulado_questao_id=resposta_data.simulado_questao_id,
        aluno_id=aluno.id,
        resposta=resposta_data.resposta.upper(),
        correta=correta
    )

    db.add(db_resposta)
    db.commit()
    db.refresh(db_resposta)

    # Update student result
    atualizar_resultado_aluno(db, simulado_questao.simulado_id, aluno.id)

    return db_resposta


@router.post("/respostas/bulk")
async def submit_respostas_bulk(
    bulk_data: RespostaAlunoSAEBBulk,
    db: Session = Depends(get_db),
    student_session: dict = Depends(get_current_student_from_token)
):
    """
    Student submits all answers at once - Student access only
    More efficient than submitting one by one
    """
    # Get aluno_id from student token
    aluno_id = student_session["aluno_id"]
    
    # Get aluno record
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de aluno não encontrado"
        )

    # Verify access to simulado
    participacao = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.simulado_id == bulk_data.simulado_id,
        ParticipacaoSimulado.turma_id == aluno.turma_id,
        ParticipacaoSimulado.liberado == True
    ).first()

    if not participacao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso a este simulado"
        )

    results = []

    for resposta_data in bulk_data.respostas:
        try:
            # Get simulado_questao with questao
            simulado_questao = db.query(SimuladoQuestao).options(
                joinedload(SimuladoQuestao.questao)
            ).filter(
                SimuladoQuestao.id == resposta_data.simulado_questao_id
            ).first()

            if not simulado_questao:
                results.append({
                    "simulado_questao_id": resposta_data.simulado_questao_id,
                    "error": "Questão não encontrada"
                })
                continue

            # Check if answer is correct
            correta = resposta_data.resposta.upper() == simulado_questao.questao.gabarito.upper()

            # Check if answer already exists
            existing = db.query(RespostaAlunoSAEB).filter(
                RespostaAlunoSAEB.simulado_questao_id == resposta_data.simulado_questao_id,
                RespostaAlunoSAEB.aluno_id == aluno.id
            ).first()

            if existing:
                existing.resposta = resposta_data.resposta.upper()
                existing.correta = correta
                results.append({
                    "simulado_questao_id": resposta_data.simulado_questao_id,
                    "action": "updated"
                })
            else:
                db_resposta = RespostaAlunoSAEB(
                    simulado_questao_id=resposta_data.simulado_questao_id,
                    aluno_id=aluno.id,
                    resposta=resposta_data.resposta.upper(),
                    correta=correta
                )
                db.add(db_resposta)
                results.append({
                    "simulado_questao_id": resposta_data.simulado_questao_id,
                    "action": "created"
                })

        except Exception as e:
            results.append({
                "simulado_questao_id": resposta_data.simulado_questao_id,
                "error": str(e)
            })

    db.commit()

    # Update student result once for all answers
    atualizar_resultado_aluno(db, bulk_data.simulado_id, aluno.id)

    return {
        "message": f"Processadas {len(results)} respostas",
        "results": results
    }


@router.get("/respostas/simulado/{simulado_id}", response_model=List[RespostaAlunoSAEBResponse])
async def get_minhas_respostas(
    simulado_id: int,
    db: Session = Depends(get_db),
    student_session: dict = Depends(get_current_student_from_token)
):
    """Get student's answers for a simulado - Student access only"""
    # Validate that student is accessing their assigned simulado
    if student_session["simulado_id"] != simulado_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso a este simulado"
        )
    
    # Get aluno_id from student token
    aluno_id = student_session["aluno_id"]
    
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    respostas = db.query(RespostaAlunoSAEB).join(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id,
        RespostaAlunoSAEB.aluno_id == aluno.id
    ).all()

    return respostas


# ============================================
# RESULTADOS
# ============================================

@router.get("/resultados/simulado/{simulado_id}", response_model=ResultadoSimuladoAlunoResponse)
async def get_meu_resultado(
    simulado_id: int,
    db: Session = Depends(get_db),
    student_session: dict = Depends(get_current_student_from_token)
):
    """Get student's result for a simulado - Student access only"""
    # Validate that student is accessing their assigned simulado
    if student_session["simulado_id"] != simulado_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem acesso a este simulado"
        )
    
    # Get aluno_id from student token
    aluno_id = student_session["aluno_id"]
    
    aluno = db.query(Aluno).filter(Aluno.id == aluno_id).first()
    if not aluno:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")

    resultado = db.query(ResultadoSimuladoAluno).options(
        joinedload(ResultadoSimuladoAluno.simulado)
    ).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.aluno_id == aluno.id
    ).first()

    if not resultado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resultado não encontrado")

    return resultado


@router.get("/resultados/turma/{turma_id}/simulado/{simulado_id}", response_model=List[ResultadoSimuladoAlunoResponse])
async def get_resultados_turma(
    turma_id: int,
    simulado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Get all student results for a simulado in a class
    Available to teachers and management
    """
    # Verify access
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        professor = db.query(Professor).filter(Professor.usuario_id == current_user.id).first()
        if not professor:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

        turma = db.query(Turma).filter(Turma.id == turma_id).first()
        if not turma or turma.escola_id != professor.escola_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")

    # Get all students in turma
    alunos = db.query(Aluno).filter(Aluno.turma_id == turma_id).all()
    aluno_ids = [a.id for a in alunos]

    # Get results with aluno relationship loaded
    resultados = db.query(ResultadoSimuladoAluno).options(
        joinedload(ResultadoSimuladoAluno.aluno)
    ).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.aluno_id.in_(aluno_ids)
    ).all()

    return resultados


# ============================================
# RELATÓRIOS
# ============================================

@router.get("/relatorios/simulado/{simulado_id}", response_model=RelatorioSimulado)
async def get_relatorio_simulado(
    simulado_id: int,
    turma_id: Optional[int] = None,
    escola_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    General report for a simulado
    Shows distribution of performance levels
    """
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Base query
    query = db.query(ResultadoSimuladoAluno).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id
    )

    # Filter by escola (gets all turmas from that escola with matching ano_escolar)
    if escola_id:
        turmas_escola = db.query(Turma.id).filter(
            Turma.escola_id == escola_id,
            Turma.ano_escolar == simulado.ano_escolar
        ).all()
        turma_ids = [t.id for t in turmas_escola]
        alunos = db.query(Aluno.id).filter(Aluno.turma_id.in_(turma_ids)).all()
        aluno_ids = [a.id for a in alunos]
        query = query.filter(ResultadoSimuladoAluno.aluno_id.in_(aluno_ids))
    # Filter by turma if specified (more specific than escola)
    elif turma_id:
        alunos = db.query(Aluno.id).filter(Aluno.turma_id == turma_id).all()
        aluno_ids = [a.id for a in alunos]
        query = query.filter(ResultadoSimuladoAluno.aluno_id.in_(aluno_ids))

    resultados = query.all()

    total_participantes = len(resultados)
    total_finalizados = sum(1 for r in resultados if r.finalizado)

    if total_finalizados == 0:
        media_geral = 0.0
    else:
        media_geral = sum(r.porcentagem for r in resultados if r.finalizado) / total_finalizados

    # Count by situation
    adequado = sum(1 for r in resultados if r.situacao == ModelSituacao.ADEQUADO)
    intermediario_i = sum(1 for r in resultados if r.situacao == ModelSituacao.INTERMEDIARIO_I)
    intermediario_ii = sum(1 for r in resultados if r.situacao == ModelSituacao.INTERMEDIARIO_II)
    critico = sum(1 for r in resultados if r.situacao == ModelSituacao.CRITICO)
    muito_critico = sum(1 for r in resultados if r.situacao == ModelSituacao.MUITO_CRITICO)

    return RelatorioSimulado(
        simulado_id=simulado_id,
        simulado_nome=simulado.nome,
        total_alunos_participantes=total_participantes,
        total_alunos_finalizados=total_finalizados,
        media_geral=round(media_geral, 2),
        adequado=adequado,
        intermediario_i=intermediario_i,
        intermediario_ii=intermediario_ii,
        critico=critico,
        muito_critico=muito_critico
    )


@router.get("/relatorios/descritores/{simulado_id}", response_model=List[RelatorioDescritor])
async def get_relatorio_descritores(
    simulado_id: int,
    turma_id: Optional[int] = None,
    escola_id: Optional[int] = None,
    disciplina: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Performance report by descriptor
    Shows which descriptors students struggled with
    """
    # Get simulado to know ano_escolar
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Get all questions in simulado with descriptors
    questoes_query = db.query(SimuladoQuestao).options(
        joinedload(SimuladoQuestao.questao).joinedload(QuestaoSAEB.descritor)
    ).filter(
        SimuladoQuestao.simulado_id == simulado_id
    )

    simulado_questoes = questoes_query.all()

    # Filter by disciplina if specified
    if disciplina:
        simulado_questoes = [
            sq for sq in simulado_questoes 
            if sq.questao.disciplina.value == disciplina
        ]

    # Get student IDs based on filters
    aluno_ids = None
    if escola_id:
        turmas_escola = db.query(Turma.id).filter(
            Turma.escola_id == escola_id,
            Turma.ano_escolar == simulado.ano_escolar
        ).all()
        turma_ids = [t.id for t in turmas_escola]
        alunos = db.query(Aluno.id).filter(Aluno.turma_id.in_(turma_ids)).all()
        aluno_ids = [a.id for a in alunos]
    elif turma_id:
        alunos = db.query(Aluno.id).filter(Aluno.turma_id == turma_id).all()
        aluno_ids = [a.id for a in alunos]

    # Group by descriptor
    descritor_stats = {}

    for sq in simulado_questoes:
        descritor = sq.questao.descritor
        descritor_id = descritor.id

        if descritor_id not in descritor_stats:
            descritor_stats[descritor_id] = {
                "descritor": descritor,
                "total_questoes": 0,
                "total_acertos": 0,
                "total_erros": 0
            }

        descritor_stats[descritor_id]["total_questoes"] += 1

        # Get answers for this question
        query = db.query(RespostaAlunoSAEB).filter(
            RespostaAlunoSAEB.simulado_questao_id == sq.id
        )

        if aluno_ids:
            query = query.filter(RespostaAlunoSAEB.aluno_id.in_(aluno_ids))

        respostas = query.all()

        for r in respostas:
            if r.correta:
                descritor_stats[descritor_id]["total_acertos"] += 1
            else:
                descritor_stats[descritor_id]["total_erros"] += 1

    # Build response
    relatorios = []
    for descritor_id, stats in descritor_stats.items():
        total_respostas = stats["total_acertos"] + stats["total_erros"]
        porcentagem = (stats["total_acertos"] / total_respostas * 100) if total_respostas > 0 else 0.0

        relatorios.append(RelatorioDescritor(
            descritor_id=descritor_id,
            descritor_codigo=stats["descritor"].codigo,
            descritor_descricao=stats["descritor"].descricao,
            total_questoes=stats["total_questoes"],
            total_acertos=stats["total_acertos"],
            total_erros=stats["total_erros"],
            porcentagem_acerto=round(porcentagem, 2)
        ))

    return relatorios
"""
SAEB V2 - Token and Manual Input Endpoints
Temporary file to be merged into saeb_v2.py
"""

# ============================================
# TOKEN ACCESS ENDPOINTS
# ============================================

@router.post("/participacoes/{participacao_id}/gerar-tokens", response_model=TokenAcessoListResponse)
async def gerar_tokens_acesso(
    participacao_id: int,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Generate access tokens for all students in a class
    One unique token per student
    Professor only (can only generate for their own participations or turmas they teach)
    """
    # Get participacao
    participacao = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.id == participacao_id
    ).first()

    if not participacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participação não encontrada"
        )
    
    # Get turma first
    turma = db.query(Turma).options(joinedload(Turma.alunos)).filter(
        Turma.id == participacao.turma_id
    ).first()
    
    # Verify professor has access (is owner or teaches the turma)
    is_owner = participacao.professor_id == current_professor.id
    teaches_turma = turma and turma.professor_id == current_professor.id if turma else False
    
    if not is_owner and not teaches_turma:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para gerar tokens para esta participação"
        )

    # Check if tokens already exist
    existing_tokens = db.query(TokenAcessoSimulado).filter(
        TokenAcessoSimulado.participacao_id == participacao_id
    ).first()

    if existing_tokens:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tokens já foram gerados para esta participação. Use o endpoint de listagem para visualizá-los."
        )

    if not turma or not turma.alunos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turma não encontrada ou não possui alunos cadastrados"
        )

    # Get simulado data for expiration
    simulado = participacao.simulado
    data_expiracao = simulado.data_limite if simulado.data_limite else datetime.now() + timedelta(days=30)

    # Generate tokens for all students
    tokens_criados = []
    for aluno in turma.alunos:
        if not aluno.ativo:
            continue

        token_str = gerar_token_unico(db)

        novo_token = TokenAcessoSimulado(
            token=token_str,
            participacao_id=participacao_id,
            aluno_id=aluno.id,
            data_expiracao=data_expiracao,
            ativo=True
        )
        db.add(novo_token)
        tokens_criados.append({
            "token": novo_token,
            "aluno": aluno
        })

    # Update simulado status to EM_ANDAMENTO if it's currently PUBLICADO
    if simulado.status == ModelStatus.PUBLICADO:
        simulado.status = ModelStatus.EM_ANDAMENTO
        db.add(simulado)

    db.commit()

    # Prepare response
    tokens_response = []
    for item in tokens_criados:
        db.refresh(item["token"])
        tokens_response.append(TokenAcessoResponse(
            id=item["token"].id,
            token=item["token"].token,
            aluno_id=item["aluno"].id,
            aluno_nome=item["aluno"].nome_completo,
            aluno_matricula=item["aluno"].matricula,
            usado=False,
            data_primeiro_acesso=None,
            data_expiracao=item["token"].data_expiracao,
            ativo=True,
            created_at=item["token"].created_at
        ))

    return TokenAcessoListResponse(
        participacao_id=participacao_id,
        simulado_nome=simulado.nome,
        turma_nome=turma.nome,
        tokens=tokens_response
    )


@router.get("/participacoes/{participacao_id}/tokens", response_model=TokenAcessoListResponse)
async def listar_tokens_acesso(
    participacao_id: int,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    List all access tokens for a participation
    Professor only (their own participations)
    """
    # Get participacao - professor can access if they are the owner OR if they teach the turma
    participacao = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.id == participacao_id
    ).first()
    
    if not participacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participação não encontrada"
        )
    
    # Verify professor has access (is owner or teaches the turma)
    is_owner = participacao.professor_id == current_professor.id
    turma = db.query(Turma).filter(Turma.id == participacao.turma_id).first()
    teaches_turma = turma and turma.professor_id == current_professor.id if turma else False
    
    if not is_owner and not teaches_turma:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta participação"
        )

    # Get tokens - only active ones, ordered by created_at DESC to get the most recent
    # Group by aluno_id to get only the latest token per student
    tokens = db.query(TokenAcessoSimulado).options(
        joinedload(TokenAcessoSimulado.aluno)
    ).filter(
        TokenAcessoSimulado.participacao_id == participacao_id,
        TokenAcessoSimulado.ativo == True  # Only active tokens
    ).order_by(TokenAcessoSimulado.created_at.desc()).all()

    # Return empty list if no tokens (instead of 404)
    tokens_response = []
    seen_alunos = set()  # Track which students we've already added
    
    for token in tokens:
        # Only add the first (most recent) token for each student
        if token.aluno_id not in seen_alunos:
            seen_alunos.add(token.aluno_id)
            tokens_response.append(TokenAcessoResponse(
                id=token.id,
                token=token.token,
                aluno_id=token.aluno.id,
                aluno_nome=token.aluno.nome_completo,
                aluno_matricula=token.aluno.matricula,
                usado=token.usado,
                data_primeiro_acesso=token.data_primeiro_acesso,
                data_expiracao=token.data_expiracao,
                ativo=token.ativo,
                created_at=token.created_at
            ))
    
    # Sort tokens by student name for better UX
    tokens_response.sort(key=lambda t: t.aluno_nome)
    
    # Get simulado and turma info for response
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == participacao.simulado_id).first()
    turma = db.query(Turma).filter(Turma.id == participacao.turma_id).first()
    
    return TokenAcessoListResponse(
        participacao_id=participacao.id,
        simulado_nome=simulado.nome if simulado else "Simulado não encontrado",
        turma_nome=turma.nome if turma else "Turma não encontrada",
        tokens=tokens_response
    )


@router.post("/tokens/{token_id}/regenerar", response_model=TokenAcessoResponse)
async def regenerar_token_aluno(
    token_id: int,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Regenerate access token for a specific student
    Deactivates the old token and creates a new one
    Professor only - can only regenerate for their own participations or turmas they teach
    """
    # Get existing token
    old_token = db.query(TokenAcessoSimulado).options(
        joinedload(TokenAcessoSimulado.aluno),
        joinedload(TokenAcessoSimulado.participacao).joinedload(ParticipacaoSimulado.simulado)
    ).filter(TokenAcessoSimulado.id == token_id).first()

    if not old_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token não encontrado"
        )

    # Get participacao and turma
    participacao = old_token.participacao
    turma = db.query(Turma).filter(Turma.id == participacao.turma_id).first()

    # Verify professor has access
    is_owner = participacao.professor_id == current_professor.id
    teaches_turma = turma and turma.professor_id == current_professor.id if turma else False
    
    if not is_owner and not teaches_turma:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para regenerar este token"
        )

    # Check if simulado is still active
    simulado = participacao.simulado
    if simulado.status == ModelStatus.ENCERRADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível regenerar token de simulado encerrado"
        )

    # Deactivate ALL previous tokens for this student in this participacao
    previous_tokens = db.query(TokenAcessoSimulado).filter(
        TokenAcessoSimulado.participacao_id == participacao.id,
        TokenAcessoSimulado.aluno_id == old_token.aluno_id,
        TokenAcessoSimulado.ativo == True
    ).all()
    
    for token in previous_tokens:
        token.ativo = False
        db.add(token)

    # Generate new token
    new_token_str = gerar_token_unico(db)
    data_expiracao = simulado.data_limite if simulado.data_limite else datetime.now() + timedelta(days=30)

    novo_token = TokenAcessoSimulado(
        token=new_token_str,
        participacao_id=participacao.id,
        aluno_id=old_token.aluno_id,
        data_expiracao=data_expiracao,
        ativo=True
    )
    db.add(novo_token)
    db.commit()
    db.refresh(novo_token)

    return TokenAcessoResponse(
        id=novo_token.id,
        token=novo_token.token,
        aluno_id=old_token.aluno.id,
        aluno_nome=old_token.aluno.nome_completo,
        aluno_matricula=old_token.aluno.matricula,
        usado=False,
        data_primeiro_acesso=None,
        data_expiracao=novo_token.data_expiracao,
        ativo=True,
        created_at=novo_token.created_at
    )


# ============================================
# STUDENT AUTHENTICATION ENDPOINT (PUBLIC)
# ============================================

@router.post("/auth/token", response_model=TokenAuthResponse)
async def autenticar_por_token(
    auth_data: TokenAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate student using access token
    Public endpoint - no authentication required
    Returns temporary JWT token for student session
    """
    from jose import jwt

    settings = get_settings()
    token_str = auth_data.token.upper()

    # Find token
    token = db.query(TokenAcessoSimulado).options(
        joinedload(TokenAcessoSimulado.aluno),
        joinedload(TokenAcessoSimulado.participacao).joinedload(ParticipacaoSimulado.simulado)
    ).filter(
        TokenAcessoSimulado.token == token_str
    ).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    # Check if token is valid
    if not token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado ou inativo"
        )

    # Mark token as used if first access
    if not token.usado:
        token.usado = True
        token.data_primeiro_acesso = datetime.now()
        db.commit()

    # Generate JWT token for student session - using centralized settings
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": f"aluno_{token.aluno_id}",
        "aluno_id": token.aluno_id,
        "simulado_id": token.participacao.simulado_id,
        "participacao_id": token.participacao_id,
        "type": "student_token"
    }
    expire = datetime.utcnow() + access_token_expires
    to_encode.update({"exp": expire})
    access_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return TokenAuthResponse(
        access_token=access_token,
        token_type="bearer",
        aluno_id=token.aluno_id,
        aluno_nome=token.aluno.nome_completo,
        simulado_id=token.participacao.simulado_id,
        simulado_nome=token.participacao.simulado.nome
    )


# ============================================
# MANUAL INPUT ENDPOINTS
# ============================================

@router.post("/resultados/lancamento-manual", status_code=status.HTTP_201_CREATED)
async def lancar_resultado_manual(
    lancamento: LancamentoManualCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Manually input student answers (for paper-based exams)
    Professor only - can only input for their own turmas
    """
    # Verify professor has access to this turma
    aluno = db.query(Aluno).options(joinedload(Aluno.turma)).filter(
        Aluno.id == lancamento.aluno_id
    ).first()

    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

    # Check if professor has a participação for this turma and simulado
    participacao = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.simulado_id == lancamento.simulado_id,
        ParticipacaoSimulado.turma_id == aluno.turma_id,
        ParticipacaoSimulado.professor_id == current_professor.id
    ).first()

    if not participacao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para lançar resultados para este aluno/simulado"
        )

    # Delete existing answers for this aluno/simulado
    db.query(RespostaAlunoSAEB).filter(
        RespostaAlunoSAEB.aluno_id == lancamento.aluno_id,
        RespostaAlunoSAEB.simulado_questao_id.in_(
            db.query(SimuladoQuestao.id).filter(SimuladoQuestao.simulado_id == lancamento.simulado_id)
        )
    ).delete(synchronize_session=False)

    # Insert new answers - save individually
    for resposta_data in lancamento.respostas:
        # Get questao to check correct answer
        simulado_questao = db.query(SimuladoQuestao).options(
            joinedload(SimuladoQuestao.questao)
        ).filter(
            SimuladoQuestao.id == resposta_data.simulado_questao_id
        ).first()

        if not simulado_questao:
            continue

        correta = simulado_questao.questao.alternativa_correta == resposta_data.resposta

        nova_resposta = RespostaAlunoSAEB(
            simulado_questao_id=resposta_data.simulado_questao_id,
            aluno_id=lancamento.aluno_id,
            resposta=resposta_data.resposta,
            correta=correta
        )
        db.add(nova_resposta)
        db.commit()  # Commit individual para cada resposta

    # Calculate and update result
    atualizar_resultado_aluno(db, lancamento.simulado_id, lancamento.aluno_id)

    return {"message": "Resultado lançado com sucesso"}


@router.post("/resultados/lancamento-manual/lote", status_code=status.HTTP_201_CREATED)
async def lancar_resultados_lote(
    lancamentos: LancamentoManualBulkCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Manually input answers for multiple students at once
    Professor only
    """
    # Verify professor has access
    participacao = db.query(ParticipacaoSimulado).filter(
        ParticipacaoSimulado.simulado_id == lancamentos.simulado_id,
        ParticipacaoSimulado.turma_id == lancamentos.turma_id,
        ParticipacaoSimulado.professor_id == current_professor.id
    ).first()

    if not participacao:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para lançar resultados para esta turma/simulado"
        )

    total_processados = 0
    erros = []

    for lancamento in lancamentos.lancamentos:
        try:
            # Verify aluno is from this turma
            aluno = db.query(Aluno).filter(
                Aluno.id == lancamento.aluno_id,
                Aluno.turma_id == lancamentos.turma_id
            ).first()

            if not aluno:
                erros.append(f"Aluno ID {lancamento.aluno_id} não pertence à turma")
                continue

            # Delete existing answers
            db.query(RespostaAlunoSAEB).filter(
                RespostaAlunoSAEB.aluno_id == lancamento.aluno_id,
                RespostaAlunoSAEB.simulado_questao_id.in_(
                    db.query(SimuladoQuestao.id).filter(SimuladoQuestao.simulado_id == lancamento.simulado_id)
                )
            ).delete(synchronize_session=False)

            # Insert new answers - save individually
            for resposta_data in lancamento.respostas:
                simulado_questao = db.query(SimuladoQuestao).options(
                    joinedload(SimuladoQuestao.questao)
                ).filter(
                    SimuladoQuestao.id == resposta_data.simulado_questao_id
                ).first()

                if not simulado_questao:
                    continue

                correta = simulado_questao.questao.alternativa_correta == resposta_data.resposta

                nova_resposta = RespostaAlunoSAEB(
                    simulado_questao_id=resposta_data.simulado_questao_id,
                    aluno_id=lancamento.aluno_id,
                    resposta=resposta_data.resposta,
                    correta=correta
                )
                db.add(nova_resposta)
                db.commit()  # Commit individual para cada resposta

            # Calculate result (without checking closure for each student - we'll check once at the end)
            atualizar_resultado_aluno(db, lancamento.simulado_id, lancamento.aluno_id, verificar_encerramento=False)

            total_processados += 1

        except Exception as e:
            erros.append(f"Erro ao processar aluno ID {lancamento.aluno_id}: {str(e)}")
            continue

    # After processing all students, check if simulado should be auto-closed
    if total_processados > 0:
        verificar_encerramento_automatico(db, lancamentos.simulado_id)

    return {
        "message": f"{total_processados} aluno(s) processado(s) com sucesso",
        "total_processados": total_processados,
        "total_erros": len(erros),
        "erros": erros if erros else None
    }


@router.get("/simulados/{simulado_id}/exportar", response_model=dict)
async def exportar_simulado_impressao(
    simulado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Export simulado data for printing
    Returns all questions with alternatives organized by disciplina and bloco
    """
    # Get simulado
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()

    if not simulado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulado não encontrado"
        )

    # Get all questions
    simulado_questoes = db.query(SimuladoQuestao).options(
        joinedload(SimuladoQuestao.questao).joinedload(QuestaoSAEB.descritor)
    ).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).order_by(SimuladoQuestao.ordem).all()

    # Group by disciplina and bloco
    questoes_portugues_b1 = []
    questoes_portugues_b2 = []
    questoes_matematica_b1 = []
    questoes_matematica_b2 = []

    for sq in simulado_questoes:
        q = sq.questao
        questao_data = {
            "id": sq.id,  # ID do SimuladoQuestao para identificação única
            "ordem": sq.ordem,
            "enunciado": q.enunciado,
            "alternativa_a": q.alternativa_a,
            "alternativa_b": q.alternativa_b,
            "alternativa_c": q.alternativa_c,
            "alternativa_d": q.alternativa_d,
            "alternativa_e": q.alternativa_e,
            "descritor_codigo": q.descritor.codigo if q.descritor else None,
            "descritor_descricao": q.descritor.descricao if q.descritor else None
        }

        # Get bloco value (it's an enum, so we need the .value)
        bloco_value = q.bloco.value if hasattr(q.bloco, 'value') else q.bloco

        if q.disciplina == ModelDisciplina.PORTUGUES:
            if bloco_value == 1:
                questoes_portugues_b1.append(questao_data)
            else:
                questoes_portugues_b2.append(questao_data)
        else:
            if bloco_value == 1:
                questoes_matematica_b1.append(questao_data)
            else:
                questoes_matematica_b2.append(questao_data)

    # Build response in format expected by frontend
    disciplinas = []
    
    # Add Português if has questions
    if questoes_portugues_b1 or questoes_portugues_b2:
        blocos_port = []
        if questoes_portugues_b1:
            blocos_port.append({"bloco": 1, "questoes": questoes_portugues_b1})
        if questoes_portugues_b2:
            blocos_port.append({"bloco": 2, "questoes": questoes_portugues_b2})
        disciplinas.append({
            "disciplina": "portugues",
            "blocos": blocos_port
        })
    
    # Add Matemática if has questions
    if questoes_matematica_b1 or questoes_matematica_b2:
        blocos_mat = []
        if questoes_matematica_b1:
            blocos_mat.append({"bloco": 1, "questoes": questoes_matematica_b1})
        if questoes_matematica_b2:
            blocos_mat.append({"bloco": 2, "questoes": questoes_matematica_b2})
        disciplinas.append({
            "disciplina": "matematica",
            "blocos": blocos_mat
        })

    return {
        "simulado_nome": simulado.nome,
        "simulado_descricao": simulado.descricao,
        "ano_escolar": simulado.ano_escolar,
        "ano_letivo": simulado.ano_letivo,
        "disciplinas": disciplinas,
        "total_questoes": len(simulado_questoes)
    }


# ============================================
# ANÁLISE PSICOMÉTRICA
# ============================================

@router.get("/simulados/{simulado_id}/analise-psicometrica")
async def analisar_simulado_psicometria(
    simulado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Análise psicométrica completa de um simulado
    Inclui: índice de dificuldade, discriminação, distratores, Alpha de Cronbach
    """
    from app.utils.psicometria import (
        calcular_indice_dificuldade,
        calcular_indice_discriminacao,
        analisar_distratores,
        calcular_alpha_cronbach,
        calcular_estatisticas_basicas,
        criar_histograma,
        separar_grupos_extremos,
        classificar_alpha_cronbach
    )
    from collections import defaultdict

    # Buscar simulado
    simulado = db.query(SimuladoSAEB).filter(SimuladoSAEB.id == simulado_id).first()
    if not simulado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Simulado não encontrado")

    # Buscar todas as questões do simulado
    simulado_questoes = db.query(SimuladoQuestao).filter(
        SimuladoQuestao.simulado_id == simulado_id
    ).order_by(SimuladoQuestao.ordem).all()

    if not simulado_questoes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Simulado sem questões"
        )

    # Buscar todos os resultados finalizados
    resultados = db.query(ResultadoSimuladoAluno).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.finalizado == True
    ).all()

    if len(resultados) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="É necessário pelo menos 5 participantes para análise psicométrica"
        )

    # Buscar todas as respostas
    respostas_alunos = db.query(RespostaAlunoSAEB).join(
        ResultadoSimuladoAluno
    ).filter(
        ResultadoSimuladoAluno.simulado_id == simulado_id,
        ResultadoSimuladoAluno.finalizado == True
    ).all()

    # Organizar dados por questão
    dados_questoes = defaultdict(lambda: {
        'total_respostas': 0,
        'total_acertos': 0,
        'distribuicao': defaultdict(int),
        'respostas_alunos': []  # [(aluno_id, acertou)]
    })

    # Mapear escores totais dos alunos
    escores_totais = {r.aluno_id: r.porcentagem for r in resultados}

    # Processar respostas
    for resposta in respostas_alunos:
        sq_id = resposta.simulado_questao_id
        dados_questoes[sq_id]['total_respostas'] += 1
        dados_questoes[sq_id]['distribuicao'][resposta.resposta] += 1

        acertou = 1 if resposta.correta else 0
        if acertou:
            dados_questoes[sq_id]['total_acertos'] += 1

        dados_questoes[sq_id]['respostas_alunos'].append(
            (resposta.resultado.aluno_id, acertou)
        )

    # Calcular análise para cada questão
    analise_questoes = []
    analise_por_descritor = defaultdict(lambda: {
        'questoes': [],
        'soma_dificuldade': 0,
        'soma_discriminacao': 0,
        'count': 0
    })

    for sq in simulado_questoes:
        dados = dados_questoes[sq.id]

        if dados['total_respostas'] == 0:
            continue

        questao = sq.questao

        # Índice de dificuldade
        indice_dif, classif_dif = calcular_indice_dificuldade(
            dados['total_acertos'],
            dados['total_respostas']
        )

        # Índice de discriminação
        acertos_sup, acertos_inf = separar_grupos_extremos(
            dados['respostas_alunos'],
            escores_totais
        )
        tamanho_grupo = max(1, int(len(resultados) * 0.27))

        indice_disc, classif_disc = calcular_indice_discriminacao(
            acertos_sup,
            acertos_inf,
            tamanho_grupo
        )

        # Análise de distratores
        alternativa_correta = questao.alternativa_correta
        distratores_eficazes = analisar_distratores(
            dict(dados['distribuicao']),
            alternativa_correta,
            dados['total_respostas']
        )

        analise_q = {
            'questao_id': questao.id,
            'enunciado': questao.enunciado[:100] + "..." if len(questao.enunciado) > 100 else questao.enunciado,
            'descritor_codigo': questao.descritor.codigo if questao.descritor else "N/A",
            'total_respostas': dados['total_respostas'],
            'total_acertos': dados['total_acertos'],
            'indice_dificuldade': indice_dif,
            'classificacao_dificuldade': classif_dif,
            'indice_discriminacao': indice_disc,
            'classificacao_discriminacao': classif_disc,
            'distribuicao_alternativas': dict(dados['distribuicao']),
            'alternativa_correta': alternativa_correta,
            'distratores_eficazes': distratores_eficazes
        }

        analise_questoes.append(analise_q)

        # Agregar por descritor
        if questao.descritor:
            desc_id = questao.descritor.id
            analise_por_descritor[desc_id]['questoes'].append(analise_q)
            analise_por_descritor[desc_id]['soma_dificuldade'] += indice_dif
            analise_por_descritor[desc_id]['soma_discriminacao'] += indice_disc
            analise_por_descritor[desc_id]['count'] += 1
            analise_por_descritor[desc_id]['descritor'] = questao.descritor

    # Montar análise por descritor
    analise_descritores = []
    for desc_id, dados_desc in analise_por_descritor.items():
        count = dados_desc['count']
        descritor = dados_desc['descritor']

        analise_descritores.append({
            'descritor_id': descritor.id,
            'descritor_codigo': descritor.codigo,
            'descritor_descricao': descritor.descricao,
            'total_questoes': count,
            'media_dificuldade': round(dados_desc['soma_dificuldade'] / count, 2),
            'media_discriminacao': round(dados_desc['soma_discriminacao'] / count, 3),
            'questoes': dados_desc['questoes']
        })

    # Calcular estatísticas gerais
    notas = [r.porcentagem for r in resultados]
    stats = calcular_estatisticas_basicas(notas)
    histograma = criar_histograma(notas)

    # Calcular Alpha de Cronbach
    # Criar matriz de respostas (aluno x questão)
    matriz_respostas = []
    for resultado in resultados:
        linha = []
        for sq in simulado_questoes:
            resposta = db.query(RespostaAlunoSAEB).filter(
                RespostaAlunoSAEB.resultado_id == resultado.id,
                RespostaAlunoSAEB.simulado_questao_id == sq.id
            ).first()
            linha.append(1 if (resposta and resposta.correta) else 0)
        matriz_respostas.append(linha)

    alpha = calcular_alpha_cronbach(matriz_respostas)

    # Análise por disciplina
    analise_port = {'media': 0, 'total_questoes': 0}
    analise_mat = {'media': 0, 'total_questoes': 0}

    for aq in analise_questoes:
        questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == aq['questao_id']).first()
        if questao:
            if questao.disciplina == 'portugues':
                analise_port['total_questoes'] += 1
                analise_port['media'] += aq['indice_dificuldade']
            else:
                analise_mat['total_questoes'] += 1
                analise_mat['media'] += aq['indice_dificuldade']

    if analise_port['total_questoes'] > 0:
        analise_port['media'] /= analise_port['total_questoes']
    if analise_mat['total_questoes'] > 0:
        analise_mat['media'] /= analise_mat['total_questoes']

    return {
        'simulado_id': simulado.id,
        'simulado_nome': simulado.nome,
        'total_participantes': len(resultados),
        'total_questoes': len(simulado_questoes),
        'media_geral': stats['media'],
        'desvio_padrao': stats['desvio_padrao'],
        'mediana': stats['mediana'],
        'nota_minima': stats['minimo'],
        'nota_maxima': stats['maximo'],
        'alpha_cronbach': alpha,
        'classificacao_alpha': classificar_alpha_cronbach(alpha),
        'analise_portugues': analise_port if analise_port['total_questoes'] > 0 else None,
        'analise_matematica': analise_mat if analise_mat['total_questoes'] > 0 else None,
        'questoes': analise_questoes,
        'descritores': analise_descritores,
        'distribuicao_notas': histograma
    }


@router.get("/dashboard/metricas")
async def dashboard_metricas(
    ano_letivo: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Dashboard com métricas consolidadas da rede
    """
    from datetime import datetime
    from dateutil.relativedelta import relativedelta

    # Filtro de período
    if not ano_letivo:
        ano_letivo = datetime.now().year

    periodo_inicio = datetime(ano_letivo, 1, 1)
    periodo_fim = datetime(ano_letivo, 12, 31, 23, 59, 59)

    # Total de simulados no período
    total_simulados = db.query(func.count(SimuladoSAEB.id)).filter(
        SimuladoSAEB.ano_letivo == ano_letivo
    ).scalar()

    # Total de participações
    total_participacoes = db.query(func.count(ResultadoSimuladoAluno.id)).join(
        SimuladoSAEB
    ).filter(
        SimuladoSAEB.ano_letivo == ano_letivo,
        ResultadoSimuladoAluno.finalizado == True
    ).scalar()

    # Total de alunos únicos
    total_alunos = db.query(func.count(func.distinct(ResultadoSimuladoAluno.aluno_id))).join(
        SimuladoSAEB
    ).filter(
        SimuladoSAEB.ano_letivo == ano_letivo,
        ResultadoSimuladoAluno.finalizado == True
    ).scalar()

    # Taxa de conclusão (participações finalizadas / participações totais)
    total_part_todas = db.query(func.count(ResultadoSimuladoAluno.id)).join(
        SimuladoSAEB
    ).filter(
        SimuladoSAEB.ano_letivo == ano_letivo
    ).scalar()

    taxa_conclusao = (total_participacoes / total_part_todas * 100) if total_part_todas > 0 else 0

    # Média geral da rede
    media_rede = db.query(func.avg(ResultadoSimuladoAluno.porcentagem)).join(
        SimuladoSAEB
    ).filter(
        SimuladoSAEB.ano_letivo == ano_letivo,
        ResultadoSimuladoAluno.finalizado == True
    ).scalar() or 0

    # Melhor e pior escola (por média)
    from app.models import Escola, Turma, Aluno

    escolas_stats = db.query(
        Escola.nome,
        func.avg(ResultadoSimuladoAluno.porcentagem).label('media')
    ).join(
        Turma, Escola.id == Turma.escola_id
    ).join(
        Aluno, Turma.id == Aluno.turma_id
    ).join(
        ResultadoSimuladoAluno, Aluno.id == ResultadoSimuladoAluno.aluno_id
    ).join(
        SimuladoSAEB, ResultadoSimuladoAluno.simulado_id == SimuladoSAEB.id
    ).filter(
        SimuladoSAEB.ano_letivo == ano_letivo,
        ResultadoSimuladoAluno.finalizado == True
    ).group_by(
        Escola.id, Escola.nome
    ).order_by(
        func.avg(ResultadoSimuladoAluno.porcentagem).desc()
    ).all()

    melhor_escola = None
    pior_escola = None

    if escolas_stats:
        melhor_escola = {'nome': escolas_stats[0][0], 'media': round(escolas_stats[0][1], 2)}
        pior_escola = {'nome': escolas_stats[-1][0], 'media': round(escolas_stats[-1][1], 2)}

    # Análise de dificuldade das questões
    # (Considerando todas as questões de todos os simulados do ano)
    from app.utils.psicometria import calcular_indice_dificuldade

    questoes_stats = {
        'muito_faceis': 0,
        'faceis': 0,
        'medias': 0,
        'dificeis': 0,
        'muito_dificeis': 0
    }

    # Buscar todas as questões dos simulados do ano
    simulados_ano = db.query(SimuladoSAEB.id).filter(
        SimuladoSAEB.ano_letivo == ano_letivo
    ).all()
    simulado_ids = [s[0] for s in simulados_ano]

    for sim_id in simulado_ids:
        simulado_questoes = db.query(SimuladoQuestao).filter(
            SimuladoQuestao.simulado_id == sim_id
        ).all()

        for sq in simulado_questoes:
            # Contar respostas e acertos
            total_resp = db.query(func.count(RespostaAlunoSAEB.id)).filter(
                RespostaAlunoSAEB.simulado_questao_id == sq.id
            ).scalar() or 0

            total_acertos = db.query(func.count(RespostaAlunoSAEB.id)).filter(
                RespostaAlunoSAEB.simulado_questao_id == sq.id,
                RespostaAlunoSAEB.correta == True
            ).scalar() or 0

            if total_resp > 0:
                _, classificacao = calcular_indice_dificuldade(total_acertos, total_resp)

                if classificacao == "Muito fácil":
                    questoes_stats['muito_faceis'] += 1
                elif classificacao == "Fácil":
                    questoes_stats['faceis'] += 1
                elif classificacao == "Médio":
                    questoes_stats['medias'] += 1
                elif classificacao == "Difícil":
                    questoes_stats['dificeis'] += 1
                elif classificacao == "Muito difícil":
                    questoes_stats['muito_dificeis'] += 1

    # --- Métricas Avançadas: média por disciplina, top questões problemáticas, distratores, alpha médio, descritores ---
    from app.utils.psicometria import (
        calcular_indice_dificuldade,
        separar_grupos_extremos,
        calcular_indice_discriminacao,
        analisar_distratores,
        calcular_alpha_cronbach,
    )

    disciplina_acc = {
        'portugues': {'soma': 0.0, 'count': 0},
        'matematica': {'soma': 0.0, 'count': 0}
    }

    descritores_agg = {}
    top_questoes_candidates = []
    total_questions_considered = 0
    questions_with_3_distratores = 0
    alpha_weighted_sum = 0.0
    alpha_weight_total = 0

    # Processar por simulado para cálculos psicométricos por questão
    for sim_id in simulado_ids:
        # resultados finalizados do simulado
        resultados_sim = db.query(ResultadoSimuladoAluno).filter(
            ResultadoSimuladoAluno.simulado_id == sim_id,
            ResultadoSimuladoAluno.finalizado == True
        ).all()

        # coletar escores totais (porcentagem) por aluno
        escores_totais = {r.aluno_id: r.porcentagem for r in resultados_sim}

        # alpha por simulado (ponderado)
        simulado_questoes = db.query(SimuladoQuestao).filter(
            SimuladoQuestao.simulado_id == sim_id
        ).all()

        if len(resultados_sim) >= 5 and simulado_questoes:
            # montar matriz aluno x questão para alpha
            matriz_respostas = []
            for resultado in resultados_sim:
                linha = []
                for sq in simulado_questoes:
                    resposta = db.query(RespostaAlunoSAEB).filter(
                        RespostaAlunoSAEB.resultado_id == resultado.id,
                        RespostaAlunoSAEB.simulado_questao_id == sq.id
                    ).first()
                    linha.append(1 if (resposta and resposta.correta) else 0)
                matriz_respostas.append(linha)

            alpha = calcular_alpha_cronbach(matriz_respostas)
            alpha_weighted_sum += alpha * len(resultados_sim)
            alpha_weight_total += len(resultados_sim)

        # processar questões do simulado
        for sq in simulado_questoes:
            # Contar respostas e acertos por questão (ano todo agrupado)
            total_resp = db.query(func.count(RespostaAlunoSAEB.id)).filter(
                RespostaAlunoSAEB.simulado_questao_id == sq.id
            ).scalar() or 0

            total_acertos = db.query(func.count(RespostaAlunoSAEB.id)).filter(
                RespostaAlunoSAEB.simulado_questao_id == sq.id,
                RespostaAlunoSAEB.correta == True
            ).scalar() or 0

            if total_resp == 0:
                continue

            total_questions_considered += 1

            indice_dif, _ = calcular_indice_dificuldade(total_acertos, total_resp)

            # discriminação (se houver participantes suficientes no simulado)
            if len(resultados_sim) >= 5:
                respostas_q = db.query(RespostaAlunoSAEB).join(ResultadoSimuladoAluno).filter(
                    ResultadoSimuladoAluno.simulado_id == sim_id,
                    ResultadoSimuladoAluno.finalizado == True,
                    RespostaAlunoSAEB.simulado_questao_id == sq.id
                ).all()

                respostas_list = [(r.resultado.aluno_id, 1 if r.correta else 0) for r in respostas_q]
                acertos_sup, acertos_inf = separar_grupos_extremos(respostas_list, escores_totais)
                tamanho_grupo = max(1, int(len(resultados_sim) * 0.27))
                indice_disc, _ = calcular_indice_discriminacao(acertos_sup, acertos_inf, tamanho_grupo)
            else:
                indice_disc = None

            # distratores
            distrib = {}
            respostas_all = db.query(RespostaAlunoSAEB).filter(RespostaAlunoSAEB.simulado_questao_id == sq.id).all()
            for r in respostas_all:
                distrib[r.resposta] = distrib.get(r.resposta, 0) + 1

            distratores_ef = analisar_distratores(distrib, sq.questao.alternativa_correta, total_resp)
            if len(distratores_ef) >= 3:
                questions_with_3_distratores += 1

            # agregar por disciplina
            questao = db.query(QuestaoSAEB).filter(QuestaoSAEB.id == sq.questao_id).first()
            if questao:
                if questao.disciplina == 'portugues' or getattr(questao, 'disciplina', '').lower() == 'portugues':
                    disciplina_acc['portugues']['soma'] += indice_dif
                    disciplina_acc['portugues']['count'] += 1
                else:
                    disciplina_acc['matematica']['soma'] += indice_dif
                    disciplina_acc['matematica']['count'] += 1

            # agregar por descritor
            codigo_desc = sq.questao.descritor.codigo if sq.questao and sq.questao.descritor else None
            if codigo_desc:
                if codigo_desc not in descritores_agg:
                    descritores_agg[codigo_desc] = {'soma': 0.0, 'count': 0}
                descritores_agg[codigo_desc]['soma'] += indice_dif
                descritores_agg[codigo_desc]['count'] += 1

            # candidato para top problemas
            top_questoes_candidates.append({
                'simulado_id': sim_id,
                'simulado_nome': db.query(SimuladoSAEB).filter(SimuladoSAEB.id == sim_id).first().nome if db.query(SimuladoSAEB).filter(SimuladoSAEB.id == sim_id).first() else None,
                'questao_id': sq.questao_id,
                'enunciado': (sq.questao.enunciado[:120] + '...') if sq.questao and len(sq.questao.enunciado) > 120 else (sq.questao.enunciado if sq.questao else ''),
                'indice_dificuldade': indice_dif,
                'indice_discriminacao': indice_disc,
                'distratores_eficazes': distratores_ef
            })

    # calcular alpha médio ponderado
    alpha_cronbach_rede = round((alpha_weighted_sum / alpha_weight_total), 3) if alpha_weight_total > 0 else 0

    # montar mapa de descritores
    mapa_descritores = []
    for codigo, v in descritores_agg.items():
        mapa_descritores.append({
            'descritor_codigo': codigo,
            'media_dificuldade': round(v['soma'] / v['count'], 2) if v['count'] > 0 else 0,
            'total_questoes': v['count']
        })

    # top 5 questões problemáticas (menor índice de dificuldade)
    top_5 = sorted(top_questoes_candidates, key=lambda x: (x.get('indice_dificuldade', 100), x.get('indice_discriminacao') if x.get('indice_discriminacao') is not None else 999))[:5]

    # comparação com ano anterior (média da rede)
    media_ano_anterior = db.query(func.avg(ResultadoSimuladoAluno.porcentagem)).join(SimuladoSAEB).filter(
        SimuladoSAEB.ano_letivo == (ano_letivo - 1),
        ResultadoSimuladoAluno.finalizado == True
    ).scalar() or 0

    comparacao_periodos = {
        'ano_anterior_media': round(media_ano_anterior, 2),
        'delta_versus_ano_anterior': round((media_rede - media_ano_anterior), 2)
    }

    # Evolução mensal (últimos 6 meses)
    evolucao = []
    for i in range(5, -1, -1):
        mes_ref = datetime.now() - relativedelta(months=i)
        inicio_mes = mes_ref.replace(day=1, hour=0, minute=0, second=0)
        if i == 0:
            fim_mes = datetime.now()
        else:
            fim_mes = (inicio_mes + relativedelta(months=1)) - relativedelta(days=1)
            fim_mes = fim_mes.replace(hour=23, minute=59, second=59)

        # Média do mês
        media_mes = db.query(func.avg(ResultadoSimuladoAluno.porcentagem)).join(
            SimuladoSAEB
        ).filter(
            ResultadoSimuladoAluno.finalizado == True,
            ResultadoSimuladoAluno.created_at >= inicio_mes,
            ResultadoSimuladoAluno.created_at <= fim_mes
        ).scalar() or 0

        # Total de participações do mês
        part_mes = db.query(func.count(ResultadoSimuladoAluno.id)).filter(
            ResultadoSimuladoAluno.finalizado == True,
            ResultadoSimuladoAluno.created_at >= inicio_mes,
            ResultadoSimuladoAluno.created_at <= fim_mes
        ).scalar() or 0

        evolucao.append({
            'mes': mes_ref.strftime('%b/%Y'),
            'media': round(media_mes, 2),
            'total_participacoes': part_mes
        })

    return {
        'periodo': f"Ano Letivo {ano_letivo}",
        'total_simulados': total_simulados or 0,
        'total_participacoes': total_participacoes or 0,
        'total_alunos_unicos': total_alunos or 0,
        'taxa_conclusao': round(taxa_conclusao, 2),
        'media_geral_rede': round(media_rede, 2),
        'melhor_escola': melhor_escola,
        'pior_escola': pior_escola,
        'questoes_muito_faceis': questoes_stats['muito_faceis'],
        'questoes_faceis': questoes_stats['faceis'],
        'questoes_medias': questoes_stats['medias'],
        'questoes_dificeis': questoes_stats['dificeis'],
        'questoes_muito_dificeis': questoes_stats['muito_dificeis'],
        'evolucao_mensal': evolucao,
        'media_por_disciplina': {
            'portugues': round(disciplina_acc['portugues']['soma'] / disciplina_acc['portugues']['count'], 2) if disciplina_acc['portugues']['count'] > 0 else 0,
            'matematica': round(disciplina_acc['matematica']['soma'] / disciplina_acc['matematica']['count'], 2) if disciplina_acc['matematica']['count'] > 0 else 0,
        },
        'top_5_questoes_problematicas': top_5,
        'percentual_questoes_distratores_eficazes': round((questions_with_3_distratores / total_questions_considered * 100), 2) if total_questions_considered > 0 else 0,
        'alpha_cronbach_rede': alpha_cronbach_rede,
        'mapa_descritores': mapa_descritores,
        'comparacao_periodos': comparacao_periodos
    }
