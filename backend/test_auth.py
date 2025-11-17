"""
Test script to verify bcrypt authentication
"""
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Usuario
from app.auth import verify_password, get_password_hash

def test_authentication():
    """Test authentication with the created user"""
    db = SessionLocal()

    try:
        # Get the first user
        usuario = db.query(Usuario).first()

        if not usuario:
            print("❌ Nenhum usuário encontrado no banco de dados!")
            return

        print(f"✅ Usuário encontrado: {usuario.email}")
        print(f"   Nome: {usuario.nome_completo}")
        print(f"   Perfil: {usuario.perfil.value}")
        print(f"   Ativo: {usuario.ativo}")
        print(f"   Hash armazenado: {usuario.senha_hash[:50]}...")

        # Ask for password to test
        print("\n" + "="*60)
        senha_teste = input("Digite a senha para testar: ")

        # Test password verification
        print("\n" + "="*60)
        print("Testando verificação de senha...")

        resultado = verify_password(senha_teste, usuario.senha_hash)

        if resultado:
            print("✅ SENHA CORRETA! Autenticação funcionando.")
        else:
            print("❌ SENHA INCORRETA! Problema na autenticação.")

            # Try to create a new hash for comparison
            print("\n" + "="*60)
            print("Gerando novo hash com a senha fornecida...")
            novo_hash = get_password_hash(senha_teste)
            print(f"Novo hash: {novo_hash[:50]}...")

            # Verify with new hash
            print("\nTestando com novo hash...")
            if verify_password(senha_teste, novo_hash):
                print("✅ Novo hash funcionou! O problema é o hash armazenado.")
                print("\n⚠️  DIAGNÓSTICO: O hash no banco de dados está incorreto.")
                print("   Possíveis causas:")
                print("   1. Usuário foi criado com versão incompatível do bcrypt")
                print("   2. Senha foi modificada após criação")
                print("   3. Problema na codificação de caracteres")
            else:
                print("❌ Problema com a função de hash!")

    except Exception as e:
        print(f"❌ Erro ao testar autenticação: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_authentication()
