"""
Inicializar controle de versão Alembic no banco existente
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.config import settings

def init_alembic_version():
    """Inicializa tabela alembic_version e marca estado atual"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("=" * 70)
    print("INICIALIZANDO CONTROLE DE VERSÃO ALEMBIC")
    print("=" * 70)
    
    with engine.begin() as conn:
        try:
            # 1. Criar tabela alembic_version se não existir
            print("\n[1/3] Criando tabela alembic_version...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                )
            """))
            print("   ✓ Tabela criada")
            
            # 2. Verificar se já tem versão
            result = conn.execute(text("SELECT COUNT(*) FROM alembic_version"))
            count = result.scalar()
            
            if count > 0:
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                current_version = result.scalar()
                print(f"\n   ⚠️  Versão já existe: {current_version}")
                print("   Nenhuma ação necessária")
                return current_version
            
            # 3. Marcar versão inicial como fix_descritor_unique (última migration antes da refatoração)
            print("\n[2/3] Definindo versão inicial...")
            initial_version = "fix_descritor_unique"
            conn.execute(text("""
                INSERT INTO alembic_version (version_num) 
                VALUES (:version)
            """), {"version": initial_version})
            print(f"   ✓ Versão definida como: {initial_version}")
            
            print("\n[3/3] Validando...")
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.scalar()
            print(f"   ✓ Versão atual: {version}")
            
            print("\n" + "=" * 70)
            print("✅ ALEMBIC INICIALIZADO COM SUCESSO!")
            print("=" * 70)
            print(f"\nEstado atual:")
            print(f"  - Banco de dados possui todas as tabelas criadas")
            print(f"  - Versão Alembic: {version}")
            print(f"  - Pronto para aplicar migration a86f35bb4909")
            print(f"\nPróximos passos:")
            print(f"  1. Execute: alembic upgrade head")
            print(f"  2. Isso aplicará a refatoração de disciplinas")
            
            return version
            
        except Exception as e:
            print(f"\n❌ ERRO: {e}")
            raise

if __name__ == "__main__":
    try:
        init_alembic_version()
        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)
