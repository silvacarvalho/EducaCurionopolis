"""
Script de Teste para CRUD de Diretores
Execute este script com o servidor rodando para testar os endpoints de diretores
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Cores para output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'


def test_login():
    """Faz login e retorna o token"""
    print(f"\n{YELLOW}🔐 Testando Login...{RESET}")
    response = requests.post(
        f"{BASE_URL}/auth/login-json",
        json={
            "email": "admin@curionopolis.pa.gov.br",
            "senha": "Admin@2024"
        }
    )

    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"{GREEN}✅ Login bem-sucedido!{RESET}")
        return token
    else:
        print(f"{RED}❌ Falha no login: {response.status_code}{RESET}")
        print(response.json())
        return None


def test_create_diretor(token):
    """Testa criação de diretor"""
    print(f"\n{YELLOW}👤 Testando Criação de Diretor...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/diretores/",
        headers=headers,
        json={
            "cpf": "111.222.333-44",
            "nome_completo": "Diretor Teste Silva",
            "email": "diretor.teste@curionopolis.pa.gov.br",
            "telefone": "(94) 99999-8888",
            "perfil": "diretor_coordenador",
            "senha": "senha123"
        }
    )

    if response.status_code == 201:
        diretor = response.json()
        print(f"{GREEN}✅ Diretor criado com sucesso!{RESET}")
        print(f"   ID: {diretor['id']}")
        print(f"   Nome: {diretor['nome_completo']}")
        return diretor["id"]
    else:
        print(f"{RED}❌ Falha ao criar diretor: {response.status_code}{RESET}")
        print(response.json())
        return None


def test_list_diretores(token):
    """Testa listagem de diretores"""
    print(f"\n{YELLOW}📋 Testando Listagem de Diretores...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/diretores/", headers=headers)

    if response.status_code == 200:
        diretores = response.json()
        print(f"{GREEN}✅ Listagem bem-sucedida!{RESET}")
        print(f"   Total de diretores: {len(diretores)}")
        for d in diretores:
            print(f"   - {d['nome_completo']} ({d['email']})")
        return True
    else:
        print(f"{RED}❌ Falha ao listar diretores: {response.status_code}{RESET}")
        return False


def test_list_diretores_disponiveis(token):
    """Testa listagem de diretores disponíveis (sem escola)"""
    print(f"\n{YELLOW}📋 Testando Listagem de Diretores Disponíveis...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/diretores/?disponivel=true",
        headers=headers
    )

    if response.status_code == 200:
        diretores = response.json()
        print(f"{GREEN}✅ Listagem bem-sucedida!{RESET}")
        print(f"   Diretores disponíveis: {len(diretores)}")
        for d in diretores:
            print(f"   - {d['nome_completo']}")
        return True
    else:
        print(f"{RED}❌ Falha ao listar diretores disponíveis: {response.status_code}{RESET}")
        return False


def test_get_diretor(token, diretor_id):
    """Testa obtenção de diretor por ID"""
    print(f"\n{YELLOW}🔍 Testando Obtenção de Diretor por ID...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/diretores/{diretor_id}", headers=headers)

    if response.status_code == 200:
        diretor = response.json()
        print(f"{GREEN}✅ Diretor encontrado!{RESET}")
        print(f"   Nome: {diretor['nome_completo']}")
        print(f"   Email: {diretor['email']}")
        return True
    else:
        print(f"{RED}❌ Falha ao obter diretor: {response.status_code}{RESET}")
        return False


def test_update_diretor(token, diretor_id):
    """Testa atualização de diretor"""
    print(f"\n{YELLOW}✏️  Testando Atualização de Diretor...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.put(
        f"{BASE_URL}/diretores/{diretor_id}",
        headers=headers,
        json={
            "telefone": "(94) 99999-7777"
        }
    )

    if response.status_code == 200:
        diretor = response.json()
        print(f"{GREEN}✅ Diretor atualizado!{RESET}")
        print(f"   Novo telefone: {diretor['telefone']}")
        return True
    else:
        print(f"{RED}❌ Falha ao atualizar diretor: {response.status_code}{RESET}")
        return False


def test_create_escola(token, diretor_id):
    """Testa criação de escola"""
    print(f"\n{YELLOW}🏫 Testando Criação de Escola...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/escolas/",
        headers=headers,
        json={
            "nome": "Escola Teste CRUD",
            "endereco": "Rua Teste, 123",
            "telefone": "(94) 98888-7777",
            "email": "escola.teste@curionopolis.pa.gov.br",
            "codigo_inep": "15999999",
            "diretor_id": diretor_id
        }
    )

    if response.status_code == 201:
        escola = response.json()
        print(f"{GREEN}✅ Escola criada com sucesso!{RESET}")
        print(f"   ID: {escola['id']}")
        print(f"   Nome: {escola['nome']}")
        return escola["id"]
    else:
        print(f"{RED}❌ Falha ao criar escola: {response.status_code}{RESET}")
        print(response.json())
        return None


def test_get_diretor_escola(token, diretor_id):
    """Testa endpoint de obter escola do diretor"""
    print(f"\n{YELLOW}🔗 Testando Endpoint de Escola do Diretor...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/diretores/{diretor_id}/escola",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        print(f"{GREEN}✅ Endpoint funcionando!{RESET}")
        if data["escola"]:
            print(f"   Escola: {data['escola']['nome']}")
        else:
            print(f"   Diretor não tem escola atribuída")
        return True
    else:
        print(f"{RED}❌ Falha ao obter escola do diretor: {response.status_code}{RESET}")
        return False


def test_list_escolas(token):
    """Testa listagem de escolas"""
    print(f"\n{YELLOW}📋 Testando Listagem de Escolas...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/escolas/", headers=headers)

    if response.status_code == 200:
        escolas = response.json()
        print(f"{GREEN}✅ Listagem bem-sucedida!{RESET}")
        print(f"   Total de escolas: {len(escolas)}")
        for e in escolas:
            print(f"   - {e['nome']}")
        return True
    else:
        print(f"{RED}❌ Falha ao listar escolas: {response.status_code}{RESET}")
        return False


def test_delete_escola(token, escola_id):
    """Testa deleção de escola"""
    print(f"\n{YELLOW}🗑️  Testando Deleção de Escola...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(f"{BASE_URL}/escolas/{escola_id}", headers=headers)

    if response.status_code == 204:
        print(f"{GREEN}✅ Escola desativada com sucesso!{RESET}")
        return True
    else:
        print(f"{RED}❌ Falha ao deletar escola: {response.status_code}{RESET}")
        return False


def test_delete_diretor(token, diretor_id):
    """Testa deleção de diretor"""
    print(f"\n{YELLOW}🗑️  Testando Deleção de Diretor...{RESET}")

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(f"{BASE_URL}/diretores/{diretor_id}", headers=headers)

    if response.status_code == 204:
        print(f"{GREEN}✅ Diretor desativado com sucesso!{RESET}")
        return True
    else:
        print(f"{RED}❌ Falha ao deletar diretor: {response.status_code}{RESET}")
        print(response.json())
        return False


def main():
    """Executa todos os testes"""
    print(f"\n{'='*60}")
    print(f"{YELLOW}🧪 Iniciando Testes de CRUD de Diretores e Escolas{RESET}")
    print(f"{'='*60}")

    # 1. Login
    token = test_login()
    if not token:
        print(f"\n{RED}❌ Não foi possível continuar sem token de autenticação{RESET}")
        return

    # 2. Criar diretor
    diretor_id = test_create_diretor(token)
    if not diretor_id:
        print(f"\n{YELLOW}⚠️  Continuando com outros testes...{RESET}")

    # 3. Listar diretores
    test_list_diretores(token)

    # 4. Listar diretores disponíveis
    test_list_diretores_disponiveis(token)

    # 5. Obter diretor por ID (se foi criado)
    if diretor_id:
        test_get_diretor(token, diretor_id)

        # 6. Atualizar diretor
        test_update_diretor(token, diretor_id)

        # 7. Verificar escola do diretor (antes de criar)
        test_get_diretor_escola(token, diretor_id)

        # 8. Criar escola com diretor
        escola_id = test_create_escola(token, diretor_id)

        # 9. Verificar escola do diretor (depois de criar)
        if escola_id:
            test_get_diretor_escola(token, diretor_id)

    # 10. Listar escolas
    test_list_escolas(token)

    # 11. Limpar dados de teste (desativar escola e diretor)
    if diretor_id and escola_id:
        print(f"\n{YELLOW}🧹 Limpando dados de teste...{RESET}")
        test_delete_escola(token, escola_id)
        test_delete_diretor(token, diretor_id)

    print(f"\n{'='*60}")
    print(f"{GREEN}✅ Testes Concluídos!{RESET}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print(f"\n{RED}❌ Erro: Não foi possível conectar ao servidor.{RESET}")
        print(f"{YELLOW}Certifique-se de que o servidor está rodando em {BASE_URL}{RESET}\n")
    except Exception as e:
        print(f"\n{RED}❌ Erro inesperado: {str(e)}{RESET}\n")
