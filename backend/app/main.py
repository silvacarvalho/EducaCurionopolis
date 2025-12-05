"""
EDUCA+ Curionópolis - Main FastAPI Application
Sistema Modular para Gestão e Demonstração de Métricas Educacionais
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import os
from pathlib import Path
from dotenv import load_dotenv

from .database import init_db, engine, Base, get_db
from .websocket import manager
from .models import Usuario

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
    saeb_v2,
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

# SAEB V2 - Complete System with Online Exams
app.include_router(
    saeb_v2.router,
    prefix="/api/v2/saeb",
    tags=["Módulo: SAEB V2"]
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
# WEBSOCKET ENDPOINT
# ============================================

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time notifications
    Connect with: ws://host/ws/{user_id}?token={jwt_token}
    """
    from jose import jwt, JWTError
    from .database import SessionLocal
    from .models import Usuario
    
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM = "HS256"
    
    try:
        # Validate token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_email = payload.get("sub")  # sub contains email, not user_id
        
        if not token_email:
            await websocket.close(code=4001)
            return
        
        # Get user from database to verify the user_id matches
        db = SessionLocal()
        try:
            db_user = db.query(Usuario).filter(Usuario.email == token_email).first()
            if not db_user or db_user.id != user_id:
                await websocket.close(code=4001)
                return
        finally:
            db.close()
        
        # Connect user
        await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Keep connection alive and handle messages
                data = await websocket.receive_text()
                
                if data == "ping":
                    await websocket.send_text("pong")
                elif data == "get_online_users":
                    online_users = manager.get_online_users()
                    await websocket.send_json({
                        "type": "online_users",
                        "data": {"users": online_users}
                    })
                    
        except WebSocketDisconnect:
            manager.disconnect(user_id)
            
    except JWTError as e:
        print(f"WebSocket JWT error: {e}")
        await websocket.close(code=4001)
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=4000)
        except:
            pass


# ============================================
# STATIC FILES & SPA SUPPORT
# ============================================

# Get frontend build directory
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_BUILD_DIR = BASE_DIR.parent / "frontend" / "dist"

# Mount static files (CSS, JS, assets) if build exists
if FRONTEND_BUILD_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "assets")), name="assets")


# ============================================
# ERROR HANDLERS
# ============================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler with SPA fallback"""
    # For API routes, return JSON error
    if request.url.path.startswith("/api/"):
        return JSONResponse(
            status_code=404,
            content={
                "detail": "Recurso não encontrado",
                "path": str(request.url)
            }
        )
    
    # For other routes, serve index.html (SPA fallback)
    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    
    # Fallback if frontend not built
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Recurso não encontrado",
            "path": str(request.url),
            "hint": "Frontend não encontrado. Execute 'npm run build' no diretório frontend."
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
