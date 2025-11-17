#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para criar usuário administrador de teste
"""
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from app.database import SessionLocal, init_db
from app.models import Usuario, PerfilUsuario
from app.auth import get_password_hash


def create_test_admin():
    """Create a test admin user"""
    print("\n" + "="*60)
    print("   Criando Usuário Administrador de Teste")
    print("="*60 + "\n")

    # Initialize database
    print("Inicializando banco de dados...")
    init_db()
    print("✅ Banco de dados inicializado!\n")

    db = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(Usuario).filter(
            Usuario.perfil == PerfilUsuario.GESTAO_MUNICIPAL
        ).first()

        if existing_admin:
            print(f"⚠️  Administrador já existe: {existing_admin.email}")
            print("   Deletando usuário existente para recriar...\n")
            db.delete(existing_admin)
            db.commit()

        # Create new admin
        print("Criando novo administrador...")
        print("  CPF: 12345678901")
        print("  Email: admin@curionopolis.pa.gov.br")
        print("  Nome: Administrador do Sistema")
        print("  Senha: admin123")
        print()

        senha_hash = get_password_hash("admin123")

        novo_admin = Usuario(
            cpf="12345678901",
            nome_completo="Administrador do Sistema",
            email="admin@curionopolis.pa.gov.br",
            telefone="(94) 99999-9999",
            perfil=PerfilUsuario.GESTAO_MUNICIPAL,
            senha_hash=senha_hash,
            ativo=True
        )

        db.add(novo_admin)
        db.commit()
        db.refresh(novo_admin)

        print("="*60)
        print("✅ ADMINISTRADOR CRIADO COM SUCESSO!")
        print("="*60)
        print()
        print("Credenciais de acesso:")
        print("  📧 Email: admin@curionopolis.pa.gov.br")
        print("  🔐 Senha: admin123")
        print()
        print("⚠️  IMPORTANTE: Altere a senha após o primeiro login!")
        print()

        # Verify authentication
        print("Verificando autenticação...")
        from app.auth import verify_password
        if verify_password("admin123", novo_admin.senha_hash):
            print("✅ Autenticação verificada com sucesso!")
        else:
            print("❌ ERRO: Autenticação falhou!")

    except Exception as e:
        print(f"❌ Erro ao criar administrador: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_test_admin()
