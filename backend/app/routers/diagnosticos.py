"""
Diagnóstico Module Router
Diagnostic assessment for grades 1-5 with item-based evaluation
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from collections import Counter

from ..database import get_db
from ..models import (
    ItemDiagnostico, Diagnostico, DiagnosticoResultado, AvaliacaoItemDiagnostico,
    Aluno, Professor, Turma, Usuario, PerfilUsuario, TipoDiagnostico, HipoteseEscrita
)
from ..schemas import (
    ItemDiagnosticoCreate, ItemDiagnosticoUpdate, ItemDiagnosticoResponse,
    DiagnosticoCreate, DiagnosticoUpdate, DiagnosticoResponse,
    DiagnosticoSubstituir, DiagnosticoVincularItens,
    DiagnosticoResultadoCreate, DiagnosticoResultadoUpdate,
    DiagnosticoResultadoResponse, DiagnosticoResultadoBulk,
    RelatorioDiagnosticoPorEixo, EstatisticaEixo
)
from ..auth import get_current_active_user, require_gestao_municipal, require_diretor_or_gestao
from ..dependencies import get_current_professor

router = APIRouter()


# ============================================
# ITEM DIAGNÓSTICO MANAGEMENT (GESTÃO MUNICIPAL)
# ============================================

@router.post("/itens", response_model=ItemDiagnosticoResponse, status_code=status.HTTP_201_CREATED)
async def create_item_diagnostico(
    item_data: ItemDiagnosticoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Criar item de diagnóstico (GESTÃO MUNICIPAL only)
    Items são reutilizáveis e podem ser vinculados a múltiplos diagnósticos
    """
    db_item = ItemDiagnostico(**item_data.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


@router.get("/itens", response_model=List[ItemDiagnosticoResponse])
async def list_itens_diagnostico(
    modalidade: Optional[str] = None,
    ano_aplicavel: Optional[int] = None,
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar itens de diagnóstico com filtros"""
    query = db.query(ItemDiagnostico)

    if modalidade:
        query = query.filter(ItemDiagnostico.modalidade == modalidade)

    if ano_aplicavel:
        # Filtrar itens que contém o ano especificado
        query = query.filter(ItemDiagnostico.anos_aplicaveis.contains(str(ano_aplicavel)))

    if ativo is not None:
        query = query.filter(ItemDiagnostico.ativo == ativo)

    # Ordenar por modalidade e depois por descrição
    query = query.order_by(ItemDiagnostico.modalidade, ItemDiagnostico.descricao)

    itens = query.offset(skip).limit(limit).all()
    return itens


@router.get("/itens/{item_id}", response_model=ItemDiagnosticoResponse)
async def get_item_diagnostico(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obter item de diagnóstico por ID"""
    item = db.query(ItemDiagnostico).filter(ItemDiagnostico.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item de diagnóstico não encontrado"
        )

    return item


@router.put("/itens/{item_id}", response_model=ItemDiagnosticoResponse)
async def update_item_diagnostico(
    item_id: int,
    item_data: ItemDiagnosticoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Atualizar item de diagnóstico"""
    item = db.query(ItemDiagnostico).filter(ItemDiagnostico.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item de diagnóstico não encontrado"
        )

    update_data = item_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/itens/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item_diagnostico(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Deletar item de diagnóstico (soft delete)"""
    item = db.query(ItemDiagnostico).filter(ItemDiagnostico.id == item_id).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item de diagnóstico não encontrado"
        )

    item.ativo = False
    db.commit()

    return None


@router.get("/itens/template/download")
async def download_template_itens(
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Baixar template Excel para importação de itens de diagnóstico
    """
    from fastapi.responses import StreamingResponse
    import openpyxl
    from io import BytesIO
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Itens Diagnóstico"
    
    # Cabeçalhos
    headers = ["Descrição", "Modalidade", "Anos Aplicáveis"]
    ws.append(headers)
    
    # Exemplos
    ws.append([
        "Identificar letras do alfabeto",
        "LEITURA",
        "1,2"
    ])
    ws.append([
        "Produzir texto com sequência lógica",
        "ESCRITA",
        "3,4,5"
    ])
    
    # Ajustar largura das colunas
    ws.column_dimensions['A'].width = 60
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 20
    
    # Adicionar instruções
    ws2 = wb.create_sheet("Instruções")
    ws2.append(["INSTRUÇÕES PARA PREENCHIMENTO"])
    ws2.append([])
    ws2.append(["Descrição: Texto descritivo do item de diagnóstico"])
    ws2.append(["Modalidade: Digite LEITURA ou ESCRITA"])
    ws2.append(["Anos Aplicáveis: Anos separados por vírgula (ex: 1,2,3 ou 4,5)"])
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_itens_diagnostico.xlsx"}
    )


@router.post("/itens/importar")
async def importar_itens(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Importar itens de diagnóstico a partir de arquivo Excel
    """
    from fastapi import UploadFile, File
    import openpyxl
    from io import BytesIO
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser .xlsx ou .xls"
        )
    
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        ws = wb.active
        
        sucesso = 0
        erros = []
        
        # Pular cabeçalho
        for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row[0]:  # Pular linhas vazias
                continue
            
            try:
                descricao = str(row[0]).strip()
                modalidade = str(row[1]).strip().upper()
                anos_raw = str(row[2]).strip()
                
                # Processar anos aplicáveis - converter de "4.5" ou "1,2,3" para formato correto
                anos_list = []
                for ano in anos_raw.replace(',', ' ').split():
                    try:
                        # Converte para float primeiro (caso venha 4.5 do Excel) e depois para int
                        ano_int = int(float(ano.strip()))
                        if 1 <= ano_int <= 5:
                            anos_list.append(ano_int)
                        else:
                            raise ValueError(f"Ano {ano_int} fora do intervalo 1-5")
                    except ValueError as e:
                        erros.append({
                            "linha": idx,
                            "erro": f"Ano inválido '{ano}': {str(e)}"
                        })
                        continue
                
                if not anos_list:
                    erros.append({
                        "linha": idx,
                        "erro": "Nenhum ano válido encontrado"
                    })
                    continue
                
                # Formatar como string: "1,2,3"
                anos_aplicaveis = ','.join(str(a) for a in sorted(set(anos_list)))
                
                # Validações
                if modalidade not in ['LEITURA', 'ESCRITA']:
                    erros.append({
                        "linha": idx,
                        "erro": f"Modalidade inválida: {modalidade}. Use LEITURA ou ESCRITA"
                    })
                    continue
                
                # Verificar se já existe item com mesma descrição
                existing_item = db.query(ItemDiagnostico).filter(
                    func.lower(ItemDiagnostico.descricao) == func.lower(descricao)
                ).first()
                
                if existing_item:
                    # Atualizar item existente
                    existing_item.modalidade = modalidade
                    existing_item.anos_aplicaveis = anos_aplicaveis
                    existing_item.ativo = True
                else:
                    # Criar novo item
                    db_item = ItemDiagnostico(
                        descricao=descricao,
                        modalidade=modalidade,
                        anos_aplicaveis=anos_aplicaveis,
                        ativo=True
                    )
                    db.add(db_item)
                
                sucesso += 1
                
            except Exception as e:
                erros.append({
                    "linha": idx,
                    "erro": str(e)
                })
        
        db.commit()
        
        return {
            "sucesso": sucesso,
            "total_linhas": ws.max_row - 1,
            "erros": erros
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )


# ============================================
# DIAGNOSTICO TEMPLATE MANAGEMENT
# ============================================

@router.post("/", response_model=DiagnosticoResponse, status_code=status.HTTP_201_CREATED)
async def create_diagnostico(
    diagnostico_data: DiagnosticoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Criar diagnóstico (GESTÃO MUNICIPAL only)
    Após criar, vincule itens usando POST /diagnosticos/{id}/vincular-itens
    """
    db_diagnostico = Diagnostico(**diagnostico_data.dict())
    db.add(db_diagnostico)
    db.commit()
    db.refresh(db_diagnostico)

    return db_diagnostico


@router.post("/{diagnostico_id}/vincular-itens")
async def vincular_itens_diagnostico(
    diagnostico_id: int,
    vincular_data: DiagnosticoVincularItens,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Vincular itens a um diagnóstico (GESTÃO MUNICIPAL only)
    Substitui os itens anteriormente vinculados
    """
    diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado"
        )

    # Verificar se todos os itens existem
    itens = db.query(ItemDiagnostico).filter(
        ItemDiagnostico.id.in_(vincular_data.item_ids),
        ItemDiagnostico.ativo == True
    ).all()

    if len(itens) != len(vincular_data.item_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Um ou mais itens não foram encontrados ou estão inativos"
        )

    # Substituir itens vinculados
    diagnostico.itens = itens
    db.commit()

    return {
        "message": f"Vinculados {len(itens)} itens ao diagnóstico",
        "diagnostico_id": diagnostico_id,
        "item_ids": [item.id for item in itens]
    }


@router.get("/", response_model=List[DiagnosticoResponse])
async def list_diagnosticos(
    ano_letivo: int = None,
    tipo: TipoDiagnostico = None,
    ativo: bool = True,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar diagnósticos"""
    from sqlalchemy.orm import joinedload
    from datetime import datetime

    query = db.query(Diagnostico).options(joinedload(Diagnostico.itens))

    if ano_letivo:
        query = query.filter(Diagnostico.ano_letivo == ano_letivo)
    if tipo:
        query = query.filter(Diagnostico.tipo == tipo)
    if ativo is not None:
        query = query.filter(Diagnostico.ativo == ativo)

    # Se for professor, mostrar apenas diagnósticos disponíveis no momento
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        now = datetime.now()

        # Diagnósticos sem data_disponivel OU que já estão disponíveis
        query = query.filter(
            (Diagnostico.data_disponivel.is_(None)) |
            (Diagnostico.data_disponivel <= now)
        )

        # Diagnósticos sem data_limite OU que ainda não expiraram
        query = query.filter(
            (Diagnostico.data_limite.is_(None)) |
            (Diagnostico.data_limite >= now)
        )

    diagnosticos = query.offset(skip).limit(limit).all()
    return diagnosticos


@router.get("/resultados", response_model=List[DiagnosticoResultadoResponse])
async def list_resultados_diagnostico(
    diagnostico_id: Optional[int] = None,
    aluno_id: Optional[int] = None,
    turma_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Listar resultados de diagnósticos com filtros"""
    query = db.query(DiagnosticoResultado)

    # Filtrar por professor se for PROFESSOR
    if current_user.perfil == PerfilUsuario.PROFESSOR:
        if current_user.professor:
            query = query.filter(DiagnosticoResultado.professor_id == current_user.professor.id)

    if diagnostico_id:
        query = query.filter(DiagnosticoResultado.diagnostico_id == diagnostico_id)

    if aluno_id:
        query = query.filter(DiagnosticoResultado.aluno_id == aluno_id)

    if turma_id:
        query = query.join(Aluno).filter(Aluno.turma_id == turma_id)

    resultados = query.offset(skip).limit(limit).all()
    return resultados


@router.get("/{diagnostico_id}", response_model=DiagnosticoResponse)
async def get_diagnostico(
    diagnostico_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obter diagnóstico por ID"""
    diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado"
        )

    return diagnostico


@router.put("/{diagnostico_id}", response_model=DiagnosticoResponse)
async def update_diagnostico(
    diagnostico_id: int,
    diagnostico_data: DiagnosticoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """Atualizar diagnóstico"""
    diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado"
        )

    update_data = diagnostico_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(diagnostico, field, value)

    db.commit()
    db.refresh(diagnostico)

    return diagnostico


@router.post("/substituir")
async def substituir_diagnostico(
    substituicao_data: DiagnosticoSubstituir,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Substituir diagnóstico por um novo
    Marca o antigo como substituído
    """
    diagnostico_antigo = db.query(Diagnostico).filter(
        Diagnostico.id == substituicao_data.diagnostico_antigo_id
    ).first()

    if not diagnostico_antigo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico antigo não encontrado"
        )

    # Criar novo diagnóstico
    novo_diagnostico_data = substituicao_data.novo_diagnostico
    db_novo_diagnostico = Diagnostico(**novo_diagnostico_data.dict())
    db.add(db_novo_diagnostico)
    db.flush()

    # Marcar antigo como substituído
    diagnostico_antigo.ativo = False
    diagnostico_antigo.substituido_por_id = db_novo_diagnostico.id

    db.commit()
    db.refresh(db_novo_diagnostico)

    return {
        "message": "Diagnóstico substituído com sucesso",
        "diagnostico_antigo_id": diagnostico_antigo.id,
        "novo_diagnostico_id": db_novo_diagnostico.id,
        "novo_diagnostico": db_novo_diagnostico
    }


# ============================================
# AVALIAÇÃO DE ALUNOS (PROFESSOR)
# ============================================

@router.post("/resultados", response_model=DiagnosticoResultadoResponse, status_code=status.HTTP_201_CREATED)
async def create_resultado_diagnostico(
    resultado_data: DiagnosticoResultadoCreate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """
    Aplicar diagnóstico completo a um aluno (PROFESSOR only)
    Inclui hipótese de escrita e avaliação de todos os itens
    """
    # Verificar diagnóstico
    diagnostico = db.query(Diagnostico).filter(
        Diagnostico.id == resultado_data.diagnostico_id,
        Diagnostico.ativo == True
    ).first()

    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado ou inativo"
        )

    # Verificar aluno
    aluno = db.query(Aluno).filter(Aluno.id == resultado_data.aluno_id).first()
    if not aluno:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aluno não encontrado"
        )

        # Verificar se o aluno pertence a uma turma do professor logado
        if aluno.turma.professor_id != current_professor.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para aplicar diagnóstico neste aluno. O aluno deve pertencer a uma de suas turmas."
            )

    # Verificar se aluno está no ano aplicável
    if aluno.turma.ano_escolar < diagnostico.aplicavel_ano_inicial or \
       aluno.turma.ano_escolar > diagnostico.aplicavel_ano_final:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Este diagnóstico não é aplicável ao ano escolar do aluno"
        )

    # Verificar se já existe resultado
    existing = db.query(DiagnosticoResultado).filter(
        DiagnosticoResultado.diagnostico_id == resultado_data.diagnostico_id,
        DiagnosticoResultado.aluno_id == resultado_data.aluno_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um resultado para este aluno neste diagnóstico. Use PUT para atualizar."
        )

    # Criar resultado com hipótese de escrita
    db_resultado = DiagnosticoResultado(
        diagnostico_id=resultado_data.diagnostico_id,
        aluno_id=resultado_data.aluno_id,
        professor_id=current_professor.id,
        hipotese_escrita=resultado_data.hipotese_escrita,
        observacoes=resultado_data.observacoes
    )

    db.add(db_resultado)
    db.flush()

    # Criar avaliações de itens
    for avaliacao_item in resultado_data.avaliacoes_itens:
        db_avaliacao = AvaliacaoItemDiagnostico(
            diagnostico_resultado_id=db_resultado.id,
            item_diagnostico_id=avaliacao_item.item_diagnostico_id,
            resposta=avaliacao_item.resposta
        )
        db.add(db_avaliacao)

    db.commit()
    db.refresh(db_resultado)

    return db_resultado


@router.put("/resultados/{resultado_id}", response_model=DiagnosticoResultadoResponse)
async def update_resultado_diagnostico(
    resultado_id: int,
    resultado_data: DiagnosticoResultadoUpdate,
    db: Session = Depends(get_db),
    current_professor: Professor = Depends(get_current_professor)
):
    """Atualizar resultado de diagnóstico"""
    resultado = db.query(DiagnosticoResultado).filter(
        DiagnosticoResultado.id == resultado_id
    ).first()

    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resultado não encontrado"
        )

    # Verificar ownership
    if resultado.professor_id != current_professor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode editar este resultado"
        )

    # Atualizar campos básicos
    if resultado_data.hipotese_escrita:
        resultado.hipotese_escrita = resultado_data.hipotese_escrita
    if resultado_data.observacoes is not None:
        resultado.observacoes = resultado_data.observacoes

    # Atualizar avaliações de itens se fornecidas
    if resultado_data.avaliacoes_itens:
        # Remover avaliações antigas
        db.query(AvaliacaoItemDiagnostico).filter(
            AvaliacaoItemDiagnostico.diagnostico_resultado_id == resultado.id
        ).delete()

        # Criar novas avaliações
        for avaliacao_item in resultado_data.avaliacoes_itens:
            db_avaliacao = AvaliacaoItemDiagnostico(
                diagnostico_resultado_id=resultado.id,
                item_diagnostico_id=avaliacao_item.item_diagnostico_id,
                resposta=avaliacao_item.resposta
            )
            db.add(db_avaliacao)

    db.commit()
    db.refresh(resultado)

    return resultado


# ============================================
# RELATÓRIOS
# ============================================

@router.get("/relatorios/por-eixo/{diagnostico_id}", response_model=RelatorioDiagnosticoPorEixo)
async def relatorio_diagnostico_por_eixo(
    diagnostico_id: int,
    turma_id: Optional[int] = None,
    escola_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Relatório de diagnóstico agrupado por hipótese de escrita (eixo)
    Mostra quantidade e porcentagem de alunos em cada eixo

    Permissões:
    - GESTÃO_MUNICIPAL: Acesso total
    - DIRETOR_COORDENADOR: Apenas dados da sua escola
    - PROFESSOR: Apenas dados das turmas que leciona
    """
    # Verificar diagnóstico
    diagnostico = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()
    if not diagnostico:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diagnóstico não encontrado"
        )

    # Aplicar restrições de acesso por perfil
    from ..models import Escola

    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        # Diretor só pode ver dados da sua escola
        escola = db.query(Escola).filter(Escola.diretor_id == current_user.id).first()
        if not escola:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não está associado a nenhuma escola"
            )
        # Forçar filtro pela escola do diretor
        escola_id = escola.id

    elif current_user.perfil == PerfilUsuario.PROFESSOR:
        # Professor só pode ver dados das suas turmas
        if not current_user.professor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Professor não encontrado"
            )
        # Se turma_id não foi especificado, pegar escola do professor
        if not turma_id:
            escola_id = current_user.professor.escola_id

    # Query base para alunos aplicáveis
    alunos_query = db.query(Aluno).join(Turma).filter(
        Turma.ano_escolar >= diagnostico.aplicavel_ano_inicial,
        Turma.ano_escolar <= diagnostico.aplicavel_ano_final,
        Aluno.ativo == True
    )

    if turma_id:
        alunos_query = alunos_query.filter(Aluno.turma_id == turma_id)

        # Verificar se professor tem acesso a esta turma
        if current_user.perfil == PerfilUsuario.PROFESSOR:
            turma = db.query(Turma).filter(Turma.id == turma_id).first()
            if not turma or turma.escola_id != current_user.professor.escola_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você não tem permissão para acessar esta turma"
                )

    if escola_id:
        alunos_query = alunos_query.filter(Turma.escola_id == escola_id)

    total_alunos_turma = alunos_query.count()

    # Buscar resultados do diagnóstico
    resultados_query = db.query(DiagnosticoResultado).filter(
        DiagnosticoResultado.diagnostico_id == diagnostico_id
    )

    if turma_id:
        resultados_query = resultados_query.join(Aluno).filter(Aluno.turma_id == turma_id)

    if escola_id:
        resultados_query = resultados_query.join(Aluno).join(Turma).filter(Turma.escola_id == escola_id)

    resultados = resultados_query.all()

    # Separar alunos avaliados de não avaliados
    # Alunos com hipotese_escrita = NAO_AVALIADO são considerados "não avaliados"
    resultados_avaliados = [r for r in resultados if r.hipotese_escrita != HipoteseEscrita.NAO_AVALIADO]
    resultados_nao_avaliados = [r for r in resultados if r.hipotese_escrita == HipoteseEscrita.NAO_AVALIADO]

    total_alunos_avaliados = len(resultados_avaliados)
    # Não avaliados = alunos sem registro + alunos com NAO_AVALIADO
    total_com_registro_nao_avaliado = len(resultados_nao_avaliados)
    total_sem_registro = total_alunos_turma - len(resultados)
    total_nao_avaliados = total_sem_registro + total_com_registro_nao_avaliado

    # Contar por eixo (incluindo NAO_AVALIADO)
    eixos_counter = Counter([r.hipotese_escrita for r in resultados])

    # Criar estatísticas por eixo
    estatisticas_por_eixo = []
    for eixo in HipoteseEscrita:
        quantidade = eixos_counter.get(eixo, 0)
        # Percentual baseado no total de alunos da turma
        percentual = (quantidade / total_alunos_turma * 100) if total_alunos_turma > 0 else 0.0

        estatisticas_por_eixo.append(EstatisticaEixo(
            eixo=eixo,
            quantidade=quantidade,
            percentual=round(percentual, 2)
        ))

    # Calcular porcentagens gerais
    percentual_avaliados = (total_alunos_avaliados / total_alunos_turma * 100) if total_alunos_turma > 0 else 0.0
    percentual_nao_avaliados = (total_nao_avaliados / total_alunos_turma * 100) if total_alunos_turma > 0 else 0.0

    return RelatorioDiagnosticoPorEixo(
        diagnostico_id=diagnostico.id,
        diagnostico_nome=diagnostico.nome,
        total_alunos_turma=total_alunos_turma,
        total_alunos_avaliados=total_alunos_avaliados,
        total_nao_avaliados=total_nao_avaliados,
        percentual_avaliados=round(percentual_avaliados, 2),
        percentual_nao_avaliados=round(percentual_nao_avaliados, 2),
        estatisticas_por_eixo=estatisticas_por_eixo
    )
