"""
Verificar estado do banco de dados
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.config import settings

engine = create_engine(settings.DATABASE_URL)

print("Verificando estrutura do banco...\n")

with engine.connect() as conn:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"Total de tabelas: {len(tables)}\n")
    print("Tabelas encontradas:")
    for table in sorted(tables):
        print(f"  - {table}")
    
    # Verificar se disciplinas tem turma_id
    if 'disciplinas' in tables:
        columns = inspector.get_columns('disciplinas')
        print(f"\n\nColunas da tabela 'disciplinas':")
        for col in columns:
            print(f"  - {col['name']}: {col['type']}")
        
        has_turma_id = any(col['name'] == 'turma_id' for col in columns)
        print(f"\n✓ Disciplinas TEM turma_id: {has_turma_id}")
    
    # Verificar se turma_disciplina existe
    has_turma_disciplina = 'turma_disciplina' in tables
    print(f"✓ Tabela turma_disciplina existe: {has_turma_disciplina}")
    
    # Verificar versão alembic
    if 'alembic_version' in tables:
        result = conn.execute(text("SELECT version_num FROM alembic_version"))
        version = result.scalar()
        print(f"\n✓ Versão Alembic: {version if version else 'Nenhuma'}")
    else:
        print(f"\n⚠️  Tabela alembic_version não existe")
