from __future__ import annotations

from urllib.parse import quote
import httpx

from app.settings import settings


class SupabaseClient:
    def __init__(self) -> None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    async def fetch_case(self, case_id: str) -> dict | None:
        url = f"{settings.postgrest_url}/cases?id=eq.{case_id}&select=*"
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(url, headers=self.headers)
            res.raise_for_status()
            rows = res.json()
            return rows[0] if rows else None

    async def fetch_case_assets(self, case_id: str) -> list[dict]:
        url = f"{settings.postgrest_url}/case_assets?case_id=eq.{case_id}&select=*"
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(url, headers=self.headers)
            res.raise_for_status()
            return res.json()

    async def update_case(self, case_id: str, payload: dict) -> dict | None:
        url = f"{settings.postgrest_url}/cases?id=eq.{case_id}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.patch(url, headers=self.headers, json=payload)
            res.raise_for_status()
            rows = res.json()
            return rows[0] if rows else None

    async def download_storage_object(self, storage_path: str) -> bytes:
        encoded = quote(storage_path, safe="/")
        url = f"{settings.storage_url}/{settings.supabase_storage_bucket}/{encoded}"
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.get(url, headers=headers)
            res.raise_for_status()
            return res.content
