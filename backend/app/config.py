from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    애플리케이션 설정 - 환경 변수에서 로드
    Application settings loaded from environment variables.
    """

    # Database connection (Supabase PostgreSQL)
    DATABASE_URL: str

    # Claude API key for AI tutoring
    ANTHROPIC_API_KEY: str

    # JWT signing key - 프로덕션에서 반드시 변경할 것
    SECRET_KEY: str = "thinkbridge-secret-key-change-in-production"

    # Allowed CORS origins (comma-separated for multiple)
    CORS_ORIGINS: str = "http://localhost:3000"

    # JWT algorithm
    ALGORITHM: str = "HS256"

    # 토큰 만료 시간: 24시간
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    class Config:
        env_file = ".env"


# Singleton settings instance
settings = Settings()
