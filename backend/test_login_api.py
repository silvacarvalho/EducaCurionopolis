#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test login via API endpoint
"""
import sys
import io
import requests
import json

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def test_login():
    """Test login endpoint"""
    print("\n" + "="*60)
    print("   Testando Login via API")
    print("="*60 + "\n")

    base_url = "http://localhost:8000"
    login_url = f"{base_url}/api/v1/auth/login-json"

    credentials = {
        "email": "admin@curionopolis.pa.gov.br",
        "senha": "admin123"
    }

    print(f"URL: {login_url}")
    print(f"Credenciais: {json.dumps(credentials, indent=2)}")
    print()

    try:
        print("Enviando requisição de login...")
        response = requests.post(
            login_url,
            json=credentials,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        print(f"Status Code: {response.status_code}")
        print()

        if response.status_code == 200:
            data = response.json()
            print("="*60)
            print("✅ LOGIN BEM-SUCEDIDO!")
            print("="*60)
            print()
            print(f"Access Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"Token Type: {data.get('token_type', 'N/A')}")
            print()

            # Test /me endpoint
            token = data.get('access_token')
            if token:
                print("Testando endpoint /me...")
                me_response = requests.get(
                    f"{base_url}/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )

                if me_response.status_code == 200:
                    user_data = me_response.json()
                    print("✅ Dados do usuário obtidos com sucesso!")
                    print(f"   Nome: {user_data.get('nome_completo')}")
                    print(f"   Email: {user_data.get('email')}")
                    print(f"   Perfil: {user_data.get('perfil')}")
                else:
                    print(f"❌ Erro ao obter dados do usuário: {me_response.status_code}")
        else:
            print("="*60)
            print("❌ LOGIN FALHOU!")
            print("="*60)
            print()
            try:
                error_data = response.json()
                print(f"Erro: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Resposta: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ ERRO: Não foi possível conectar ao servidor!")
        print("   Certifique-se de que o servidor está rodando em http://localhost:8000")
        print()
        print("   Para iniciar o servidor, execute:")
        print("   cd backend")
        print("   venv\\Scripts\\activate")
        print("   uvicorn app.main:app --reload")

    except Exception as e:
        print(f"❌ Erro ao testar login: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_login()
