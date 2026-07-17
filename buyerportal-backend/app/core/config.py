from pydantic_settings import BaseSettings
import secrets

class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    JWT_SECRET: str
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_VERIFY_SERVICE_SID: str = ""
    OTP_DEV_MODE: bool = False
    APP_ENV: str = "development"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ESCROW_IMMEDIATE_PERCENT: int = 70
    ESCROW_FINAL_PERCENT: int = 30
    ESCROW_HOLD_DAYS: int = 5
    ESCROW_DEPOSIT_DEADLINE_HRS: int = 48
    QUOTE_WINDOW_HRS: int = 48
    MAX_COUNTER_ROUNDS: int = 3
    GRN_WINDOW_HRS: int = 48
    TOP_MATCHES: int = 10

    @property
    def origins_list(self):
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"

settings = Settings()
DEV_SEED = secrets.token_hex(16)
