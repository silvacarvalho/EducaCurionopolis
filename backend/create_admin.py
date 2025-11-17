#!/usr/bin/env python3
"""
Script para criar usuário administrador inicial
Execute: python create_admin.py
"""
import sys
from app.database import SessionLocal, init_db
from app.models import Usuario, PerfilUsuario
from app.auth import get_password_hash


def create_admin():
    """Create initial admin user"""
    print("\n" + "="*50)
    print("   EDUCA+ Curionópolis")
    print("   Criar Usuário Administrador")
    print("="*50 + "\n")

    # Initialize database
    print("📊 Inicializando banco de dados...")
    init_db()
    print("✅ Banco de dados inicializado!\n")

    db = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(Usuario).filter(
            Usuario.perfil == PerfilUsuario.GESTAO_MUNICIPAL
        ).first()

        if existing_admin:
            print("⚠️  Já existe um usuário de Gestão Municipal no sistema!")
            print(f"   📧 Email: {existing_admin.email}")
            print(f"   👤 Nome: {existing_admin.nome_completo}")

            resposta = input("\n❓ Deseja criar outro usuário admin? (s/n): ")
            if resposta.lower() != 's':
                print("\n❌ Operação cancelada.")
                return
            print()

        # Collect user data
        cpf = input("📋 CPF (formato: 000.000.000-00): ").strip()
        nome_completo = input("👤 Nome completo: ").strip()
        email = input("📧 Email: ").strip()
        telefone = input("📱 Telefone (opcional, Enter para pular): ").strip() or None

        # Password with confirmation
        while True:
            senha = input("🔐 Senha (mínimo 6 caracteres): ").strip()
            if len(senha) < 6:
                print("❌ Senha muito curta! Mínimo 6 caracteres.\n")
                continue

            senha_confirm = input("🔐 Confirme a senha: ").strip()
            if senha != senha_confirm:
                print("❌ As senhas não coincidem! Tente novamente.\n")
                continue
            break

        # Validations
        if not cpf or not nome_completo or not email or not senha:
            print("\n❌ Todos os campos obrigatórios devem ser preenchidos!")
            return

        # Check if CPF exists
        if db.query(Usuario).filter(Usuario.cpf == cpf).first():
            print(f"\n❌ Já existe um usuário com o CPF {cpf}")
            return

        # Check if email exists
        if db.query(Usuario).filter(Usuario.email == email).first():
            print(f"\n❌ Já existe um usuário com o email {email}")
            return

        # Create user
        print("\n⏳ Criando usuário...")
        admin = Usuario(
            cpf=cpf,
            nome_completo=nome_completo,
            email=email,
            telefone=telefone,
            perfil=PerfilUsuario.GESTAO_MUNICIPAL,
            senha_hash=get_password_hash(senha),
            ativo=True
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        # Success message
        print("\n" + "="*50)
        print("✅ USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!")
        print("="*50)
        print(f"\n📋 Dados de acesso:")
        print(f"   ID: {admin.id}")
        print(f"   👤 Nome: {admin.nome_completo}")
        print(f"   📧 Email: {admin.email}")
        print(f"   🎭 Perfil: Gestão Municipal")
        print(f"\n🔐 Faça login em: http://localhost:3000/login")
        print(f"   Email: {admin.email}")
        print(f"   Senha: (a que você digitou)")
        print("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
        print("\n" + "="*50 + "\n")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Erro ao criar usuário: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    try:
        create_admin()
    except KeyboardInterrupt:
        print("\n\n❌ Operação cancelada pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {str(e)}")
        sys.exit(1)
