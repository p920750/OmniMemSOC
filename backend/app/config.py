import os
from typing import Any, Dict, List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    """Application and FalkorDB configuration loaded via Pydantic-Settings."""

    APP_NAME: str = "OmniMemSOC API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # FalkorDB Connection Settings
    FALKORDB_HOST: str = os.getenv("FALKORDB_HOST", "localhost")
    FALKORDB_PORT: int = int(os.getenv("FALKORDB_PORT", "6379"))
    FALKORDB_USERNAME: Optional[str] = os.getenv("FALKORDB_USERNAME") or None
    FALKORDB_PASSWORD: Optional[str] = os.getenv("FALKORDB_PASSWORD") or None
    FALKORDB_MAX_CONNECTIONS: int = int(os.getenv("FALKORDB_MAX_CONNECTIONS", "20"))
    FALKORDB_TIMEOUT: float = float(os.getenv("FALKORDB_TIMEOUT", "5.0"))
    FALKORDB_SSL: bool = os.getenv("FALKORDB_SSL", "false").lower() in ("true", "1", "yes")

    # CORS Origins
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS_ORIGINS into a clean list of origins."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def falkordb_connection_kwargs(self) -> Dict[str, Any]:
        """Return keyword arguments for FalkorDB / Redis connection pooling."""
        kwargs: Dict[str, Any] = {
            "host": self.FALKORDB_HOST,
            "port": self.FALKORDB_PORT,
            "socket_timeout": self.FALKORDB_TIMEOUT,
            "ssl": self.FALKORDB_SSL,
        }
        if self.FALKORDB_USERNAME:
            kwargs["username"] = self.FALKORDB_USERNAME
        if self.FALKORDB_PASSWORD:
            kwargs["password"] = self.FALKORDB_PASSWORD
        return kwargs

settings = Settings()
