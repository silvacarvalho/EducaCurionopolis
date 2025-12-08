"""
Importação de Escolas e Diretores via Excel
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
import re

from ..database import get_db
from ..models import Escola, Usuario, PerfilUsuario
from ..auth import get_current_active_user, require_gestao_municipal, get_password_hash

router = APIRouter()


def normalize_cpf(cpf: str) -> str:
    """Remove pontuação do CPF e retorna apenas dígitos"""
    if not cpf:
        return ""
    return re.sub(r'\D', '', str(cpf))


def validate_cpf(cpf: str) -> bool:
    """Valida se CPF tem 11 dígitos"""
    cpf = normalize_cpf(cpf)
    return len(cpf) == 11


def validate_email(email: str) -> bool:
    """Valida formato básico de email"""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


# ============================================
# TEMPLATE E IMPORTAÇÃO DE ESCOLAS
# ============================================

def create_template_escolas() -> BytesIO:
    """
    Cria template Excel para importação de escolas
    """
    wb = openpyxl.Workbook()

    # ===== ABA 1: INSTRUÇÕES =====
    ws_instrucoes = wb.active
    ws_instrucoes.title = "INSTRUÇÕES"

    # Título
    ws_instrucoes['A1'] = "TEMPLATE DE IMPORTAÇÃO DE ESCOLAS - EDUCA+ CURIONÓPOLIS"
    ws_instrucoes['A1'].font = Font(size=14, bold=True, color="FFFFFF")
    ws_instrucoes['A1'].fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
    ws_instrucoes['A1'].alignment = Alignment(horizontal="center", vertical="center")
    ws_instrucoes.merge_cells('A1:D1')
    ws_instrucoes.row_dimensions[1].height = 30

    # Instruções gerais
    instrucoes = [
        ("", ""),
        ("INSTRUÇÕES GERAIS:", ""),
        ("1. Preencha a aba 'ESCOLAS' com os dados das escolas", ""),
        ("2. NÃO altere os nomes das colunas (use exatamente como estão)", ""),
        ("3. O campo 'cpf_diretor' é OPCIONAL - deixe vazio se não houver diretor", ""),
        ("4. Código INEP deve ser único para cada escola", ""),
        ("5. Após preencher, salve e faça o upload do arquivo", ""),
        ("", ""),
        ("COLUNAS DA PLANILHA:", ""),
        ("- nome", "Nome da escola (obrigatório)"),
        ("- endereco", "Endereço da escola (opcional)"),
        ("- telefone", "Telefone da escola (opcional)"),
        ("- email", "Email da escola (opcional)"),
        ("- codigo_inep", "Código INEP da escola (opcional, mas único)"),
        ("- cpf_diretor", "CPF do diretor (opcional - deixe vazio para atribuir depois)"),
        ("", ""),
        ("IMPORTANTE:", ""),
        ("- Se informado, o diretor deve estar cadastrado no sistema", ""),
        ("- O diretor não pode estar vinculado a outra escola", ""),
        ("- Escolas com nome duplicado serão rejeitadas", ""),
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

    # ===== ABA 2: ESCOLAS (TEMPLATE) =====
    ws_escolas = wb.create_sheet("ESCOLAS")

    # Cabeçalhos
    headers = [
        "nome",
        "endereco",
        "telefone",
        "email",
        "codigo_inep",
        "cpf_diretor"
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
        cell = ws_escolas.cell(row=1, column=idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    # Linha de exemplo
    exemplo = [
        "E.M. José de Alencar",
        "Rua Principal, 123 - Centro",
        "(94) 3456-7890",
        "escola.josealencar@curionopolis.pa.gov.br",
        "15123456",
        ""  # CPF do diretor é opcional
    ]

    for idx, valor in enumerate(exemplo, start=1):
        cell = ws_escolas.cell(row=2, column=idx, value=valor)
        cell.border = border
        cell.font = Font(italic=True, color="666666")

    # Ajustar larguras das colunas
    column_widths = {
        'A': 40,  # nome
        'B': 40,  # endereco
        'C': 18,  # telefone
        'D': 40,  # email
        'E': 15,  # codigo_inep
        'F': 18,  # cpf_diretor
    }

    for col, width in column_widths.items():
        ws_escolas.column_dimensions[col].width = width

    # Congelar primeira linha
    ws_escolas.freeze_panes = 'A2'

    # Salvar em BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return output


@router.get("/escolas/template")
async def download_template_escolas(
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Download do template Excel para importação de escolas
    Disponível apenas para: Gestão Municipal
    """
    excel_file = create_template_escolas()

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=template_importacao_escolas_{datetime.now().strftime('%Y%m%d')}.xlsx"
        }
    )


@router.post("/escolas/importar")
async def importar_escolas(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Importar escolas via arquivo Excel
    Disponível apenas para: Gestão Municipal
    """
    # Validar tipo de arquivo
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser Excel (.xlsx ou .xls)"
        )

    try:
        # Ler arquivo Excel
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents), sheet_name="ESCOLAS")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao ler arquivo Excel: {str(e)}. Verifique se existe a aba 'ESCOLAS'."
        )

    # Verificar colunas obrigatórias
    required_columns = ['nome']  # cpf_diretor agora é opcional
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Colunas obrigatórias faltando: {', '.join(missing_columns)}"
        )

    # Processar dados
    resultados = {
        'total': len(df),
        'sucesso': 0,
        'erros': [],
        'escolas_criadas': []
    }

    for idx, row in df.iterrows():
        linha = idx + 2  # +2 porque Excel começa em 1 e tem cabeçalho

        try:
            # Pular linha de exemplo (com valor em itálico/exemplo)
            if pd.isna(row.get('nome')) or str(row.get('nome')).strip() == '':
                continue

            nome = str(row['nome']).strip()
            cpf_diretor_raw = str(row.get('cpf_diretor', '')) if pd.notna(row.get('cpf_diretor')) else ''
            cpf_diretor = normalize_cpf(cpf_diretor_raw)

            # Verificar se escola já existe
            if db.query(Escola).filter(Escola.nome == nome).first():
                resultados['erros'].append(f"Linha {linha}: Escola '{nome}' já existe")
                continue

            # Verificar código INEP único
            codigo_inep = str(row.get('codigo_inep', '')).strip() if pd.notna(row.get('codigo_inep')) else None
            if codigo_inep:
                if db.query(Escola).filter(Escola.codigo_inep == codigo_inep).first():
                    resultados['erros'].append(f"Linha {linha}: Código INEP '{codigo_inep}' já cadastrado")
                    continue

            # Diretor é opcional - só processa se CPF foi informado
            diretor = None
            diretor_id = None
            if cpf_diretor:
                # Validar CPF do diretor apenas se foi informado
                if not validate_cpf(cpf_diretor):
                    resultados['erros'].append(f"Linha {linha}: CPF do diretor inválido")
                    continue

                # Buscar diretor pelo CPF
                diretor = db.query(Usuario).filter(
                    Usuario.cpf == cpf_diretor,
                    Usuario.perfil == PerfilUsuario.DIRETOR_COORDENADOR
                ).first()

                if not diretor:
                    resultados['erros'].append(f"Linha {linha}: Diretor com CPF {cpf_diretor} não encontrado ou não é diretor")
                    continue

                # Verificar se diretor já gerencia outra escola
                if diretor.escola_dirigida:
                    resultados['erros'].append(f"Linha {linha}: Diretor {diretor.nome_completo} já gerencia outra escola")
                    continue
                
                diretor_id = diretor.id

            # Validar e processar email
            email_raw = str(row.get('email', '')).strip() if pd.notna(row.get('email')) else ''
            email = None
            if email_raw:
                if validate_email(email_raw):
                    email = email_raw
                else:
                    resultados['erros'].append(f"Linha {linha}: Email '{email_raw}' inválido - será ignorado")

            # Criar escola
            nova_escola = Escola(
                nome=nome,
                endereco=str(row.get('endereco', '')).strip() if pd.notna(row.get('endereco')) else None,
                telefone=str(row.get('telefone', '')).strip() if pd.notna(row.get('telefone')) else None,
                email=email,
                codigo_inep=codigo_inep,
                diretor_id=diretor_id
            )

            db.add(nova_escola)
            db.commit()
            db.refresh(nova_escola)

            resultados['sucesso'] += 1
            resultados['escolas_criadas'].append({
                'id': nova_escola.id,
                'nome': nova_escola.nome,
                'diretor': diretor.nome_completo if diretor else 'Sem diretor atribuído'
            })

        except Exception as e:
            db.rollback()
            resultados['erros'].append(f"Linha {linha}: Erro inesperado - {str(e)}")

    return resultados


# ============================================
# TEMPLATE E IMPORTAÇÃO DE DIRETORES
# ============================================

def create_template_diretores() -> BytesIO:
    """
    Cria template Excel para importação de diretores
    """
    wb = openpyxl.Workbook()

    # ===== ABA 1: INSTRUÇÕES =====
    ws_instrucoes = wb.active
    ws_instrucoes.title = "INSTRUÇÕES"

    # Título
    ws_instrucoes['A1'] = "TEMPLATE DE IMPORTAÇÃO DE DIRETORES - EDUCA+ CURIONÓPOLIS"
    ws_instrucoes['A1'].font = Font(size=14, bold=True, color="FFFFFF")
    ws_instrucoes['A1'].fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
    ws_instrucoes['A1'].alignment = Alignment(horizontal="center", vertical="center")
    ws_instrucoes.merge_cells('A1:D1')
    ws_instrucoes.row_dimensions[1].height = 30

    # Instruções gerais
    instrucoes = [
        ("", ""),
        ("INSTRUÇÕES GERAIS:", ""),
        ("1. Preencha a aba 'DIRETORES' com os dados dos diretores", ""),
        ("2. NÃO altere os nomes das colunas (use exatamente como estão)", ""),
        ("3. CPF deve conter 11 dígitos (com ou sem pontuação)", ""),
        ("4. Email deve ser válido e único no sistema", ""),
        ("5. A senha padrão é '123456' - pode ser alterada na planilha", ""),
        ("6. Após preencher, salve e faça o upload do arquivo", ""),
        ("", ""),
        ("COLUNAS DA PLANILHA:", ""),
        ("- cpf", "CPF do diretor - 11 dígitos (obrigatório)"),
        ("- nome_completo", "Nome completo do diretor (obrigatório)"),
        ("- email", "Email do diretor - único (obrigatório)"),
        ("- telefone", "Telefone do diretor (opcional)"),
        ("- senha", "Senha inicial - padrão: 123456 (opcional)"),
        ("", ""),
        ("IMPORTANTE:", ""),
        ("- CPF e email devem ser únicos no sistema", ""),
        ("- Diretores com CPF ou email duplicado serão rejeitados", ""),
        ("- Se a senha estiver vazia, será usada a senha padrão '123456'", ""),
        ("- Após cadastro, o diretor poderá alterar sua senha", ""),
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

    # ===== ABA 2: DIRETORES (TEMPLATE) =====
    ws_diretores = wb.create_sheet("DIRETORES")

    # Cabeçalhos
    headers = [
        "cpf",
        "nome_completo",
        "email",
        "telefone",
        "senha"
    ]

    # Estilo do cabeçalho
    header_fill = PatternFill(start_color="FF9800", end_color="FF9800", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    for idx, header in enumerate(headers, start=1):
        cell = ws_diretores.cell(row=1, column=idx, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    # Linha de exemplo
    exemplo = [
        "123.456.789-00",
        "Maria das Graças Silva",
        "maria.silva@email.com",
        "(94) 98765-4321",
        "123456"  # Senha padrão - pode ser alterada
    ]

    for idx, valor in enumerate(exemplo, start=1):
        cell = ws_diretores.cell(row=2, column=idx, value=valor)
        cell.border = border
        cell.font = Font(italic=True, color="666666")

    # Ajustar larguras das colunas
    column_widths = {
        'A': 18,  # cpf
        'B': 40,  # nome_completo
        'C': 35,  # email
        'D': 18,  # telefone
        'E': 15,  # senha
    }

    for col, width in column_widths.items():
        ws_diretores.column_dimensions[col].width = width

    # Congelar primeira linha
    ws_diretores.freeze_panes = 'A2'

    # Salvar em BytesIO
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return output


@router.get("/diretores/template")
async def download_template_diretores(
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Download do template Excel para importação de diretores
    Disponível apenas para: Gestão Municipal
    """
    excel_file = create_template_diretores()

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=template_importacao_diretores_{datetime.now().strftime('%Y%m%d')}.xlsx"
        }
    )


@router.post("/diretores/importar")
async def importar_diretores(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_gestao_municipal)
):
    """
    Importar diretores via arquivo Excel
    Disponível apenas para: Gestão Municipal
    """
    # Validar tipo de arquivo
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser Excel (.xlsx ou .xls)"
        )

    try:
        # Ler arquivo Excel
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents), sheet_name="DIRETORES")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao ler arquivo Excel: {str(e)}. Verifique se existe a aba 'DIRETORES'."
        )

    # Verificar colunas obrigatórias - senha não é mais obrigatória (padrão: 123456)
    required_columns = ['cpf', 'nome_completo', 'email']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Colunas obrigatórias faltando: {', '.join(missing_columns)}"
        )

    # Processar dados
    resultados = {
        'total': len(df),
        'sucesso': 0,
        'erros': [],
        'diretores_criados': []
    }

    for idx, row in df.iterrows():
        linha = idx + 2  # +2 porque Excel começa em 1 e tem cabeçalho

        try:
            # Pular linhas vazias
            if pd.isna(row.get('cpf')) or str(row.get('cpf')).strip() == '':
                continue

            cpf = normalize_cpf(str(row['cpf']))
            nome_completo = str(row['nome_completo']).strip()
            email = str(row['email']).strip().lower()
            telefone = str(row.get('telefone', '')).strip() if pd.notna(row.get('telefone')) else None
            
            # Senha: usa o valor informado ou padrão "123456"
            senha_raw = str(row.get('senha', '')).strip() if pd.notna(row.get('senha')) else ''
            senha = senha_raw if senha_raw else '123456'

            # Validações
            if not validate_cpf(cpf):
                resultados['erros'].append(f"Linha {linha}: CPF inválido")
                continue

            if not nome_completo:
                resultados['erros'].append(f"Linha {linha}: Nome completo é obrigatório")
                continue

            if not validate_email(email):
                resultados['erros'].append(f"Linha {linha}: Email inválido")
                continue

            if len(senha) < 6:
                resultados['erros'].append(f"Linha {linha}: Senha deve ter pelo menos 6 caracteres")
                continue

            # Verificar se CPF já existe
            if db.query(Usuario).filter(Usuario.cpf == cpf).first():
                resultados['erros'].append(f"Linha {linha}: CPF {cpf} já cadastrado")
                continue

            # Verificar se email já existe
            if db.query(Usuario).filter(Usuario.email == email).first():
                resultados['erros'].append(f"Linha {linha}: Email {email} já cadastrado")
                continue

            # Criar diretor
            hashed_password = get_password_hash(senha)
            novo_diretor = Usuario(
                cpf=cpf,
                nome_completo=nome_completo,
                email=email,
                telefone=telefone,
                perfil=PerfilUsuario.DIRETOR_COORDENADOR,
                senha_hash=hashed_password
            )

            db.add(novo_diretor)
            db.commit()
            db.refresh(novo_diretor)

            resultados['sucesso'] += 1
            resultados['diretores_criados'].append({
                'id': novo_diretor.id,
                'nome': novo_diretor.nome_completo,
                'email': novo_diretor.email
            })

        except Exception as e:
            db.rollback()
            resultados['erros'].append(f"Linha {linha}: Erro inesperado - {str(e)}")

    return resultados
