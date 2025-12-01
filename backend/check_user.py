"""
Check user and password hash in database
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Usuario
from app.auth import verify_password

def check_users():
    """Check all users in database"""
    db = SessionLocal()

    try:
        usuarios = db.query(Usuario).all()

        if not usuarios:
            print("❌ Nenhum usuário encontrado no banco de dados!")
            return

        print(f"✅ Encontrados {len(usuarios)} usuário(s) no banco:\n")

        for i, usuario in enumerate(usuarios, 1):
            print(f"{i}. Email: {usuario.email}")
            print(f"   Nome: {usuario.nome_completo}")
            print(f"   CPF: {usuario.cpf}")
            print(f"   Perfil: {usuario.perfil.value}")
            print(f"   Ativo: {usuario.ativo}")
            print(f"   Hash: {usuario.senha_hash[:60]}...")

            # Check if hash starts with expected bcrypt prefix
            if usuario.senha_hash.startswith('$2b$') or usuario.senha_hash.startswith('$2a$') or usuario.senha_hash.startswith('$2y$'):
                print(f"   ✅ Hash do bcrypt detectado (versão: {usuario.senha_hash[:4]})")
            else:
                print(f"   ⚠️  Hash NÃO parece ser bcrypt!")

            print()

    except Exception as e:
        print(f"❌ Erro ao verificar usuários: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
