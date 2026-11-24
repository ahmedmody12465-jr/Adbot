from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "AdBot AI Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    PORT: int = 8000
    
    # Microsoft SQL Server Configuration
    MSSQL_SERVER: str = "localhost"
    MSSQL_DATABASE: str = "AdBotDB"
    MSSQL_USER: str = "sa"
    MSSQL_PASSWORD: str = ""
    MSSQL_PORT: int = 1433
    MSSQL_DRIVER: str = "ODBC Driver 18 for SQL Server"
    MSSQL_TRUST_CERT: str = "yes"
    
    # Google Gemini API
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
