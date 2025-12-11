"""
Aplicar migration manualmente: Refatorar disciplinas para N:M
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def apply_migration():
    """Aplica a refatoração de disciplinas manualmente"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("=" * 70)
    print("APLICANDO MIGRATION: Refatoração Disciplinas (1:N → N:M)")
    print("=" * 70)
    
    with engine.begin() as conn:  # Transação automática
        try:
            # 1. Criar tabela associativa turma_disciplina
            print("\n[1/6] Criando tabela turma_disciplina...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS turma_disciplina (
                    turma_id INTEGER NOT NULL,
                    disciplina_id INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    PRIMARY KEY (turma_id, disciplina_id),
                    FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE CASCADE,
                    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
                )
            """))
            print("   ✓ Tabela criada com sucesso")
            
            # 2. Criar índices para performance
            print("\n[2/6] Criando índices...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_turma_disciplina_turma_id 
                ON turma_disciplina(turma_id)
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_turma_disciplina_disciplina_id 
                ON turma_disciplina(disciplina_id)
            """))
            print("   ✓ Índices criados")
            
            # 3. Migrar dados existentes
            print("\n[3/6] Migrando relacionamentos existentes...")
            result = conn.execute(text("""
                INSERT INTO turma_disciplina (turma_id, disciplina_id, created_at)
                SELECT turma_id, id, created_at 
                FROM disciplinas 
                WHERE turma_id IS NOT NULL
                ON CONFLICT (turma_id, disciplina_id) DO NOTHING
            """))
            rows_migrated = result.rowcount
            print(f"   ✓ {rows_migrated} relacionamentos migrados")
            
            # 4. Verificar migração
            print("\n[4/6] Verificando integridade...")
            result = conn.execute(text("""
                SELECT COUNT(*) FROM turma_disciplina
            """))
            total_relacoes = result.scalar()
            
            result = conn.execute(text("""
                SELECT COUNT(*) FROM disciplinas WHERE turma_id IS NOT NULL
            """))
            total_esperado = result.scalar()
            
            if total_relacoes == total_esperado:
                print(f"   ✓ Verificação OK: {total_relacoes} relacionamentos")
            else:
                raise Exception(f"Erro na migração: esperado {total_esperado}, encontrado {total_relacoes}")
            
            # 5. Remover constraint foreign key
            print("\n[5/6] Removendo constraint disciplinas_turma_id_fkey...")
            conn.execute(text("""
                ALTER TABLE disciplinas 
                DROP CONSTRAINT IF EXISTS disciplinas_turma_id_fkey
            """))
            print("   ✓ Constraint removida")
            
            # 6. Remover coluna turma_id
            print("\n[6/6] Removendo coluna turma_id de disciplinas...")
            conn.execute(text("""
                ALTER TABLE disciplinas 
                DROP COLUMN IF EXISTS turma_id
            """))
            print("   ✓ Coluna removida")
            
            print("\n" + "=" * 70)
            print("✅ MIGRATION CONCLUÍDA COM SUCESSO!")
            print("=" * 70)
            print(f"\nResumo:")
            print(f"  - Tabela turma_disciplina criada")
            print(f"  - {rows_migrated} relacionamentos migrados")
            print(f"  - Coluna turma_id removida de disciplinas")
            print(f"\n✓ Sistema agora suporta N:M entre turmas e disciplinas")
            
            return True
            
        except Exception as e:
            print(f"\n❌ ERRO durante migration: {e}")
            print("   Transação será revertida automaticamente")
            raise

if __name__ == "__main__":
    try:
        apply_migration()
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
