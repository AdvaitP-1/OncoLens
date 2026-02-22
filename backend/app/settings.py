from pydantic import BaseModel
import os


class Settings(BaseModel):
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_storage_bucket: str = os.getenv("SUPABASE_STORAGE_BUCKET", "case-assets")
    app_version: str = os.getenv("APP_VERSION", "0.1.0")

    @property
    def postgrest_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/rest/v1"

    @property
    def storage_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/storage/v1/object"


settings = Settings()
