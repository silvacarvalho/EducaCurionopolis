"""
EDUCA+ Curionópolis - Main FastAPI Application
Sistema Modular para Gestão e Demonstração de Métricas Educacionais
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv

from .database import init_db, engine, Base

# Import routers
from .routers import (
    setup,
    auth,
    usuarios,
    escolas,
    diretores,
    professores,
    turmas,
    disciplinas,
    alunos,
    avaliacoes,
    avaliacoes_agregadas,
    diagnosticos,
    saeb,
    mensagens,
    relatorios,
    importacao,
    configuracoes_grafico
)

load_dotenv()

# ============================================
# APPLICATION CONFIGURATION
# ============================================

app = FastAPI(
    title="EDUCA+ Curionópolis",
    description="""
    Sistema Modular para Acompanhar, Gerenciar e Demonstrar Métricas
    do Desenvolvimento da Educação no Município de Curionópolis/PA.

    ## Módulos

    * **Avaliação** - Gestão de avaliações bimestrais
    * **Diagnóstico** - Acompanhamento de diagnósticos (1º ao 5º ano)
    * **SAEB** - Simulados e resultados SAEB
    * **Relatórios** - Visualização e análise de dados

    ## Perfis de Acesso

    * Gestão Municipal
    * Diretor/Coordenador de Escola
    * Professor
    * Comunidade
    """,
    version="1.0.0",
    contact={
        "name": "Prefeitura de Curionópolis",
        "email": "educacao@curionopolis.pa.gov.br"
    }
)

# ============================================
# CORS CONFIGURATION
# ============================================

# Configure CORS for frontend access
origins = [
    "http://localhost:3000",  # Vite development server (current)
    "http://localhost:3002",  # React development server
    "http://localhost:5173",  # Vite development server (alternative)
    os.getenv("FRONTEND_URL", "http://localhost:3000")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# DATABASE INITIALIZATION
# ============================================

@app.on_event("startup")
async def startup_event():
    """
    Initialize database on application startup
    Creates all tables if they don't exist
    """
    print(">> Iniciando EDUCA+ Curionopolis...")
    print(">> Criando tabelas no banco de dados...")
    init_db()
    print(">> Banco de dados inicializado com sucesso!")


# ============================================
# ROUTERS REGISTRATION
# ============================================

# Setup - First-time configuration (no authentication required)
app.include_router(
    setup.router,
    prefix="/api/v1/setup",
    tags=["⚙️ Setup - Configuração Inicial"]
)

# Authentication
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Autenticação"]
)

# User management
app.include_router(
    usuarios.router,
    prefix="/api/v1/usuarios",
    tags=["Usuários"]
)

# Schools
app.include_router(
    escolas.router,
    prefix="/api/v1/escolas",
    tags=["Escolas"]
)

# Directors
app.include_router(
    diretores.router,
    prefix="/api/v1/diretores",
    tags=["Diretores"]
)

# Teachers
app.include_router(
    professores.router,
    prefix="/api/v1/professores",
    tags=["Professores"]
)

# Classes
app.include_router(
    turmas.router,
    prefix="/api/v1/turmas",
    tags=["Turmas"]
)

# Subjects
app.include_router(
    disciplinas.router,
    prefix="/api/v1/disciplinas",
    tags=["Disciplinas"]
)

# Students
app.include_router(
    alunos.router,
    prefix="/api/v1/alunos",
    tags=["Alunos"]
)

# Evaluations Module
app.include_router(
    avaliacoes.router,
    prefix="/api/v1/avaliacoes",
    tags=["Módulo: Avaliação"]
)

# Aggregated Evaluations Module  
app.include_router(
    avaliacoes_agregadas.router,
    prefix="/api/v1/avaliacoes-agregadas",
    tags=["Módulo: Avaliação Agregada"]
)

# Diagnostics Module
app.include_router(
    diagnosticos.router,
    prefix="/api/v1/diagnosticos",
    tags=["Módulo: Diagnóstico"]
)

# SAEB Module
app.include_router(
    saeb.router,
    prefix="/api/v1/saeb",
    tags=["Módulo: SAEB"]
)

# Messages
app.include_router(
    mensagens.router,
    prefix="/api/v1/mensagens",
    tags=["Mensagens"]
)

# Reports
app.include_router(
    relatorios.router,
    prefix="/api/v1/relatorios",
    tags=["Relatórios"]
)

# Importação
app.include_router(
    importacao.router,
    prefix="/api/v1/importacao",
    tags=["Importação"]
)

# Chart Configuration
app.include_router(
    configuracoes_grafico.router,
    prefix="/api/v1/configuracoes-grafico",
    tags=["Configurações de Gráficos"]
)

# ============================================
# ROOT ENDPOINTS
# ============================================

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "message": "EDUCA+ Curionópolis API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "online"
    }


@app.get("/health", tags=["Root"])
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        Base.metadata.bind = engine
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


# ============================================
# ERROR HANDLERS
# ============================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Recurso não encontrado",
            "path": str(request.url)
        }
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Erro interno do servidor",
            "message": "Entre em contato com o administrador do sistema"
        }
    )
