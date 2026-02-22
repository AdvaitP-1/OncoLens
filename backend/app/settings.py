import os
from pathlib import Path

from pydantic import BaseModel


def _load_dotenv_if_present() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"").strip("'")
        # Keep explicit shell-exported values as highest priority.
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv_if_present()


class Settings(BaseModel):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_storage_bucket: str = os.getenv("SUPABASE_STORAGE_BUCKET", "case-assets")
    supabase_jwt_secret: str = os.getenv("SUPABASE_JWT_SECRET", "")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    gemini_base_url: str = os.getenv(
        "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
    )
    gemini_timeout_seconds: float = float(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))
    gemini_prompt_version: str = os.getenv("GEMINI_PROMPT_VERSION", "oncolens-v1")

    @property
    def postgrest_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/rest/v1"

    @property
    def storage_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/storage/v1/object"

    def validate_runtime_config(self) -> None:
        missing = []
        if not self.supabase_url:
            missing.append("SUPABASE_URL")
        if not self.supabase_service_role_key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        # SUPABASE_JWT_SECRET optional for hackathon (auth disabled)
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")


settings = Settings()
