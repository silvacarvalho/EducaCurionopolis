"""
Script para gerar template Excel para importação de descritores SAEB
Execute: python gerar_template_descritores.py
"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

def criar_template_descritores():
    # Criar workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Descritores SAEB"

    # Estilos
    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # Cabeçalhos
    headers = ["disciplina", "ano_escolar", "codigo", "descricao"]
    header_labels = ["Disciplina", "Ano Escolar", "Código", "Descrição"]

    for col, (header, label) in enumerate(zip(headers, header_labels), start=1):
        cell = ws.cell(row=1, column=col)
        cell.value = label
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border

    # Ajustar larguras das colunas
    ws.column_dimensions['A'].width = 18  # Disciplina
    ws.column_dimensions['B'].width = 15  # Ano Escolar
    ws.column_dimensions['C'].width = 15  # Código
    ws.column_dimensions['D'].width = 80  # Descrição

    # Validação de dados para a coluna Disciplina (A)
    dv_disciplina = DataValidation(type="list", formula1='"PORTUGUES,MATEMATICA"', allow_blank=False)
    dv_disciplina.error = 'Valor inválido'
    dv_disciplina.errorTitle = 'Disciplina Inválida'
    dv_disciplina.prompt = 'Selecione PORTUGUES ou MATEMATICA'
    dv_disciplina.promptTitle = 'Disciplina'
    ws.add_data_validation(dv_disciplina)
    dv_disciplina.add(f'A2:A1000')  # Aplicar validação para 1000 linhas

    # Validação de dados para a coluna Ano Escolar (B)
    dv_ano = DataValidation(type="list", formula1='"5,9"', allow_blank=False)
    dv_ano.error = 'Valor inválido'
    dv_ano.errorTitle = 'Ano Escolar Inválido'
    dv_ano.prompt = 'Selecione 5 ou 9'
    dv_ano.promptTitle = 'Ano Escolar'
    ws.add_data_validation(dv_ano)
    dv_ano.add(f'B2:B1000')  # Aplicar validação para 1000 linhas

    # Adicionar exemplos
    exemplos = [
        ["PORTUGUES", "5", "D1", "Localizar informações explícitas em um texto"],
        ["PORTUGUES", "5", "D2", "Inferir o sentido de uma palavra ou expressão"],
        ["PORTUGUES", "5", "D3", "Inferir uma informação implícita em um texto"],
        ["MATEMATICA", "9", "D4", "Identificar o tema de um texto"],
        ["MATEMATICA", "9", "D5", "Distinguir um fato da opinião relativa a esse fato"],
    ]

    for row_idx, exemplo in enumerate(exemplos, start=2):
        for col_idx, valor in enumerate(exemplo, start=1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.value = valor
            cell.border = border
            cell.alignment = Alignment(horizontal="left" if col_idx == 4 else "center", vertical="center")
            if col_idx == 4:  # Descrição
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    # Adicionar instruções em uma nova aba
    ws_instrucoes = wb.create_sheet("Instruções")
    instrucoes = [
        ["TEMPLATE DE IMPORTAÇÃO DE DESCRITORES SAEB", ""],
        ["", ""],
        ["Como usar:", ""],
        ["1", "Preencha a aba 'Descritores SAEB' com os dados dos descritores"],
        ["2", "Coluna 'Disciplina': Selecione PORTUGUES ou MATEMATICA (dropdown disponível)"],
        ["3", "Coluna 'Ano Escolar': Selecione 5 ou 9 (dropdown disponível)"],
        ["4", "Coluna 'Código': Código único do descritor (ex: D1, D2, D3)"],
        ["5", "Coluna 'Descrição': Descrição completa do descritor"],
        ["6", "Remova as linhas de exemplo antes de importar"],
        ["7", "Salve o arquivo em formato Excel (.xlsx)"],
        ["8", "Importe o arquivo no sistema SAEB"],
        ["", ""],
        ["Observações:", ""],
        ["•", "Disciplina aceita apenas: PORTUGUES ou MATEMATICA"],
        ["•", "Ano escolar aceita apenas os valores 5 ou 9"],
        ["•", "O código do descritor deve ser único"],
        ["•", "A descrição pode ter múltiplas linhas"],
        ["•", "Descritores com códigos duplicados serão ignorados"],
        ["", ""],
        ["Exemplo de preenchimento:", ""],
        ["Disciplina", "Ano Escolar", "Código", "Descrição"],
        ["PORTUGUES", "5", "D1", "Localizar informações explícitas em um texto"],
        ["MATEMATICA", "9", "D15", "Estabelecer relações lógico-discursivas presentes no texto"],
    ]

    # Estilo para instruções
    title_font = Font(bold=True, size=14, color="4472C4")
    section_font = Font(bold=True, size=11)

    for row_idx, linha in enumerate(instrucoes, start=1):
        for col_idx, texto in enumerate(linha, start=1):
            cell = ws_instrucoes.cell(row=row_idx, column=col_idx)
            cell.value = texto

            if row_idx == 1:  # Título
                cell.font = title_font
            elif row_idx in [3, 13, 20]:  # Seções
                cell.font = section_font

            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

    # Ajustar larguras das colunas de instruções
    ws_instrucoes.column_dimensions['A'].width = 10
    ws_instrucoes.column_dimensions['B'].width = 80

    # Salvar arquivo
    import os
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"template_descritores_saeb_{timestamp}.xlsx"

    # Se o arquivo default não existir, tentar usar ele
    default_filename = "template_descritores_saeb.xlsx"
    try:
        if not os.path.exists(default_filename):
            filename = default_filename
    except:
        pass

    wb.save(filename)
    print(f"[OK] Template criado com sucesso: {filename}")
    print(f"Arquivo salvo em: {filename}")
    print(f"\nO template contem:")
    print(f"   - Aba 'Descritores SAEB' com campos: Disciplina, Ano Escolar, Codigo, Descricao")
    print(f"   - Aba 'Instrucoes' com orientacoes de uso")
    print(f"   - Validacao automatica para Disciplina (PORTUGUES ou MATEMATICA)")
    print(f"   - Validacao automatica para Ano Escolar (5 ou 9)")
    print(f"   - 5 exemplos de descritores preenchidos")

if __name__ == "__main__":
    try:
        criar_template_descritores()
    except ImportError:
        print("[ERRO] Biblioteca openpyxl nao encontrada")
        print("Instale com: pip install openpyxl")
    except Exception as e:
        print(f"[ERRO] Erro ao criar template: {e}")
