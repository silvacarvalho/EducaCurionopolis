"""
Application Configuration
Centralized configuration management with environment variable validation
Uses pydantic-settings for secure environment variable handling
"""
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import List, Optional
from functools import lru_cache
import secrets


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    All sensitive data should be in .env file (not committed to git).
    """
    
    # ============================================
    # DATABASE CONFIGURATION
    # ============================================
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/educacurionopolis",
        description="Database connection URL"
    )
    
    # ============================================
    # JWT/AUTHENTICATION CONFIGURATION
    # ============================================
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_hex(32),
        description="Secret key for JWT token signing. MUST be changed in production!"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="Algorithm for JWT token encoding"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=480,
        description="JWT token expiration time in minutes (default: 8 hours)"
    )
    
    # ============================================
    # CORS CONFIGURATION
    # ============================================
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="Frontend application URL"
    )
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://localhost:3002",
        description="Comma-separated list of allowed CORS origins"
    )
    CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )
    
    # ============================================
    # APPLICATION SETTINGS
    # ============================================
    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode (disable in production)"
    )
    ENVIRONMENT: str = Field(
        default="development",
        description="Application environment: development, staging, production"
    )
    APP_NAME: str = Field(
        default="EDUCA+ Curionópolis",
        description="Application name"
    )
    APP_VERSION: str = Field(
        default="1.0.0",
        description="Application version"
    )
    
    # ============================================
    # SECURITY SETTINGS
    # ============================================
    ALLOWED_HOSTS: str = Field(
        default="localhost,127.0.0.1",
        description="Comma-separated list of allowed hosts"
    )
    
    # ============================================
    # VALIDATION
    # ============================================
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate that SECRET_KEY is secure in production"""
        insecure_keys = [
            'your-secret-key-change-this-in-production',
            'your-secret-key-change-this-in-production-use-openssl-rand-hex-32',
            'changeme',
            'secret',
            'password'
        ]
        if v.lower() in [k.lower() for k in insecure_keys]:
            import warnings
            warnings.warn(
                "⚠️  WARNING: Using insecure SECRET_KEY! "
                "Generate a secure key with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v
    
    @field_validator('ENVIRONMENT')
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value"""
        allowed = ['development', 'staging', 'production']
        if v.lower() not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of: {', '.join(allowed)}")
        return v.lower()
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as a list"""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]
        # Always include FRONTEND_URL
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins
    
    def get_allowed_hosts(self) -> List[str]:
        """Get allowed hosts as a list"""
        return [host.strip() for host in self.ALLOWED_HOSTS.split(',') if host.strip()]
    
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.ENVIRONMENT == 'production'
    
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return self.ENVIRONMENT == 'development'
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Create a settings instance for easy import
settings = get_settings()
