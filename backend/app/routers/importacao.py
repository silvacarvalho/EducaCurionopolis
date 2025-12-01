"""
Importação de Alunos via Excel
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from io import BytesIO
from datetime import datetime

from ..database import get_db
from ..models import Aluno, Turma, Escola, Usuario, PerfilUsuario
from ..schemas import AlunoResponse
from ..auth import get_current_active_user

router = APIRouter()


def create_template_excel() -> BytesIO:
    """
    Cria template Excel para importação de alunos
    """
    wb = openpyxl.Workbook()

    # ===== ABA 1: INSTRUÇÕES =====
    ws_instrucoes = wb.active
    ws_instrucoes.title = "INSTRUÇÕES"

    # Título
    ws_instrucoes['A1'] = "TEMPLATE DE IMPORTAÇÃO DE ALUNOS - EDUCA+ CURIONÓPOLIS"
    ws_instrucoes['A1'].font = Font(size=14, bold=True, color="FFFFFF")
    ws_instrucoes['A1'].fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
    ws_instrucoes['A1'].alignment = Alignment(horizontal="center", vertical="center")
    ws_instrucoes.merge_cells('A1:D1')
    ws_instrucoes.row_dimensions[1].height = 30

    # Instruções gerais
    instrucoes = [
        ("", ""),
        ("INSTRUÇÕES GERAIS:", ""),
        ("1. Preencha a aba 'ALUNOS' com os dados dos estudantes", ""),
        ("2. NÃO altere os nomes das colunas (use exatamente como estão)", ""),
        ("3. Datas devem estar no formato DD/MM/AAAA", ""),
        ("4. CPF deve conter 11 dígitos (com ou sem pontuação)", ""),
        ("5. Matrícula deve ser única para cada aluno", ""),
        ("6. Após preencher, salve e faça o upload do arquivo", ""),
        ("", ""),
        ("COLUNAS DA PLANILHA:", ""),
        ("- nome_completo", "Nome completo do aluno (obrigatório)"),
        ("- cpf", "CPF do aluno - 11 dígitos (obrigatório)"),
        ("- data_nascimento", "Data no formato DD/MM/AAAA (obrigatório)"),
        ("- matricula", "Número de matrícula único (obrigatório)"),
        ("- nome_responsavel", "Nome do responsável (opcional)"),
        ("- telefone_responsavel", "Telefone do responsável (opcional)"),
        ("", ""),
        ("IMPORTANTE:", ""),
        ("- A TURMA será selecionada no momento do upload", ""),
        ("- CPF e matrícula devem ser únicos no sistema", ""),
        ("- Alunos com CPF ou matrícula duplicada serão rejeitados", ""),
        ("- Verifique os dados antes de fazer o upload", ""),
    ]

    for idx, (col1, col2) in enumerate(instrucoes, start=3):
        ws_instrucoes[f'A{idx}'] = col1
        ws_instrucoes[f'B{idx}'] = col2
        if col1 and col1.endswith(':'):
            ws_instrucoes[f'A{idx}'].font = Font(bold=True, size=12)

    # Ajustar larguras
    ws_instrucoes.column_dimensions['A'].width = 50
    ws_instrucoes.column_dimensions['B'].width = 50

    # ===== ABA 2: ALUNOS (TEMPLATE) =====
    ws_alunos = wb.create_sheet("ALUNOS")

    # Cabeçalhos
    headers = [
        "nome_completo",
        "cpf",
        "data_nascimento",
        "matricula",
        "nome_responsavel",
        "telefone_responsavel"
    ]

    # Estilo do cabeçalho
    header_fill = PatternFill(start_color="4CAF50", end_color="4CAF50", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    for idx, header in enumerate(headers, start=1):
        cell = ws_alunos.cell(row=1, column=idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    # Linha de exemplo
    exemplo = [
        "João da Silva Santos",
        "123.456.789-00",
        "15/03/2015",
        "2025001",
        "Maria da Silva Santos",
        "(94) 98765-4321"
    ]

    for idx, valor in enumerate(exemplo, start=1):
        cell = ws_alunos.cell(row=2, column=idx, value=valor)
        cell.border = border
        cell.font = Font(italic=True, color="666666")

    # Ajustar larguras das colunas
    column_widths = {
        'A': 35,  # nome_completo
        'B': 18,  # cpf
        'C': 20,  # data_nascimento
        'D': 15,  # matricula
        'E': 35,  # nome_responsavel
        'F': 18,  # telefone_responsavel
    }

    for col, width in column_widths.items():
        ws_alunos.column_dimensions[col].width = width

    # Congelar primeira linha
    ws_alunos.freeze_panes = 'A2'

    # Salvar em BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return output


@router.get("/template")
async def download_template(
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Download do template Excel para importação de alunos
    Disponível para: Gestão Municipal e Diretor/Coordenador
    """
    if current_user.perfil not in [PerfilUsuario.GESTAO_MUNICIPAL, PerfilUsuario.DIRETOR_COORDENADOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Gestão Municipal e Diretores podem baixar o template"
        )

    excel_file = create_template_excel()

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=template_importacao_alunos_{datetime.now().strftime('%Y%m%d')}.xlsx"
        }
    )


@router.post("/alunos")
async def importar_alunos(
    turma_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Importar alunos via arquivo Excel

    Diretor/Coordenador: importa apenas para turmas da sua escola
    Gestão Municipal: importa para qualquer turma
    """
    # Verificar permissões
    if current_user.perfil not in [PerfilUsuario.GESTAO_MUNICIPAL, PerfilUsuario.DIRETOR_COORDENADOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas Gestão Municipal e Diretores podem importar alunos"
        )

    # Verificar turma
    turma = db.query(Turma).filter(Turma.id == turma_id).first()
    if not turma:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada"
        )

    # Diretor só pode importar para turmas da sua escola
    if current_user.perfil == PerfilUsuario.DIRETOR_COORDENADOR:
        escola = db.query(Escola).filter(Escola.diretor_id == current_user.id).first()
        if not escola or turma.escola_id != escola.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode importar alunos para turmas da sua escola"
            )

    # Validar tipo de arquivo
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser Excel (.xlsx ou .xls)"
        )

    try:
        # Ler arquivo Excel
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents), sheet_name="ALUNOS")

        # Remover linha de exemplo (se existir)
        df = df[df['cpf'] != '123.456.789-00']

        # Validações
        resultados = {
            "total": len(df),
            "sucesso": 0,
            "erros": 0,
            "detalhes_erros": []
        }

        alunos_criados = []

        for idx, row in df.iterrows():
            try:
                linha_num = idx + 2  # +2 porque tem header e exemplo

                # Validar campos obrigatórios
                nome_completo = str(row.get('nome_completo', '')).strip()
                cpf_raw = str(row.get('cpf', '')).strip()
                data_nasc_raw = row.get('data_nascimento')
                matricula = str(row.get('matricula', '')).strip()

                if not nome_completo or nome_completo == 'nan':
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": "Nome Completo é obrigatório"
                    })
                    continue

                if not cpf_raw or cpf_raw == 'nan':
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": "cpf é obrigatório"
                    })
                    continue

                # Limpar CPF
                cpf = ''.join(filter(str.isdigit, cpf_raw))
                if len(cpf) != 11:
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": f"cpf inválido: {cpf_raw}"
                    })
                    continue

                # Verificar CPF duplicado
                aluno_existente = db.query(Aluno).filter(Aluno.cpf == cpf).first()
                if aluno_existente:
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": f"cpf {cpf_raw} já cadastrado"
                    })
                    continue

                # Validar matrícula
                if not matricula or matricula == 'nan':
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": "matricula é obrigatória"
                    })
                    continue

                # Verificar matrícula duplicada
                matricula_existente = db.query(Aluno).filter(Aluno.matricula == matricula).first()
                if matricula_existente:
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": f"matricula {matricula} já cadastrada"
                    })
                    continue

                # Processar data de nascimento
                if pd.isna(data_nasc_raw):
                    resultados["erros"] += 1
                    resultados["detalhes_erros"].append({
                        "linha": linha_num,
                        "erro": "data_nascimento é obrigatória"
                    })
                    continue

                # Converter data
                if isinstance(data_nasc_raw, str):
                    try:
                        data_nascimento = datetime.strptime(data_nasc_raw, '%d/%m/%Y').date()
                    except:
                        resultados["erros"] += 1
                        resultados["detalhes_erros"].append({
                            "linha": linha_num,
                            "erro": f"Data inválida: {data_nasc_raw}. Use DD/MM/AAAA"
                        })
                        continue
                else:
                    data_nascimento = pd.to_datetime(data_nasc_raw).date()

                # Campos opcionais
                nome_responsavel = str(row.get('nome_responsavel', '')).strip() if not pd.isna(row.get('nome_responsavel')) else None
                telefone_responsavel = str(row.get('telefone_responsavel', '')).strip() if not pd.isna(row.get('telefone_responsavel')) else None

                # Criar aluno
                novo_aluno = Aluno(
                    nome_completo=nome_completo,
                    cpf=cpf,
                    data_nascimento=data_nascimento,
                    matricula=matricula,
                    turma_id=turma_id,
                    nome_responsavel=nome_responsavel if nome_responsavel and nome_responsavel != 'nan' else None,
                    telefone_responsavel=telefone_responsavel if telefone_responsavel and telefone_responsavel != 'nan' else None,
                    ativo=True
                )

                db.add(novo_aluno)
                alunos_criados.append(novo_aluno)
                resultados["sucesso"] += 1

            except Exception as e:
                resultados["erros"] += 1
                resultados["detalhes_erros"].append({
                    "linha": linha_num,
                    "erro": f"Erro ao processar: {str(e)}"
                })

        # Commit se houver sucesso
        if resultados["sucesso"] > 0:
            db.commit()

        return {
            "mensagem": f"Importação concluída: {resultados['sucesso']} alunos importados, {resultados['erros']} erros",
            "resultados": resultados,
            "alunos_importados": [
                {
                    "id": aluno.id,
                    "nome": aluno.nome_completo,
                    "cpf": aluno.cpf
                } for aluno in alunos_criados
            ]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )
